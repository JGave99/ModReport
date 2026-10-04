// Libreria personale (metodiche, esami, indicazioni, frasi): caricamento, migrazione e salvataggio sicuro.
import { DEFAULT_LIBRARY, DEFAULTS_VERSION, DEPRECATED_DEFAULTS, LEGACY_DEFAULT_TEXTS } from './default-library.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function cloneDefaults() {
  return clone(DEFAULT_LIBRARY);
}

function phrasesOf(groups) {
  return isObj(groups) ? Object.values(groups).filter(Array.isArray).flat().filter(Boolean) : [];
}

function mergeGroups(target, source, groupNames) {
  for (const name of groupNames) {
    if (!source || !Array.isArray(source[name])) continue;
    target[name] = Array.isArray(target[name]) ? target[name] : [];
    for (const phrase of source[name]) {
      if (!target[name].some((b) => b && b.text === phrase.text)) target[name].push(clone(phrase));
    }
  }
}

// Porta una libreria salvata alla versione corrente dei predefiniti senza perdere le personalizzazioni.
// Idempotente: può essere eseguita a ogni caricamento.
export function migrateLibrary(raw) {
  if (!isObj(raw)) return { data: cloneDefaults(), changed: false, restored: [], replaced: [] };
  const data = clone(raw);
  data.metodiche = Array.isArray(data.metodiche) ? data.metodiche : [];
  data.esamiByMetodica = isObj(data.esamiByMetodica) ? data.esamiByMetodica : {};
  data.indicazioniByEsame = isObj(data.indicazioniByEsame) ? data.indicazioniByEsame : {};
  data.refertoByEsame = isObj(data.refertoByEsame) ? data.refertoByEsame : {};

  const restored = [];
  const replaced = [];
  let changed = false;

  if ((Number(data.defaultsVersion) || 1) < 2) {
    const defaults = DEFAULT_LIBRARY.refertoByEsame;
    const userExams = new Set(Object.values(data.esamiByMetodica).filter(Array.isArray).flat());

    for (const esame of Object.keys(defaults)) {
      if (!userExams.has(esame)) continue;
      const phrases = phrasesOf(data.refertoByEsame[esame]);
      const legacy = new Set(LEGACY_DEFAULT_TEXTS[esame] || []);
      // Esame vuoto (riduzione del 24/09) o mai personalizzato: passa ai nuovi predefiniti.
      if (!phrases.length || phrases.every((b) => legacy.has(b.text))) {
        data.refertoByEsame[esame] = clone(defaults[esame]);
        restored.push(esame);
      }
    }

    // Esami personalizzati: sostituisce solo le frasi predefinite rischiose rimaste identiche.
    for (const dep of DEPRECATED_DEFAULTS) {
      const groups = data.refertoByEsame[dep.esame];
      if (!isObj(groups) || restored.includes(dep.esame)) continue;
      let found = false;
      for (const name of Object.keys(groups)) {
        if (!Array.isArray(groups[name])) continue;
        const before = groups[name].length;
        groups[name] = groups[name].filter((b) => !b || b.text !== dep.text);
        if (groups[name].length !== before) found = true;
        if (!groups[name].length) delete groups[name];
      }
      if (found) {
        mergeGroups(groups, defaults[dep.esame], dep.groups);
        replaced.push(dep.esame);
      }
    }

    data.defaultsVersion = DEFAULTS_VERSION;
    changed = true;
  }

  return { data, changed, restored, replaced };
}

// Gestisce lettura e scrittura della riga user_data con controllo dei conflitti:
// - un errore di lettura NON viene confuso con "libreria vuota";
// - ogni errore di salvataggio viene segnalato;
// - se un'altra scheda o postazione ha salvato nel frattempo, non sovrascrive in silenzio.
export class LibraryStore {
  constructor({ supabase, userId, onStatus }) {
    this.sb = supabase;
    this.userId = userId;
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
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', this.userId)
      .maybeSingle();
    if (error) return { status: 'error', error };
    this.loaded = true;
    if (!data || !data.data) {
      this.updatedAt = null;
      return { status: 'empty', data: cloneDefaults() };
    }
    this.updatedAt = data.updated_at;
    const migrated = migrateLibrary(data.data);
    return { status: 'ok', ...migrated };
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
      result = await this.sb.from('user_data')
        .insert({ user_id: this.userId, ...payload })
        .select('updated_at').maybeSingle();
      if (result.error && result.error.code === '23505') {
        this.dirty = true;
        this.onStatus('conflict');
        return;
      }
    } else {
      let q = this.sb.from('user_data').update(payload).eq('user_id', this.userId);
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
