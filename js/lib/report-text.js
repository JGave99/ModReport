// Funzioni pure sul testo del referto (nessun accesso al DOM):
// - riconoscere nel testo le frasi della libreria, anche dopo che l'utente ha compilato i campi;
// - pianificare inserimenti nell'ordine dei distretti, sostituzioni normale ↔ patologico, rimozioni;
// - campi da compilare ([___], [a/b], ___), sezioni (indicazione, referto, conclusioni), classe di dose;
// - controlli di scrittura (campi vuoti, lato, frasi in contraddizione). Sono avvisi testuali: non
//   interpretano il contenuto clinico (vedi docs/legale/destinazione-uso.md).
//
// Le modifiche sono descritte come "edit" { start, end, insert } da applicare al testo originale:
// l'editor le applica con replaceRange, così ogni passaggio resta annullabile con Ctrl+Z.

// ---------------- Campi da compilare ----------------
const FIELD_RE = /\[[^\][\n]+\]|_{3,}/g;
const MEASURE_RE = /^(_{3,})(\s*[^\s/]{1,6})?$/; // [___] o [___ mm]

// Elenco dei campi nel testo: { start, end, raw, kind: 'scelta' | 'misura' | 'libero', options }
export function findFields(text) {
  const out = [];
  for (const m of String(text).matchAll(FIELD_RE)) {
    const raw = m[0];
    const field = { start: m.index, end: m.index + raw.length, raw, kind: 'libero', options: null };
    if (raw.startsWith('[')) {
      const inner = raw.slice(1, -1).trim();
      const parts = inner.split('/').map((s) => s.trim());
      if (MEASURE_RE.test(inner)) field.kind = 'misura';
      else if (parts.length >= 2 && parts.every((p) => p && !/^_+$/.test(p))) { field.kind = 'scelta'; field.options = parts; }
    } else {
      field.kind = 'misura';
    }
    out.push(field);
  }
  return out;
}

// Campo successivo (o precedente) rispetto alla selezione, ricominciando dall'inizio.
export function nextField(text, selStart, selEnd, { backwards = false } = {}) {
  const fields = findFields(text);
  if (!fields.length) return null;
  if (backwards) {
    const prev = fields.filter((f) => f.end <= selStart && !(f.start === selStart && f.end === selEnd));
    return prev.length ? prev[prev.length - 1] : fields[fields.length - 1];
  }
  return fields.find((f) => f.start >= selEnd && !(f.start === selStart && f.end === selEnd)) || fields[0];
}

// Campo che coincide esattamente con la selezione (per mostrare le opzioni di una scelta).
export function fieldAt(text, selStart, selEnd) {
  return findFields(text).find((f) => f.start === selStart && f.end === selEnd) || null;
}

// Preparazione di un campo misura: "[___ mm]" diventa "___ mm" e si seleziona solo "___",
// così scrivendo il valore l'unità resta. Restituisce { edit, select: [start, end] } o null.
export function prepareMeasure(field) {
  if (field.kind !== 'misura' || !field.raw.startsWith('[')) return null;
  const inner = field.raw.slice(1, -1).trim();
  const m = inner.match(MEASURE_RE);
  if (!m) return null;
  return { edit: { start: field.start, end: field.end, insert: inner }, select: [field.start, field.start + m[1].length] };
}

// ---------------- Frasi della libreria nel testo ----------------
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patternCache = new Map();

// Espressione che riconosce la frase anche con i campi compilati. null = solo confronto esatto
// (frasi fatte quasi solo di campi: riconoscerle "a pattern" darebbe falsi positivi).
export function phrasePattern(template) {
  if (patternCache.has(template)) return patternCache.get(template);
  let re = null;
  const parts = String(template).split(/(\[[^\][\n]+\])/);
  const literal = parts.filter((p, i) => i % 2 === 0).join('');
  if (parts.length > 1 && literal.replace(/[\s.,;:()'-]/g, '').length >= 8) {
    const endsWithField = !parts[parts.length - 1].trim();
    const src = parts.map((p, i) => {
      if (i % 2 === 1) return endsWithField && i === parts.length - 2 ? '([^\\n]+)' : '([^\\n]+?)';
      // Il punto subito dopo un campo chiude la frase solo se seguito da spazio o fine riga ("1.5 cm." resta intero).
      if (i > 0 && p.startsWith('.')) return '\\.(?=\\s|$)' + escapeRe(p.slice(1));
      return escapeRe(p);
    }).join('');
    re = new RegExp(src);
  }
  patternCache.set(template, re);
  return re;
}

// Prima occorrenza della frase nel testo: { start, end } o null.
export function findPhrase(text, template) {
  if (!template) return null;
  const exact = text.indexOf(template);
  if (exact !== -1) return { start: exact, end: exact + template.length };
  const re = phrasePattern(template);
  if (!re) return null;
  const m = re.exec(text);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

const lineStartOf = (text, i) => text.lastIndexOf('\n', i - 1) + 1;
const lineEndOf = (text, i) => { const j = text.indexOf('\n', i); return j === -1 ? text.length : j; };

// Edit che toglie la frase: la riga intera se la frase la occupa da sola, altrimenti la frase e uno spazio.
export function removalEdit(text, range) {
  const ls = lineStartOf(text, range.start);
  const le = lineEndOf(text, range.end);
  if (!text.slice(ls, range.start).trim() && !text.slice(range.end, le).trim()) {
    return { start: ls, end: le < text.length ? le + 1 : le, insert: '' };
  }
  let { start, end } = range;
  if (text[end] === ' ') end += 1; else if (text[start - 1] === ' ') start -= 1;
  return { start, end, insert: '' };
}

// ---------------- Sezioni ----------------
// Intestazione: prima riga che inizia con "Indicazione" o con la formula d'urgenza (anche se modificata a mano).
export const HEADER_RE = /^(Indicazion[ei]\b|Esame eseguito in regime d'urgenza)[^\n]*(\n\n?|$)/i;
const CONCL_RE = /^[ \t]*conclusion[ie]\b[ \t]*:?/im;
const DOSE_RE = /^[ \t]*classe di dose\b[^\n]*$/im;
export const isConclusionGroup = (name) => /^conclusion[ie]$/i.test(String(name).trim());
export const isTechniqueGroup = (name) => /^tecnica$/i.test(String(name).trim());

function doseLine(text) {
  const m = DOSE_RE.exec(text);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

function conclusionHeader(text) {
  const m = CONCL_RE.exec(text);
  if (!m) return null;
  return { start: m.index, end: lineEndOf(text, m.index), contentStart: m.index + m[0].length };
}

// { indicazione, referto, conclusioni }: testo di ciascuna sezione (stringa vuota se assente).
export function splitSections(text) {
  const t = String(text);
  const header = t.match(HEADER_RE);
  let indicazione = '';
  let bodyStart = 0;
  if (header) {
    const line = header[0].trim();
    indicazione = line.includes(':') ? line.slice(line.indexOf(':') + 1).trim() : line;
    bodyStart = header[0].length;
  }
  const dose = doseLine(t);
  const concl = conclusionHeader(t);
  const stop = (from) => (dose && dose.start >= from ? dose.start : t.length);
  const bodyEnd = concl && concl.start >= bodyStart ? concl.start : stop(bodyStart);
  const referto = t.slice(bodyStart, bodyEnd).trim();
  const conclusioni = concl ? t.slice(concl.contentStart, stop(concl.contentStart)).trim() : '';
  return { indicazione, referto, conclusioni };
}

// ---------------- Inserimenti, sostituzioni, rimozioni ----------------
// groups: [{ name, phrases: [{ text, neg, opz }] }] nell'ordine della libreria.
function groupMatches(text, groups) {
  return groups.map((g) => g.phrases.map((p) => ({ phrase: p, range: findPhrase(text, p.text) })).filter((x) => x.range));
}

// Inserimento di una nuova riga nel punto giusto. blankBefore: se il testo finisce con la riga
// dell'esame, lascia una riga vuota prima della prima frase.
export function planInsert(text, groups, gi, phraseText, { blankBefore = false } = {}) {
  const t = String(text);
  const dose = doseLine(t);
  const concl = conclusionHeader(t);

  if (isConclusionGroup(groups[gi] && groups[gi].name)) {
    if (concl) {
      const end = dose && dose.start > concl.start ? dose.start : t.length;
      const sectionText = t.slice(0, end).replace(/\s+$/, '');
      const at = Math.max(sectionText.length, concl.end);
      return { start: at, end: at, insert: '\n' + phraseText };
    }
    const at = dose ? lineStartOf(t, dose.start) : t.length;
    const before = t.slice(0, at);
    const sep = !before.trim() ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    return { start: at, end: at, insert: sep + 'Conclusioni:\n' + phraseText + '\n' + (dose ? '\n' : '') };
  }

  const matches = groupMatches(t, groups);
  let after = -1;
  let before = Infinity;
  matches.forEach((list, h) => {
    if (isConclusionGroup(groups[h].name)) return;
    for (const { range } of list) {
      if (concl && range.start >= concl.start) continue;
      if (h <= gi) after = Math.max(after, range.end);
      else before = Math.min(before, range.start);
    }
  });
  if (after >= 0) {
    const at = lineEndOf(t, after);
    return { start: at, end: at, insert: '\n' + phraseText };
  }
  if (before !== Infinity) {
    const at = lineStartOf(t, before);
    return { start: at, end: at, insert: phraseText + '\n' };
  }
  const limit = concl ? concl.start : dose ? lineStartOf(t, dose.start) : -1;
  if (limit >= 0) {
    const head = t.slice(0, limit).replace(/\s+$/, '');
    const sep = head ? '\n\n' : '';
    return { start: head.length, end: limit, insert: sep + phraseText + '\n\n' };
  }
  const sep = !t ? '' : blankBefore ? (t.endsWith('\n\n') ? '' : t.endsWith('\n') ? '\n' : '\n\n') : (t.endsWith('\n') ? '' : '\n');
  return { start: t.length, end: t.length, insert: sep + phraseText + '\n' };
}

// Clic su una frase della libreria: la toglie se c'è già; se è una variante sostituisce la frase
// di polarità opposta dello stesso gruppo (normale ↔ patologica); altrimenti la inserisce.
// Restituisce { action: 'remove' | 'replace' | 'insert', edits (dall'ultimo al primo), replaced }.
export function planToggle(text, groups, gi, pi, opts = {}) {
  const t = String(text);
  const group = groups[gi];
  const phrase = group.phrases[pi];
  const own = findPhrase(t, phrase.text);
  if (own) return { action: 'remove', edits: [removalEdit(t, own)], replaced: [] };

  if (!phrase.opz) {
    const opposite = group.phrases
      .filter((p) => p !== phrase && !p.opz && p.neg !== phrase.neg)
      .map((p) => ({ p, range: findPhrase(t, p.text) }))
      .filter((x) => x.range)
      .sort((a, b) => a.range.start - b.range.start);
    if (opposite.length) {
      const [first, ...rest] = opposite;
      const edits = [{ start: first.range.start, end: first.range.end, insert: phrase.text }, ...rest.map((x) => removalEdit(t, x.range))];
      edits.sort((a, b) => b.start - a.start);
      return { action: 'replace', edits, replaced: opposite.map((x) => x.p) };
    }
  }
  return { action: 'insert', edits: [planInsert(t, groups, gi, phrase.text, opts)], replaced: [] };
}

// Applica gli edit (ordinati dall'ultimo al primo) e restituisce il nuovo testo.
export function applyEdits(text, edits) {
  return [...edits].sort((a, b) => b.start - a.start).reduce((t, e) => t.slice(0, e.start) + e.insert + t.slice(e.end), String(text));
}

// "Referto normale": per ogni gruppo senza frasi già presenti aggiunge la prima frase normale
// (le frasi opzionali non entrano). Restituisce il nuovo testo e le etichette aggiunte.
export function normalReport(text, groups, { blankBefore = false } = {}) {
  let t = String(text);
  const added = [];
  let first = true;
  groups.forEach((g, gi) => {
    if (g.phrases.some((p) => findPhrase(t, p.text))) return;
    const normal = g.phrases.find((p) => !p.opz && !p.neg);
    if (!normal) return;
    const edit = planInsert(t, groups, gi, normal.text, { blankBefore: blankBefore && first });
    t = applyEdits(t, [edit]);
    added.push(normal);
    first = false;
  });
  return { text: t, added };
}

// ---------------- Classe di dose (D.Lgs. 101/2020) ----------------
export const DOSE_CLASSES = [
  { value: 'I', range: '< 1 mSv' },
  { value: 'II', range: '1-5 mSv' },
  { value: 'III', range: '5-10 mSv' },
  { value: 'IV', range: '> 10 mSv' },
];
export const isIonizing = (metodica) => /^(rx|tc)\b|radiograf|tomograf|mammograf|angiograf|\bmoc\b|ortopantomo|dentalscan|fluoroscop|scintigraf|pet\b/i.test(String(metodica || ''));

export function readDoseClass(text) {
  const d = doseLine(String(text));
  if (!d) return null;
  const m = String(text).slice(d.start, d.end).match(/\b(IV|III|II|I)\b/);
  return m ? m[1] : null;
}

// Edit che imposta (o toglie, con value null) la riga "Classe di dose" in fondo al referto.
export function doseEdit(text, value) {
  const t = String(text);
  const d = doseLine(t);
  const cls = DOSE_CLASSES.find((c) => c.value === value);
  const line = cls ? 'Classe di dose: ' + cls.value + ' (' + cls.range + ').' : '';
  if (d) {
    if (!line) return removalEdit(t, d);
    return { start: d.start, end: d.end, insert: line };
  }
  if (!line) return null;
  const head = t.replace(/\s+$/, '');
  return { start: head.length, end: t.length, insert: (head ? '\n\n' : '') + line + '\n' };
}

// ---------------- Controlli di scrittura ----------------
const SIDE = {
  destro: /(?<![\p{L}])(destr[oaie]|dx)(?![\p{L}])/iu,
  sinistro: /(?<![\p{L}])(sinistr[oaie]|sx|sn)(?![\p{L}])/iu,
};
const BILATERAL = /bilateral|entramb|ambo i lati|a destra e a sinistra/i;

// Avvisi: [{ type: 'campi' | 'lato' | 'contraddizione' | 'dose', message }]
export function checkReport(text, { groups = [], esame = '', metodica = '' } = {}) {
  const t = String(text);
  const issues = [];
  const fields = findFields(t);
  if (fields.length) {
    const sample = fields.slice(0, 3).map((f) => f.raw).join(', ');
    issues.push({ type: 'campi', message: (fields.length === 1 ? 'C\'è 1 campo da compilare' : 'Ci sono ' + fields.length + ' campi da compilare') + ' (' + sample + (fields.length > 3 ? ', …' : '') + ').' });
  }

  // Lato: se esame o indicazione citano un solo lato, il testo non dovrebbe citare solo l'altro.
  const sections = splitSections(t);
  const context = [esame, sections.indicazione].join(' ');
  const body = [sections.referto, sections.conclusioni].join('\n');
  const inContext = Object.keys(SIDE).filter((s) => SIDE[s].test(context));
  if (inContext.length === 1 && !BILATERAL.test(body)) {
    const other = inContext[0] === 'destro' ? 'sinistro' : 'destro';
    if (SIDE[other].test(body) && !SIDE[inContext[0]].test(body)) {
      issues.push({ type: 'lato', message: 'L\'esame o l\'indicazione citano il lato ' + inContext[0] + ', il testo cita il ' + other + ': verifica il lato.' });
    }
  }

  // Frase normale e patologica dello stesso distretto insieme.
  for (const g of groups) {
    const present = g.phrases.filter((p) => !p.opz && findPhrase(t, p.text));
    if (present.some((p) => p.neg) && present.some((p) => !p.neg)) {
      issues.push({ type: 'contraddizione', message: g.name + ': ci sono sia una frase normale sia una patologica.' });
    }
  }

  if (isIonizing(metodica) && t.trim() && !readDoseClass(t)) {
    issues.push({ type: 'dose', message: 'Manca la classe di dose (esame con radiazioni ionizzanti, D.Lgs. 101/2020).' });
  }
  return issues;
}
