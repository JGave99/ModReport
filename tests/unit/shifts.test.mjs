import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIcs, icsFold, icsEscape, icsDate } from '../../js/lib/ics.js';
import { DEFAULT_TIPI, mergeTipi, colorFor, shiftTimes, monthGrid, shiftsByDay, repeatWeekly, copyWeek, weekStart, dayKey, formatRange, parseDay } from '../../js/lib/shifts.js';

test('turni: orari locali, fine il giorno dopo per la notte, ferie tutto il giorno', () => {
  const n = shiftTimes('2026-10-24', '20:00', '08:00');
  assert.equal(new Date(n.starts_at).getTime(), new Date(2026, 9, 24, 20, 0).getTime());
  assert.equal(new Date(n.ends_at).getTime(), new Date(2026, 9, 25, 8, 0).getTime());
  assert.equal(formatRange(n), '20:00–08:00 (+1)');
  const f = shiftTimes('2026-10-24', '00:00', '00:00');
  assert.equal(formatRange(f), 'tutto il giorno');
  assert.throws(() => shiftTimes('2026-10-24', '25:00', '08:00'), /Orario/);
});

test('calendario: settimane da lunedì, giorni del mese tutti presenti', () => {
  const weeks = monthGrid(2026, 9); // ottobre 2026: inizia di giovedì
  assert.ok(weeks.every((w) => w.length === 7 && w[0].getDay() === 1));
  const days = weeks.flat().map(dayKey);
  assert.ok(days.includes('2026-10-01') && days.includes('2026-10-31'));
  assert.equal(dayKey(weekStart(parseDay('2026-10-25'))), '2026-10-19');
});

test('ripetizione settimanale e copia della settimana (anche col cambio dell\'ora legale)', () => {
  const base = { tipo: 'Mattina', ...shiftTimes('2026-10-19', '08:00', '14:00') };
  const rep = repeatWeekly(base, 2);
  assert.deepEqual(rep.map((s) => dayKey(new Date(s.starts_at))), ['2026-10-26', '2026-11-02']);
  assert.ok(rep.every((s) => new Date(s.starts_at).getHours() === 8), 'stesso orario locale dopo il 25/10');
  const copied = copyWeek([base, { tipo: 'Fuori', ...shiftTimes('2026-10-27', '08:00', '14:00') }], parseDay('2026-10-19'));
  assert.deepEqual(copied.map((s) => s.tipo), ['Mattina']);
  const byDay = shiftsByDay([...rep, base]);
  assert.equal(byDay.get('2026-10-19').length, 1);
});

test('tipi: quelli del team prevalgono, colori validi', () => {
  const tipi = mergeTipi([{ nome: 'notte', colore: '#123456', inizio: '21:00', fine: '07:00' }, { nome: 'Ecografie', colore: 'rosso' }]);
  const notte = tipi.find((t) => t.nome === 'notte');
  assert.deepEqual([notte.colore, notte.inizio], ['#123456', '21:00']);
  assert.match(tipi.find((t) => t.nome === 'Ecografie').colore, /^#[0-9a-f]{6}$/i);
  assert.equal(tipi.length, DEFAULT_TIPI.length + 1);
  assert.equal(colorFor('Mattina'), '#0ea5e9');
});

test('ics: eventi in UTC, testi protetti, righe spezzate a 75 byte', () => {
  const ics = buildIcs([{ id: 'abc', starts_at: '2026-10-24T18:00:00Z', ends_at: '2026-10-25T06:00:00Z', tipo: 'Notte', sede: 'PS; TC, piano 2', note: 'Riga 1\nRiga 2' }], { now: new Date('2026-10-23T10:00:00Z') });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART:20261024T180000Z\r\nDTEND:20261025T060000Z'));
  assert.ok(ics.includes('SUMMARY:Notte · PS\\; TC\\, piano 2'));
  assert.ok(ics.includes('DESCRIPTION:Riga 1\\nRiga 2'));
  assert.equal(icsEscape('a\\b'), 'a\\\\b');
  assert.equal(icsDate('2026-01-02T03:04:05Z'), '20260102T030405Z');
  const long = icsFold('DESCRIPTION:' + 'è'.repeat(80));
  assert.ok(long.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75));
  assert.equal(long.split('\r\n ').join(''), 'DESCRIPTION:' + 'è'.repeat(80));
});

test('la funzione del server usa la stessa copia di ics.js', () => {
  const a = readFileSync(new URL('../../js/lib/ics.js', import.meta.url), 'utf8');
  const b = readFileSync(new URL('../../supabase/functions/_shared/ics.js', import.meta.url), 'utf8');
  assert.equal(b, a, 'aggiorna supabase/functions/_shared/ics.js (cp js/lib/ics.js supabase/functions/_shared/)');
});
