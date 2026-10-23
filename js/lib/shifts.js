// Turni: tipi predefiniti, date e calendario mensile. Funzioni pure (nessun accesso al DOM o al server).
// Gli orari sono quelli locali del dispositivo; nel database si salvano come istanti (timestamptz).

export const DEFAULT_TIPI = [
  { nome: 'Mattina', colore: '#0ea5e9', inizio: '08:00', fine: '14:00' },
  { nome: 'Pomeriggio', colore: '#f59e0b', inizio: '14:00', fine: '20:00' },
  { nome: 'Notte', colore: '#6366f1', inizio: '20:00', fine: '08:00' },
  { nome: 'Giornata', colore: '#10b981', inizio: '08:00', fine: '20:00' },
  { nome: 'Reperibilità', colore: '#ef4444', inizio: '20:00', fine: '08:00' },
  { nome: 'Ferie', colore: '#22c55e', inizio: '00:00', fine: '00:00' },
];

export const QUALIFICHE = {
  radiologo: 'Radiologo',
  specializzando: 'Specializzando',
  tsrm: 'TSRM',
  infermiere: 'Infermiere',
  segreteria: 'Segreteria',
  altro: 'Altro',
};

const PALETTE = ['#0ea5e9', '#f59e0b', '#6366f1', '#10b981', '#ef4444', '#a855f7', '#14b8a6', '#f97316'];
const pad = (n) => String(n).padStart(2, '0');
const isTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || ''));
const isColor = (c) => /^#[0-9a-fA-F]{6}$/.test(String(c || ''));

// Tipi disponibili: quelli dei team (impostati dagli amministratori) prevalgono sui predefiniti con lo stesso nome.
export function mergeTipi(...lists) {
  const out = new Map(DEFAULT_TIPI.map((t) => [t.nome.toLowerCase(), t]));
  for (const list of lists) {
    for (const t of Array.isArray(list) ? list : []) {
      const nome = String((t && t.nome) || '').trim().slice(0, 40);
      if (!nome) continue;
      out.set(nome.toLowerCase(), { nome, colore: isColor(t.colore) ? t.colore : colorFor(nome), inizio: isTime(t.inizio) ? t.inizio : '08:00', fine: isTime(t.fine) ? t.fine : '14:00' });
    }
  }
  return [...out.values()];
}

export function colorFor(tipo, tipi = DEFAULT_TIPI) {
  const found = tipi.find((t) => t.nome.toLowerCase() === String(tipo || '').toLowerCase());
  if (found) return found.colore;
  let h = 0;
  for (const ch of String(tipo || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const dayKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const timeOf = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
export function parseDay(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Inizio e fine di un turno da giorno e orari locali: se la fine non è dopo l'inizio, finisce il giorno dopo.
export function shiftTimes(day, inizio, fine) {
  if (!isTime(inizio) || !isTime(fine)) throw new Error('Orario non valido');
  const base = parseDay(day);
  const [h1, m1] = inizio.split(':').map(Number);
  const [h2, m2] = fine.split(':').map(Number);
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h1, m1);
  let end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h2, m2);
  if (end <= start) end = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, h2, m2);
  return { starts_at: start.toISOString(), ends_at: end.toISOString() };
}

// Lunedì della settimana che contiene d.
export function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

// Settimane (da lunedì a domenica) che coprono il mese: [[Date × 7], …].
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks = [];
  for (let start = weekStart(first); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

// Turni raggruppati per giorno di inizio (un turno di notte appartiene al giorno in cui comincia).
export function shiftsByDay(shifts) {
  const map = new Map();
  for (const s of shifts) {
    const key = dayKey(new Date(s.starts_at));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  for (const list of map.values()) list.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  return map;
}

// Lo stesso turno spostato di n settimane (stessi orari locali, anche a cavallo dell'ora legale).
export function moveByWeeks(shift, n) {
  const s = new Date(shift.starts_at);
  const e = new Date(shift.ends_at);
  return { ...shift, starts_at: addDays(s, 7 * n).toISOString(), ends_at: addDays(e, 7 * n).toISOString() };
}

// Copie di un turno per le settimane successive (ripetizione settimanale).
export function repeatWeekly(shift, weeks) {
  return Array.from({ length: Math.max(0, Math.min(52, weeks | 0)) }, (_, i) => moveByWeeks(shift, i + 1));
}

// Turni della settimana che inizia in `monday` copiati nella settimana successiva.
export function copyWeek(shifts, monday) {
  const from = monday.getTime();
  const to = addDays(monday, 7).getTime();
  return shifts.filter((s) => { const t = new Date(s.starts_at).getTime(); return t >= from && t < to; })
    .map((s) => moveByWeeks(s, 1));
}

export function formatRange(s) {
  const a = new Date(s.starts_at);
  const b = new Date(s.ends_at);
  if (timeOf(a) === '00:00' && timeOf(b) === '00:00') return 'tutto il giorno';
  return timeOf(a) + '–' + timeOf(b) + (dayKey(a) !== dayKey(b) ? ' (+1)' : '');
}
