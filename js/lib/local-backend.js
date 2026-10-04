// Modalità locale: un "client" con la stessa interfaccia (ridotta) di Supabase che salva tutto
// nel browser (IndexedDB). Serve per provare ModReport senza account e come edizione "solo locale"
// per le strutture che non possono usare servizi cloud. Niente team, niente sincronizzazione.

const MODE_KEY = 'mr-mode';
const DB_NAME = 'modreport-local';
const LOCAL_USER_ID = '00000000-0000-4000-8000-00000000c0de';

export function isLocalMode() {
  try { return localStorage.getItem(MODE_KEY) === 'local'; } catch { return false; }
}
export function setLocalMode(on) {
  try { if (on) localStorage.setItem(MODE_KEY, 'local'); else localStorage.removeItem(MODE_KEY); } catch { /* ignora */ }
}

// ---------------- persistenza ----------------
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const r = db.transaction('kv').objectStore('kv').get(key);
    r.onsuccess = () => { db.close(); resolve(r.result); };
    r.onerror = () => { db.close(); reject(r.error); };
  });
}
async function idbSet(key, value) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const t = db.transaction('kv', 'readwrite');
    t.objectStore('kv').put(value, key);
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

const EMPTY_STATE = () => ({ profile: { nome: '', cognome: '' }, tables: { user_data: [], letterheads: [], profiles: [], report_archive: [] }, files: {} });
let state = null;
let loading = null;
let saveTimer = null;
const ready = () => (loading = loading || idbGet('state').then((s) => { state = s || EMPTY_STATE(); }));
const persist = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { idbSet('state', state).catch(() => { /* spazio esaurito o non disponibile */ }); }, 150);
};
export async function clearLocalData() {
  await ready();
  state = EMPTY_STATE();
  await idbSet('state', state);
}

// ---------------- query in memoria ----------------
const err = (message, code) => ({ message, code });
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const now = () => new Date().toISOString();
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const UNIQUE = { user_data: ['user_id'], profiles: ['id'] };

class Query {
  constructor(table) { Object.assign(this, { table, filters: [], op: 'select', payload: null, single: false, orderBy: null, max: null, returning: false, opts: {} }); }
  select(cols, opts) { if (this.op === 'select') this.opts = opts || {}; else this.returning = true; return this; }
  insert(p) { this.op = 'insert'; this.payload = p; return this; }
  update(p) { this.op = 'update'; this.payload = p; return this; }
  upsert(p) { this.op = 'upsert'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.filters.push((r) => String(r[c]) === String(v)); return this; }
  neq(c, v) { this.filters.push((r) => String(r[c]) !== String(v)); return this; }
  in(c, vs) { this.filters.push((r) => vs.map(String).includes(String(r[c]))); return this; }
  order(c, o) { this.orderBy = [c, !o || o.ascending !== false]; return this; }
  limit(n) { this.max = n; return this; }
  maybeSingle() { this.single = true; return this; }
  then(res, rej) { return ready().then(() => this.exec()).then(res, rej); }
  exec() {
    const rows = state.tables[this.table] || (state.tables[this.table] = []);
    const match = (r) => this.filters.every((f) => f(r));
    let out;
    if (this.op === 'select') {
      out = rows.filter(match);
      if (this.opts.head) return { data: null, error: null, count: out.length };
    } else if (this.op === 'insert' || this.op === 'upsert') {
      out = [];
      for (const p of (Array.isArray(this.payload) ? this.payload : [this.payload])) {
        const item = { id: newId(), created_at: now(), ...clone(p) };
        const keys = UNIQUE[this.table];
        const existing = keys && rows.find((r) => keys.every((k) => String(r[k]) === String(item[k])));
        if (existing && this.op === 'insert') return { data: null, error: err('duplicate key value violates unique constraint', '23505') };
        if (existing) { Object.assign(existing, item, { id: existing.id }); out.push(existing); } else { rows.push(item); out.push(item); }
      }
      persist();
    } else if (this.op === 'update') {
      out = rows.filter(match);
      out.forEach((r) => Object.assign(r, clone(this.payload)));
      persist();
    } else {
      out = rows.filter(match);
      state.tables[this.table] = rows.filter((r) => !match(r));
      persist();
    }
    out = clone(out);
    if (this.orderBy) {
      const [c, asc] = this.orderBy;
      out.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
    }
    if (this.max != null) out = out.slice(0, this.max);
    if (this.op !== 'select' && !this.returning) return { data: null, error: null };
    return this.single ? { data: out[0] || null, error: null } : { data: out, error: null, count: out.length };
  }
}

// ---------------- client ----------------
function localUser() {
  return { id: LOCAL_USER_ID, email: 'questo computer', user_metadata: { ...state.profile }, identities: [{ id: LOCAL_USER_ID }] };
}

export function createLocalClient() {
  const notAvailable = () => ({ data: null, error: err('Non disponibile in modalità locale: serve un account.', 'local_mode') });
  return {
    isLocal: true,
    auth: {
      async getSession() { await ready(); return { data: { session: { access_token: 'local', user: localUser() } }, error: null }; },
      async getUser() { await ready(); return { data: { user: localUser() }, error: null }; },
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      async signOut() { return { error: null }; },
      async updateUser(attrs) {
        await ready();
        if (attrs.data) { Object.assign(state.profile, attrs.data); persist(); }
        if (attrs.password) return { data: { user: null }, ...notAvailable() };
        return { data: { user: localUser() }, error: null };
      },
      async signInWithPassword() { return { data: { user: null, session: null }, ...notAvailable() }; },
      async signUp() { return { data: { user: null, session: null }, ...notAvailable() }; },
      async resetPasswordForEmail() { return notAvailable(); },
      async resend() { return notAvailable(); },
      mfa: {
        async getAuthenticatorAssuranceLevel() { return { data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }; },
        async listFactors() { return { data: { all: [], totp: [] }, error: null }; },
        enroll: notAvailable, challenge: notAvailable, verify: notAvailable, challengeAndVerify: notAvailable, unenroll: notAvailable,
      },
    },
    from: (table) => new Query(table),
    storage: {
      from(bucket) {
        const key = (p) => bucket + '/' + p;
        return {
          async upload(path, file) { await ready(); state.files[key(path)] = file instanceof Blob ? file : new Blob([file]); persist(); return { data: { path }, error: null }; },
          async download(path) { await ready(); const f = state.files[key(path)]; return f ? { data: f, error: null } : { data: null, error: err('File non trovato', '404') }; },
          async remove(paths) { await ready(); paths.forEach((p) => delete state.files[key(p)]); persist(); return { data: paths.map((name) => ({ name })), error: null }; },
          async list(prefix) {
            await ready();
            const base = key(prefix ? prefix + '/' : '');
            return { data: Object.keys(state.files).filter((k) => k.startsWith(base)).map((k) => ({ name: k.slice(base.length) })), error: null };
          },
          async createSignedUrl(path) { const r = await this.download(path); return r.error ? r : { data: { signedUrl: URL.createObjectURL(r.data) }, error: null }; },
        };
      },
    },
    async rpc(name) {
      if (name === 'update_my_display_name' || name === 'accept_terms') return { data: null, error: null };
      if (name === 'delete_my_account') { await clearLocalData(); return { data: null, error: null }; }
      return notAvailable();
    },
    channel() { const ch = { on() { return ch; }, subscribe() { return ch; } }; return ch; },
    removeChannel() {},
    functions: { async invoke() { return notAvailable(); } },
  };
}
