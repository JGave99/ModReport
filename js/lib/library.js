// Libreria personale (metodiche, esami, indicazioni, frasi): caricamento, migrazione e salvataggio sicuro.
// La logica di aggiornamento (ID stabili, base versionata, modifiche dell'utente) è in library-merge.js.
import { DEFAULT_LIBRARY, DEFAULTS_VERSION } from './default-library.js';
import { V1_TEXTS, V2_TEXTS, DEPRECATED_TEXTS, V2_METODICHE } from './library-base/legacy.js';
import { baseForUser, mergeBase, migrateFromV2, normalize } from './library-merge.js';
import { DEFAULT_ABBREVIATIONS } from './voice-text.js';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function cloneDefaults() {
  const data = baseForUser(DEFAULT_LIBRARY);
  data.abbreviazioni = { ...DEFAULT_ABBREVIATIONS };
  return data;
}

// Porta una libreria salvata alla versione corrente dei predefiniti senza perdere le personalizzazioni.
// Idempotente. report: { esamiAggiunti, frasiAggiunte, esamiAggiornati } quando cambia qualcosa.
export function migrateLibrary(raw) {
  if (!isObj(raw)) return { data: cloneDefaults(), changed: false, report: null };
  const version = Number(raw.defaultsVersion) || 1;
  let data;
  let report = null;
  let changed = false;
  if (version < DEFAULTS_VERSION) {
    ({ data, report } = version < 3
      ? migrateFromV2(raw, DEFAULT_LIBRARY, { V1_TEXTS, V2_TEXTS, DEPRECATED_TEXTS, V2_METODICHE })
      : mergeBase(raw, DEFAULT_LIBRARY));
    changed = true;
  } else {
    data = normalize(raw);
  }
  if (data.abbreviazioni === undefined) { data.abbreviazioni = { ...DEFAULT_ABBREVIATIONS }; changed = true; }
  return { data, changed, report, fromVersion: version };
}

// Gestisce lettura e scrittura della riga della libreria (user_data, o team_libraries per la libreria
// condivisa del team) con controllo dei conflitti:
// - un errore di lettura NON viene confuso con "libreria vuota";
// - ogni errore di salvataggio viene segnalato;
// - se un'altra scheda o postazione ha salvato nel frattempo, non sovrascrive in silenzio.
export class LibraryStore {
  constructor({ supabase, userId, onStatus, table = 'user_data', keyColumn = 'user_id', keyValue = userId }) {
    this.sb = supabase;
    this.userId = userId;
    this.table = table;
    this.keyColumn = keyColumn;
    this.keyValue = keyValue;
    this.onStatus = onStatus || (() => {});
    this.updatedAt = null; // valore letto dal database (null = riga non ancora creata)
    this.loaded = false;
    this.dirty = false;
    this.saving = null;
    this.timer = null;
    this.getData = null;
  }

  async load() {
    const { data, error } = await this.sb
      .from(this.table)
      .select('data, updated_at')
      .eq(this.keyColumn, this.keyValue)
      .maybeSingle();
    if (error) return { status: 'error', error };
    this.loaded = true;
    if (!data || !data.data) {
      this.updatedAt = null;
      return { status: 'empty', data: cloneDefaults() };
    }
    this.updatedAt = data.updated_at;
    const migrated = migrateLibrary(data.data);
    return { status: 'ok', ...migrated, raw: migrated.changed ? data.data : null };
  }

  // Programma un salvataggio (debounce). getData restituisce lo stato corrente della libreria.
  schedule(getData) {
    if (!this.loaded) return;
    this.getData = getData;
    this.dirty = true;
    this.onStatus('pending');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), 400);
  }

  hasUnsavedChanges() {
    return this.dirty || !!this.saving;
  }

  async flush() {
    clearTimeout(this.timer);
    if (this.dirty) await this.save();
    else if (this.saving) await this.saving;
  }

  async save({ force = false } = {}) {
    if (!this.loaded || !this.getData) return;
    if (this.saving) {
      await this.saving;
      if (!this.dirty) return;
    }
    clearTimeout(this.timer);
    this.dirty = false;
    this.saving = this._write(force).finally(() => { this.saving = null; });
    return this.saving;
  }

  async _write(force) {
    this.onStatus('saving');
    const payload = { data: this.getData(), updated_at: new Date().toISOString() };
    let result;
    if (this.updatedAt === null) {
      result = await this.sb.from(this.table)
        .insert({ [this.keyColumn]: this.keyValue, ...payload })
        .select('updated_at').maybeSingle();
      if (result.error && result.error.code === '23505') {
        this.dirty = true;
        this.onStatus('conflict');
        return;
      }
    } else {
      let q = this.sb.from(this.table).update(payload).eq(this.keyColumn, this.keyValue);
      if (!force) q = q.eq('updated_at', this.updatedAt);
      result = await q.select('updated_at').maybeSingle();
      if (!result.error && !result.data) {
        // Nessuna riga aggiornata: qualcun altro ha salvato dopo la nostra lettura.
        this.dirty = true;
        this.onStatus('conflict');
        return;
      }
    }
    if (result.error) {
      this.dirty = true;
      this.onStatus('error', result.error);
      return;
    }
    this.updatedAt = result.data ? result.data.updated_at : payload.updated_at;
    this.onStatus(this.dirty ? 'pending' : 'saved');
  }
}
