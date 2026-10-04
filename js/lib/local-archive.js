// Archivio dei referti SOLO su questo computer (IndexedDB del browser): i testi dei referti,
// che possono contenere dati sanitari, non vengono più inviati al cloud.
const DB_NAME = 'modreport';
const STORE = 'archive';
const MAX_TEXT = 20000;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('Archivio locale non supportato da questo browser.')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('byUser', ['userId', 'createdAt']);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Archivio locale non disponibile.'));
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then((r) => { result = r; });
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error || new Error('Operazione annullata')); };
  });
}

const reqToPromise = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

export async function addEntry(userId, { esame = null, testo, createdAt = null, id = null }) {
  const clean = String(testo || '').trim();
  if (!clean) throw new Error('Il referto è vuoto.');
  if (clean.length > MAX_TEXT) throw new Error('Il referto è troppo lungo (massimo 20.000 caratteri).');
  const entry = { id: id || newId(), userId, esame: esame || null, testo: clean, createdAt: createdAt || new Date().toISOString() };
  await tx('readwrite', (store) => reqToPromise(store.put(entry)));
  return entry;
}

export async function listEntries(userId) {
  const rows = await tx('readonly', (store) => reqToPromise(store.index('byUser').getAll(IDBKeyRange.bound([userId, ''], [userId, '￿']))));
  return (rows || []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteEntry(userId, id) {
  await tx('readwrite', async (store) => {
    const entry = await reqToPromise(store.get(id));
    if (entry && entry.userId === userId) await reqToPromise(store.delete(id));
  });
}

export async function clearEntries(userId) {
  const rows = await listEntries(userId);
  await tx('readwrite', (store) => Promise.all(rows.map((r) => reqToPromise(store.delete(r.id)))));
}

// Copia di sicurezza (file JSON scaricabile) e ripristino, anche per spostarsi su un altro computer.
export async function exportEntries(userId) {
  const entries = await listEntries(userId);
  return JSON.stringify({ app: 'ModReport', kind: 'archivio', version: 1, exportedAt: new Date().toISOString(),
    entries: entries.map(({ esame, testo, createdAt, id }) => ({ id, esame, testo, createdAt })) }, null, 2);
}

export async function importEntries(userId, json) {
  let parsed;
  try { parsed = JSON.parse(json); } catch { throw new Error('Il file non è un archivio ModReport valido.'); }
  if (!parsed || parsed.kind !== 'archivio' || !Array.isArray(parsed.entries)) throw new Error('Il file non è un archivio ModReport valido.');
  let added = 0;
  for (const e of parsed.entries) {
    if (!e || typeof e.testo !== 'string' || !e.testo.trim()) continue;
    await addEntry(userId, { id: e.id || null, esame: e.esame, testo: e.testo, createdAt: e.createdAt });
    added++;
  }
  return added;
}
