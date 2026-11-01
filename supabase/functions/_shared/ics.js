// Calendario iCalendar (.ics, RFC 5545) dei turni: lo usano "Scarica .ics" nella pagina Account e la funzione
// del server per Google Calendar (supabase/functions/turni-ics; copia identica in supabase/functions/_shared/ics.js,
// controllata dai test). Nessuna dipendenza: funziona nel browser e in Deno.

const pad = (n) => String(n).padStart(2, '0');

// Data e ora in UTC nel formato iCalendar (20261024T060000Z).
export function icsDate(value) {
  const d = new Date(value);
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T'
    + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
}

export function icsEscape(text) {
  return String(text == null ? '' : text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Le righe lunghe vanno spezzate a 75 byte (UTF-8), continuando con uno spazio.
export function icsFold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = enc.encode(ch).length;
    if (size + len > (parts.length ? 74 : 75)) { parts.push(current); current = ''; size = 0; }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

// shifts: [{ id, starts_at, ends_at, tipo, sede, note, updated_at }]
export function buildIcs(shifts, { name = 'Turni ModReport', now = new Date() } = {}) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ModReport//Turni//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + icsEscape(name), 'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
  ];
  for (const s of shifts || []) {
    const summary = s.sede ? s.tipo + ' · ' + s.sede : s.tipo;
    lines.push('BEGIN:VEVENT', 'UID:' + s.id + '@modreport', 'DTSTAMP:' + icsDate(now));
    if (s.updated_at) lines.push('LAST-MODIFIED:' + icsDate(s.updated_at));
    lines.push('DTSTART:' + icsDate(s.starts_at), 'DTEND:' + icsDate(s.ends_at), 'SUMMARY:' + icsEscape(summary));
    if (s.sede) lines.push('LOCATION:' + icsEscape(s.sede));
    if (s.note) lines.push('DESCRIPTION:' + icsEscape(s.note));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
