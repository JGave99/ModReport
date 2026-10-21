// Crea la libreria predefinita da una libreria esportata da un account (issue #3: la base diventa la libreria
// di riferimento di un radiologo, copiata una volta sola).
//
// Uso: node scripts/preset-da-libreria.mjs <libreria.json|.csv> [--out js/lib/library-base/preset.js]
// Il file può essere: quello di Account → Libreria → Esporta; il campo "data" di user_data (JSON);
// il risultato del SQL Editor di Supabase scaricato in CSV o copiato come JSON (colonna "data").
//
// - Prende metodiche, esami, indicazioni e frasi nell'ordine dell'account (anche l'ordine dei gruppi).
// - Lascia fuori ciò che è personale: abbreviazioni, scelta del referto negativo, elementi eliminati, impronte.
// - ID stabili: le frasi della base mantengono il loro; quelle create dall'utente (u:X) diventano esame:ig.X,
//   così nell'account di origine vengono riconosciute e non si duplicano (library-merge.js, findTwin).
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isBaseId, phraseHash } from '../js/lib/library-merge.js';
import { migrateLibrary } from '../js/lib/library.js';

const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'esame';

// CSV del SQL Editor (RFC 4180): restituisce le righe come oggetti { colonna: valore }.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x !== ''));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]])));
}

// Trova la libreria in uno dei formati accettati.
export function readLibrary(text) {
  const trimmed = String(text).replace(/^\uFEFF/, '').trim();
  let v = trimmed.startsWith('{') || trimmed.startsWith('[') ? JSON.parse(trimmed) : parseCsv(trimmed);
  if (Array.isArray(v)) v = v.length === 1 ? v[0] : (() => { throw new Error('Il risultato ha ' + v.length + ' righe: ne serve una.'); })();
  if (v && v.data !== undefined && !v.refertoByEsame) v = v.data;
  if (typeof v === 'string') v = JSON.parse(v);
  if (!v || typeof v !== 'object' || !v.refertoByEsame) throw new Error('Il file non contiene una libreria ModReport.');
  return v;
}

export function buildPreset(input) {
  const raw = input && input.data && input.data.refertoByEsame ? input.data : input;
  if (!raw || typeof raw !== 'object' || !raw.refertoByEsame) throw new Error('Il file non contiene una libreria ModReport.');
  // La libreria come la vede l'utente nell'app oggi: aggiornata ai predefiniti correnti, con l'ordine dei gruppi
  // (ordineGruppi; se manca, perché salvata prima della v0.2.1, quello dei predefiniti).
  const lib = migrateLibrary(raw).data;
  const warnings = [];
  if (!raw.ordineGruppi) warnings.push('La libreria non ha l\'ordine dei gruppi salvato (ultimo salvataggio prima della v0.2.1): uso l\'ordine dei predefiniti per gli esami della base.');
  const preset = { metodiche: [], esamiByMetodica: {}, indicazioniByEsame: {}, refertoByEsame: {} };
  const usedCodes = new Set();
  const usedIds = new Set();
  let phrases = 0;

  for (const m of lib.metodiche) {
    const exams = (lib.esamiByMetodica[m] || []).filter((e, i, a) => a.indexOf(e) === i);
    preset.metodiche.push(m);
    preset.esamiByMetodica[m] = [];
    for (const esame of exams) {
      if (preset.refertoByEsame[esame]) { warnings.push(esame + ': esame presente in più metodiche, tenuto solo in quella prima'); continue; }
      const groups = lib.refertoByEsame[esame] || {};
      // Codice dell'esame: quello delle frasi della base già presenti, altrimenti dal nome.
      const baseIds = Object.values(groups).flat().map((p) => p.id).filter(isBaseId);
      let code = baseIds.length ? baseIds[0].split(':')[0] : slug(esame);
      if (!baseIds.length) { const root = code; let n = 2; while (usedCodes.has(code)) code = root + '-' + n++; }
      usedCodes.add(code);
      const out = {};
      for (const [g, list] of Object.entries(groups)) {
        if (/^(tecnica|conclusion[ie])$/i.test(g.trim())) warnings.push(esame + ': gruppo "' + g + '"');
        const texts = new Set();
        const items = [];
        for (const p of list) {
          if (!p.text.trim()) continue;
          let id = isBaseId(p.id) ? p.id : code + ':ig.' + (String(p.id || '').replace(/^u:/, '').toLowerCase().replace(/[^a-z0-9]/g, '') || phraseHash(p));
          if (usedIds.has(id)) id = code + ':ig.' + phraseHash({ ...p, label: id });
          usedIds.add(id);
          const item = { id, label: p.label.trim() || p.text.slice(0, 28), text: p.text, neg: !!p.neg };
          if (p.opz) item.opz = true;
          if (item.label.length > 28) warnings.push(esame + ' / ' + g + ': etichetta lunga "' + item.label + '"');
          if (texts.has(p.text.trim())) warnings.push(esame + ' / ' + g + ': testo ripetuto "' + p.text + '"');
          if (/\b(paziente|nato|nata)\b/i.test(p.text)) warnings.push(esame + ' / ' + g + ': possibile dato del paziente "' + p.text + '"');
          texts.add(p.text.trim());
          items.push(item);
        }
        if (items.length) out[g] = items;
      }
      preset.esamiByMetodica[m].push(esame);
      preset.indicazioniByEsame[esame] = (lib.indicazioniByEsame[esame] || []).map((t) => String(t).trim()).filter((t, i, a) => t && a.indexOf(t) === i);
      preset.refertoByEsame[esame] = out;
      phrases += Object.values(out).flat().length;
    }
  }
  const orphans = Object.keys(lib.refertoByEsame).filter((e) => !preset.refertoByEsame[e]);
  if (orphans.length) warnings.push('Esami senza metodica, esclusi: ' + orphans.join(', '));
  const esami = Object.keys(preset.refertoByEsame).length;
  return { preset, warnings, stats: { metodiche: preset.metodiche.length, esami, frasi: phrases } };
}

export function presetModule(preset, { date = new Date().toISOString().slice(0, 10) } = {}) {
  return '// Libreria predefinita: copia della libreria dell\'account di riferimento del ' + date + ' (issue #3).\n'
    + '// Generata con scripts/preset-da-libreria.mjs: per cambiarla si rigenera, non si modifica a mano.\n'
    + '// Gli ID delle frasi non vanno mai cambiati né riutilizzati (vedi library-base/helpers.js).\n'
    + 'export const PRESET = ' + JSON.stringify(preset, null, 2) + ';\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, ...rest] = process.argv.slice(2);
  if (!file) { console.error('Uso: node scripts/preset-da-libreria.mjs <libreria.json> [--out percorso]'); process.exit(1); }
  const outIdx = rest.indexOf('--out');
  const out = outIdx !== -1 ? rest[outIdx + 1] : 'js/lib/library-base/preset.js';
  const { preset, warnings, stats } = buildPreset(readLibrary(readFileSync(file, 'utf8')));
  writeFileSync(out, presetModule(preset));
  console.log('Scritto ' + out + ': ' + stats.metodiche + ' metodiche, ' + stats.esami + ' esami, ' + stats.frasi + ' frasi.');
  if (warnings.length) console.log('Da controllare (' + warnings.length + '):\n- ' + warnings.join('\n- '));
}
