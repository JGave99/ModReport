// Crea la libreria predefinita da una libreria esportata da un account (issue #3: la base diventa la libreria
// di riferimento di un radiologo, copiata una volta sola).
//
// Uso: node scripts/preset-da-libreria.mjs <libreria.json> [--out js/lib/library-base/preset.js]
// Il file è quello di Account → Libreria → Esporta (oppure il solo campo "data" di user_data).
//
// - Prende metodiche, esami, indicazioni e frasi nell'ordine dell'account (anche l'ordine dei gruppi).
// - Lascia fuori ciò che è personale: abbreviazioni, scelta del referto negativo, elementi eliminati, impronte.
// - ID stabili: le frasi della base mantengono il loro; quelle create dall'utente (u:X) diventano esame:ig.X,
//   così nell'account di origine vengono riconosciute e non si duplicano (library-merge.js, findTwin).
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { normalize, isBaseId, phraseHash } from '../js/lib/library-merge.js';

const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'esame';

export function buildPreset(input) {
  const raw = input && input.data && input.data.refertoByEsame ? input.data : input;
  if (!raw || typeof raw !== 'object' || !raw.refertoByEsame) throw new Error('Il file non contiene una libreria ModReport.');
  const lib = normalize(raw);
  const warnings = [];
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
  const { preset, warnings, stats } = buildPreset(JSON.parse(readFileSync(file, 'utf8')));
  writeFileSync(out, presetModule(preset));
  console.log('Scritto ' + out + ': ' + stats.metodiche + ' metodiche, ' + stats.esami + ' esami, ' + stats.frasi + ' frasi.');
  if (warnings.length) console.log('Da controllare (' + warnings.length + '):\n- ' + warnings.join('\n- '));
}
