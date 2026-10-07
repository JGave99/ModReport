// Testo dettato e scritto: comandi vocali di punteggiatura e abbreviazioni. Funzioni pure.

const W = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';
// L'ordine conta: "punto e virgola" prima di "punto".
const COMMANDS = [
  ['nuovo paragrafo', '\n\n'],
  ['a capo', '\n'],
  ['nuova riga', '\n'],
  ['punto e virgola', ';'],
  ['punto interrogativo', '?'],
  ['due punti', ':'],
  ['punto', '.'],
  ['virgola', ','],
  ['apri parentesi', '('],
  ['chiudi parentesi', ')'],
].map(([words, sign]) => [new RegExp(W + words.replace(/ /g, '\\s+') + E, 'giu'), sign]);

// "non versamento virgola non pnx punto a capo cuore nella norma" → "non versamento, non pnx.\nCuore nella norma"
export function applyVoiceCommands(transcript) {
  let t = ' ' + String(transcript) + ' ';
  for (const [re, sign] of COMMANDS) t = t.replace(re, '\u0000' + sign + '\u0000');
  t = t
    .replace(/\s*\u0000([.,;:?)])\u0000\s*/g, '$1 ')
    .replace(/\s*\u0000\(\u0000\s*/g, ' (')
    .replace(/[ \t]*\u0000(\n+)\u0000[ \t]*/g, '$1')
    .replace(/ +([.,;:?)])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ');
  // Maiuscola dopo punto, punto interrogativo e a capo.
  t = t.replace(/([.?]\s+|\n\s*)(\p{Ll})/gu, (m, sep, ch) => sep + ch.toUpperCase());
  return t.replace(/^ +| +$/g, '');
}

// Abbreviazioni: se appena prima del cursore c'è "<abbreviazione><separatore>", restituisce l'edit
// { start, end, insert } che la espande mantenendo il separatore. abbreviations: { '/nn': 'nei limiti della norma' }
export function abbreviationEdit(text, caret, abbreviations) {
  if (!abbreviations || caret < 2) return null;
  const sep = text[caret - 1];
  if (!/[\s.,;:)]/.test(sep)) return null;
  const before = text.slice(0, caret - 1);
  const m = before.match(/(^|[\s(])(\S+)$/);
  if (!m) return null;
  const key = m[2];
  const expansion = Object.prototype.hasOwnProperty.call(abbreviations, key) ? abbreviations[key] : null;
  if (typeof expansion !== 'string' || !expansion) return null;
  const start = caret - 1 - key.length;
  return { start, end: caret - 1, insert: expansion };
}

// Chiave valida: senza spazi, 2-20 caratteri. Consigliato iniziare con "/" per non espandere parole vere.
export const validAbbreviation = (key) => /^\S{2,20}$/.test(String(key || ''));

export const DEFAULT_ABBREVIATIONS = {
  '/nn': 'nei limiti della norma',
  '/mdc': 'mezzo di contrasto',
  '/pqv': 'per quanto valutabile',
};
