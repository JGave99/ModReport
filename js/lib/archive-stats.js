// Statistiche dell'archivio locale (esportate, nessun accesso al DOM).
// Le voci hanno la data in createdAt (stringa ISO). Nessun testo dei referti finisce nelle statistiche o nel CSV.

/**
 * Determina il tipo di metodica da un nome esame.
 * @param {string|null|undefined} esame - Nome dell'esame.
 * @returns {string} 'RX', 'TC', 'RMN', 'Ecografia', 'Altro'.
 */
export function metodicaOf(esame) {
  if (!esame) return 'Altro';
  const e = esame.trim().toUpperCase();
  if (e.startsWith('RX')) return 'RX';
  if (e.startsWith('TC') || e.startsWith('ANGIO-TC')) return 'TC';
  if (e.startsWith('RMN') || e.startsWith('RM')) return 'RMN';
  if (e.startsWith('ECO') || e.startsWith('ECOGRAFIA') || e.startsWith('ECOCOLORDOPPLER')) return 'Ecografia';
  return 'Altro';
}

const monthKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

/**
 * Calcola le statistiche per un insieme di referti.
 * @param {Array<{esame: string|null, createdAt: string}>} entries - Referti.
 * @param {Date} now - Data corrente (opzionale).
 * @returns {Object} { totale, perMetodica, perEsame (primi 10), perMese (ultimi 12 mesi, dal più vecchio) }.
 */
export function computeStats(entries, now = new Date()) {
  const count = (keyOf) => {
    const map = new Map();
    entries.forEach((e) => { const k = keyOf(e); map.set(k, (map.get(k) || 0) + 1); });
    return [...map].map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n);
  };
  const perMese = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    perMese.push({ mese: monthKey(d), etichetta: d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }), n: 0 });
  }
  const byKey = new Map(perMese.map((m) => [m.mese, m]));
  entries.forEach((e) => { const m = byKey.get(monthKey(new Date(e.createdAt))); if (m) m.n += 1; });
  return {
    totale: entries.length,
    perMetodica: count((e) => metodicaOf(e.esame)),
    perEsame: count((e) => e.esame || 'Esame non specificato').slice(0, 10),
    perMese,
  };
}

/**
 * CSV per il libretto: una riga per mese, metodica ed esame (tutti i mesi presenti), separatore ';'.
 * @param {Array<{esame: string|null, createdAt: string}>} entries - Referti.
 * @returns {string} Contenuto CSV.
 */
export function statsCsv(entries) {
  const map = new Map();
  entries.forEach((e) => {
    const esame = e.esame || 'Esame non specificato';
    const key = [monthKey(new Date(e.createdAt)), metodicaOf(e.esame), esame].join('\u0000');
    map.set(key, (map.get(key) || 0) + 1);
  });
  const rows = [...map].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, n]) => [...key.split('\u0000').map(escapeCsvValue), String(n)].join(';'));
  return ['mese;metodica;esame;referti', ...rows].join('\n');
}

function escapeCsvValue(value) {
  const str = String(value);
  return /[;"\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}
