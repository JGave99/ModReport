// Analisi locale di un referto incollato: divisione in frasi, ricerca di dati identificativi,
// classificazione PROPOSTA (normale / patologico / incerto) che il medico deve sempre confermare.
// Funzioni pure: nessun dato lascia il browser.

const L = '\\p{L}\\p{N}';
// Parola che inizia con il prefisso dato (niente "irregolare" per "regolare").
const w = (prefix) => new RegExp('(?<![' + L + '])' + prefix, 'iu');

// ---------------- Dati identificativi ----------------
const PII_RULES = [
  { type: 'codice-fiscale', label: 'codice fiscale', re: /(?<![A-Z0-9])[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z](?![A-Z0-9])/i },
  { type: 'data', label: 'data', re: /(?<!\d)(0?[1-9]|[12]\d|3[01])[/.\-](0?[1-9]|1[0-2])[/.\-](\d{4}|\d{2})(?!\d)/ },
  { type: 'data', label: 'data', re: /(?<!\d)\d{1,2}\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4}/i },
  { type: 'anagrafica', label: 'dati anagrafici', re: new RegExp('(?<![' + L + '])(paziente|pz\\.|sig\\.(ra)?|sig\\.ra|signor[ae]?|nat[oa]\\s+(il|a)|data\\s+di\\s+nascita|residente|tessera\\s+sanitaria|codice\\s+fiscale|c\\.f\\.)(?![' + L + '])', 'iu') },
  { type: 'identificativo', label: 'numero di accettazione o ricovero', re: new RegExp('(?<![' + L + '])(n\\.?\\s*acc\\.?|accettazione|nosologico|cartella\\s+clinica|ricovero\\s+n|prenotazione|id\\s+paziente|pid|letto\\s*\\d+)', 'iu') },
  { type: 'numero', label: 'numero identificativo (6+ cifre)', re: /(?<![\d,.])\d{6,}(?![\d,])/ },
  { type: 'contatto', label: 'email', re: /[^\s@]+@[^\s@]+\.[a-z]{2,}/i },
  { type: 'contatto', label: 'telefono', re: /(?<!\d)(\+39[\s.]?)?3\d{2}[\s.]?\d{3}[\s.]?\d{3,4}(?!\d)/ },
  { type: 'eta', label: 'età', re: /(?<!\d)\d{1,3}\s*(anni|aa\.?)(?![\p{L}])/iu },
];

// Restituisce l'elenco dei possibili dati identificativi trovati (vuoto se nessuno).
export function detectPII(text) {
  const found = [];
  const seen = new Set();
  for (const rule of PII_RULES) {
    const m = String(text || '').match(rule.re);
    if (m && !seen.has(rule.label)) {
      seen.add(rule.label);
      found.push({ type: rule.type, label: rule.label, match: m[0] });
    }
  }
  return found;
}

// ---------------- Divisione in frasi ----------------
const ABBREVIATIONS = ['diam', 'dx', 'sin', 'sn', 'es', 'ca', 'vs', 'seg', 'segm', 'cfr', 'lat', 'ant', 'post', 'sup', 'inf', 'med', 'max', 'min', 'tot', 'n', 'nr', 'dott', 'prof', 'S', 'p', 'pag', 'mdc', 'e\\.v', 'c\\.d', 'vd', 'cc', 'ml', 'cm', 'mm'];
const ABBR_RE = new RegExp('(?<![' + L + '])(' + ABBREVIATIONS.join('|') + ')\\.(?=\\s)', 'giu');

export function splitIntoSentences(text) {
  // Una riga senza punto finale seguita da una riga che inizia in maiuscolo è una frase a sé
  // (intestazioni, elenchi); altrimenti la riga continua la frase precedente.
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  let joined = '';
  lines.forEach((line, i) => {
    joined += line;
    const next = lines[i + 1];
    if (next === undefined) return;
    joined += (!/[.!?:;]$/.test(line) && /^[\p{Lu}0-9«"]/u.test(next)) ? '. ' : ' ';
  });
  const protectedText = joined.replace(/\s+/g, ' ').replace(ABBR_RE, '$1\u0000');
  const rough = protectedText.split(/(?<=[.!?])\s+(?=[\p{Lu}0-9«"])/u);
  const seen = new Set();
  const out = [];
  rough.map((s) => s.replace(/\u0000/g, '.').trim()).filter((s) => s.length >= 4).forEach((s) => {
    const key = s.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(s); }
  });
  return out;
}

// ---------------- Classificazione proposta ----------------
const UNCERTAIN = [
  /non\s+(si\s+)?(può|puo|possono|è possibile|e' possibile|e possibile)\s+(essere\s+)?esclud/iu,
  /non\s+(è|e')\s+possibile\s+esclud/iu, w('dubbi'), w('sospett'), w('verosimil'), w('probabil'), w('compatibil'),
  w('da\\s+(valutare|correlare|approfondire|definire)'), w('si\\s+consiglia'), w('meritevol'), w('indeterminat'), w('non\\s+caratterizzabil'),
];
const PATHOLOGIC = [
  'lesion', 'nodul', 'mass[ae]\\b', 'neoplas', 'tumor', 'metasta', 'secondaris', 'addensament', 'consolidament', 'opacament',
  'versament', 'raccolt', 'ascite', 'pneumotorac', 'pneumoperiton', 'pneumomediastin', 'enfisem', 'atelettas', 'frattur', 'lussaz',
  'ernia', 'protrusion', 'stenos', 'ectasi', 'aneurism', 'dissezion', 'trombo', 'embol', 'ischemi', 'emorrag', 'ematom', 'infart',
  'edema', 'calcol', 'litias', 'idronefros', 'dilataz', 'dilatat', 'ispessiment', 'steatos', 'epatomegal', 'splenomegal', 'cardiomegal',
  'cist[io]', 'adenopat', 'linfoadenopat', 'irregolar', 'disomogene', 'ipoecogen', 'iperecogen', 'ipodens', 'iperdens', 'ipointens',
  'iperintens', 'alterazion', 'aumentat', 'occlus', 'perforaz', 'mancat', 'falda', 'restrizion', 'deformit', 'degenerat', 'artros',
].map(w);
const FREE_FLUID = /(?<![\p{L}\p{N}])(aria|liquido|fluido|raccolta(\s+fluida)?|versamento|falda(\s+(di\s+)?(aria|liquido|fluida))?)\s+(fluid[ao]\s+)?liber/iu;
const NORMAL = [
  'nella\\s+norma', 'nei\\s+limiti', 'normal[ei]', 'regolar[ei]', 'conservat', 'indenne', 'perv[io][ao]?', 'in\\s+sede', 'in\\s+asse',
  'omogene', 'alitiasic', 'simmetric', 'congru', 'integr[oaie]', 'in\\s+continuit', 'non\\s+dilatat', 'liber[oaie]',
].map(w);
const NEGATION_START = /^(non|né|ne'|assenza|assente|senza|priv[oaie]\s+di|esclus[oaie])(?![\p{L}])/iu;
const NEGATION_ANY = /(?<![\p{L}])(non\s+(si\s+)?(evidenz|apprezz|rilev|osserv|riscontr|document|repert|segni|evidenti)|non\s+(dilatat|ispessit|aumentat|ingrandit|alterat|distes|ectasic|deformat|dislocat)|assenza\s+di|senza|priv[oaie]\s+di)/iu;
const CLAUSE_SPLIT = /[;,]|(?<![\p{L}])(ma|tuttavia|però|pero'|eccetto|tranne|fatta\s+eccezione\s+per|ad\s+eccezione\s+d[ei]i?)(?![\p{L}])/iu;

function classifyClause(clause) {
  const c = clause.trim();
  if (!c) return null;
  if (UNCERTAIN.some((re) => re.test(c))) return 'incerto';
  if (FREE_FLUID.test(c) && !NEGATION_START.test(c) && !NEGATION_ANY.test(c)) return 'patologico';
  const negated = NEGATION_START.test(c) || NEGATION_ANY.test(c);
  const pathologic = PATHOLOGIC.some((re) => re.test(c));
  if (pathologic && !negated) return 'patologico';
  if (negated) return 'normale';
  if (NORMAL.some((re) => re.test(c))) return 'normale';
  return null;
}

// 'normale' | 'patologico' | 'incerto' — solo una proposta da confermare.
export function classifyFinding(sentence) {
  const s = String(sentence || '').toLowerCase();
  if (UNCERTAIN.some((re) => re.test(s))) return 'incerto';
  const hasException = /(?<![\p{L}])(eccetto|tranne|fatta\s+eccezione|ad\s+eccezione|tuttavia|però|ma)(?![\p{L}])/iu.test(s);
  const results = s.split(CLAUSE_SPLIT).filter((x) => x && !/^(ma|tuttavia|però|pero'|eccetto|tranne|fatta\s+eccezione\s+per|ad\s+eccezione\s+d[ei]i?)$/iu.test(x.trim()))
    .map(classifyClause).filter(Boolean);
  if (results.includes('incerto')) return 'incerto';
  if (results.includes('patologico')) return 'patologico';
  if (results.length && results.every((r) => r === 'normale') && !hasException) return 'normale';
  return 'incerto';
}
