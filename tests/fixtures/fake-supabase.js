// Finto client Supabase in memoria, SOLO per i test (manuali ed e2e). Non usarlo in produzione.
// Va caricato dopo assets/vendor/supabase.js e prima dei moduli della pagina: sostituisce createClient.
// Stato persistito in sessionStorage ('fake-supabase-db') così sopravvive ai ricaricamenti di pagina.
(function () {
  const KEY = 'fake-supabase-db';
  const SESSION_KEY = 'fake-supabase-session';
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(16).slice(2));
  const now = () => new Date().toISOString();

  const DEFAULT_DB = {
    users: [{ id: '00000000-0000-4000-8000-000000000001', email: 'demo@modreport.test', password: 'password-demo-123', confirmed: true, user_metadata: { nome: 'Maria', cognome: 'Rossi' }, created_at: now() }],
    tables: { user_data: [], report_archive: [], letterheads: [], team_members: [], channels: [], messages: [], channel_reads: [], team_invites: [], app_admins: [], verification_requests: [] },
    storage: {},
  };
  const UNIQUE = { user_data: ['user_id'], channel_reads: ['user_id', 'channel_id'], team_members: ['user_id'], app_admins: ['user_id'] };

  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; } };
  const db = load() || JSON.parse(JSON.stringify(DEFAULT_DB));
  const save = () => sessionStorage.setItem(KEY, JSON.stringify(db));
  // failNext: { 'tabella:operazione': 'messaggio' } fa fallire la prossima chiamata. Per i guasti al caricamento
  // della pagina impostare prima sessionStorage['fake-supabase-fail'] con lo stesso formato (JSON).
  let pendingFails = {};
  try { pendingFails = JSON.parse(sessionStorage.getItem('fake-supabase-fail')) || {}; sessionStorage.removeItem('fake-supabase-fail'); } catch { pendingFails = {}; }
  window.__fakeSupabase = { db, save, reset() { sessionStorage.removeItem(KEY); sessionStorage.removeItem(SESSION_KEY); }, failNext: pendingFails };

  const err = (message, code) => ({ message, code });
  const listeners = new Set();
  const emit = (event, session) => listeners.forEach((cb) => setTimeout(() => cb(event, session), 0));
  const publicUser = (u) => u && ({ id: u.id, email: u.email, user_metadata: { ...u.user_metadata }, identities: [{ id: u.id }], created_at: u.created_at });
  const getSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } };
  const setSession = (user) => {
    const session = user ? { access_token: 'fake', user: publicUser(user) } : null;
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); else sessionStorage.removeItem(SESSION_KEY);
    return session;
  };
  const currentUser = () => { const s = getSession(); return s && db.users.find((u) => u.id === s.user.id); };

  function failure(table, op) {
    const f = window.__fakeSupabase.failNext[table + ':' + op];
    if (f) { delete window.__fakeSupabase.failNext[table + ':' + op]; return err(f, 'FAKE'); }
    return null;
  }

  class Query {
    constructor(table) { this.table = table; this.filters = []; this.op = 'select'; this.payload = null; this.single = null; this.orderBy = null; this.max = null; this.returning = false; this.opts = {}; }
    select(cols, opts) { if (this.op === 'select') this.opts = opts || {}; else this.returning = true; return this; }
    insert(p) { this.op = 'insert'; this.payload = p; return this; }
    update(p) { this.op = 'update'; this.payload = p; return this; }
    upsert(p, o) { this.op = 'upsert'; this.payload = p; this.upsertOpts = o || {}; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.filters.push((r) => String(r[c]) === String(v)); return this; }
    neq(c, v) { this.filters.push((r) => String(r[c]) !== String(v)); return this; }
    in(c, vs) { this.filters.push((r) => vs.map(String).includes(String(r[c]))); return this; }
    order(c, o) { this.orderBy = [c, !o || o.ascending !== false]; return this; }
    limit(n) { this.max = n; return this; }
    range(a, b) { this.rangeFrom = a; this.max = b - a + 1; return this; }
    maybeSingle() { this.single = 'maybe'; return this; }
    then(res, rej) { return Promise.resolve().then(() => this.exec()).then(res, rej); }
    rows() { return db.tables[this.table] || (db.tables[this.table] = []); }
    match(r) { return this.filters.every((f) => f(r)); }
    exec() {
      const fail = failure(this.table, this.op);
      if (fail) return { data: null, error: fail, count: null };
      let out;
      const rows = this.rows();
      if (this.op === 'select') {
        out = rows.filter((r) => this.match(r));
        if (this.opts.head) return { data: null, error: null, count: out.length };
      } else if (this.op === 'insert' || this.op === 'upsert') {
        const list = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p) => ({ id: uuid(), created_at: now(), ...JSON.parse(JSON.stringify(p)) }));
        out = [];
        for (const item of list) {
          const keys = UNIQUE[this.table];
          const existing = keys && rows.find((r) => keys.every((k) => String(r[k]) === String(item[k])));
          if (existing && this.op === 'insert') return { data: null, error: err('duplicate key value violates unique constraint', '23505') };
          if (existing) { Object.assign(existing, item, { id: existing.id }); out.push(existing); } else { rows.push(item); out.push(item); }
        }
        save();
      } else if (this.op === 'update') {
        out = rows.filter((r) => this.match(r));
        out.forEach((r) => Object.assign(r, JSON.parse(JSON.stringify(this.payload))));
        save();
      } else if (this.op === 'delete') {
        out = rows.filter((r) => this.match(r));
        db.tables[this.table] = rows.filter((r) => !this.match(r));
        save();
      }
      out = out.map((r) => JSON.parse(JSON.stringify(r)));
      if (this.orderBy) {
        const [c, asc] = this.orderBy;
        out.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
      }
      if (this.rangeFrom) out = out.slice(this.rangeFrom);
      if (this.max != null) out = out.slice(0, this.max);
      if (this.op !== 'select' && !this.returning) return { data: null, error: null };
      if (this.single === 'maybe') return { data: out[0] || null, error: null };
      return { data: out, error: null, count: out.length };
    }
  }

  const storageApi = (bucket) => ({
    async upload(path, file) {
      const key = bucket + '/' + path;
      if (db.storage[key]) return { data: null, error: err('The resource already exists', '409') };
      const buf = await file.arrayBuffer();
      db.storage[key] = { type: file.type || 'application/octet-stream', b64: btoa(String.fromCharCode(...new Uint8Array(buf))) };
      save();
      return { data: { path }, error: null };
    },
    async download(path) {
      const f = db.storage[bucket + '/' + path];
      if (!f) return { data: null, error: err('Object not found', '404') };
      const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
      return { data: new Blob([bytes], { type: f.type }), error: null };
    },
    async remove(paths) { paths.forEach((p) => delete db.storage[bucket + '/' + p]); save(); return { data: paths.map((name) => ({ name })), error: null }; },
    async list(prefix) {
      const base = bucket + '/' + (prefix ? prefix + '/' : '');
      return { data: Object.keys(db.storage).filter((k) => k.startsWith(base)).map((k) => ({ name: k.slice(base.length) })), error: null };
    },
    async createSignedUrl(path) {
      const r = await this.download(path);
      return r.error ? r : { data: { signedUrl: URL.createObjectURL(r.data) }, error: null };
    },
  });

  const rpcHandlers = {
    update_my_display_name: () => ({ data: null, error: null }),
    delete_my_account: () => {
      const u = currentUser();
      if (!u) return { data: null, error: err('Not authenticated', '401') };
      Object.keys(db.tables).forEach((t) => { db.tables[t] = db.tables[t].filter((r) => r.user_id !== u.id); });
      db.users = db.users.filter((x) => x.id !== u.id);
      save();
      return { data: null, error: null };
    },
  };
  window.__fakeSupabase.rpcHandlers = rpcHandlers;

  function createClient() {
    return {
      auth: {
        async getSession() { return { data: { session: getSession() }, error: null }; },
        async getUser() { const u = currentUser(); return { data: { user: publicUser(u) }, error: u ? null : err('no user', 'session_not_found') }; },
        onAuthStateChange(cb) { listeners.add(cb); return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }; },
        async signInWithPassword({ email, password }) {
          const u = db.users.find((x) => x.email === email && x.password === password);
          if (!u) return { data: { user: null, session: null }, error: err('Invalid login credentials', 'invalid_credentials') };
          if (!u.confirmed) return { data: { user: null, session: null }, error: err('Email not confirmed', 'email_not_confirmed') };
          const session = setSession(u); emit('SIGNED_IN', session);
          return { data: { user: publicUser(u), session }, error: null };
        },
        async signUp({ email, password }) {
          const existing = db.users.find((x) => x.email === email);
          if (existing) return { data: { user: { ...publicUser(existing), identities: [] }, session: null }, error: null };
          const u = { id: uuid(), email, password, confirmed: false, user_metadata: {}, created_at: now() };
          db.users.push(u); save();
          return { data: { user: publicUser(u), session: null }, error: null };
        },
        async signOut() { setSession(null); emit('SIGNED_OUT', null); return { error: null }; },
        async resetPasswordForEmail() { return { data: {}, error: null }; },
        async resend() { return { data: {}, error: null }; },
        async updateUser(attrs) {
          const u = currentUser();
          if (!u) return { data: { user: null }, error: err('Auth session missing!', 'session_not_found') };
          if (attrs.password) u.password = attrs.password;
          if (attrs.data) u.user_metadata = { ...u.user_metadata, ...attrs.data };
          save(); setSession(u);
          return { data: { user: publicUser(u) }, error: null };
        },
      },
      from: (t) => new Query(t),
      storage: { from: storageApi },
      async rpc(name, args) { const h = rpcHandlers[name]; return h ? h(args || {}) : { data: null, error: err('function ' + name + ' does not exist', '42883') }; },
      channel() { const ch = { on() { return ch; }, subscribe() { return ch; } }; return ch; },
      removeChannel() {},
      functions: { async invoke() { return { data: null, error: err('Edge functions non disponibili nel finto backend', 'FAKE') }; } },
    };
  }

  window.supabase = { createClient };
})();
