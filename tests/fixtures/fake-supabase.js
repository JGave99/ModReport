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
    tables: { user_data: [], report_archive: [], letterheads: [], profiles: [], teams: [], team_members: [], channels: [], messages: [], channel_reads: [], team_invites: [], app_admins: [], verification_requests: [] },
    storage: {},
  };
  const UNIQUE = { user_data: ['user_id'], channel_reads: ['user_id', 'channel_id'], team_members: ['team_id', 'user_id'], app_admins: ['user_id'], profiles: ['id'] };

  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; } };
  const db = load() || JSON.parse(JSON.stringify(DEFAULT_DB));
  Object.keys(DEFAULT_DB.tables).forEach((t) => { if (!db.tables[t]) db.tables[t] = []; });
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
  const setSession = (user, aal = 'aal1') => {
    const session = user ? { access_token: 'fake', aal, user: publicUser(user) } : null;
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
        for (const item of list) {
          const hookError = BEFORE_INSERT[this.table] && BEFORE_INSERT[this.table](item);
          if (hookError) return { data: null, error: hookError };
        }
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

  // Emulazione dei trigger del server (supabase/migrations/…_security.sql).
  const displayName = (u) => {
    const p = db.tables.profiles.find((x) => x.id === u.id) || {};
    const n = [p.nome || u.user_metadata.nome, p.cognome || u.user_metadata.cognome].filter(Boolean).join(' ');
    return n || u.email.split('@')[0];
  };
  const BEFORE_INSERT = {
    messages(m) {
      const u = currentUser();
      const ch = db.tables.channels.find((c) => c.id === m.channel_id);
      const member = ch && db.tables.team_members.find((x) => x.team_id === ch.team_id && x.user_id === u.id);
      if (!member) return err('Non fai parte di questo team', '42501');
      m.user_id = u.id; m.nome_mittente = member.nome; m.created_at = now(); m.testo = String(m.testo || '').trim();
      return null;
    },
    channels(c) {
      c.created_by = currentUser().id; c.created_at = now();
      c.nome = String(c.nome || '').trim().toLowerCase().replace(/\s+/g, '-').slice(0, 60);
      return null;
    },
  };
  const memberOf = (team, uid) => db.tables.team_members.find((m) => m.team_id === team && m.user_id === uid);
  const ok = (data) => { save(); return { data, error: null }; };

  const rpcHandlers = {
    create_team({ p_nome }) {
      const u = currentUser(); const id = uuid();
      db.tables.teams.push({ id, nome: String(p_nome).trim().slice(0, 80), created_by: u.id, created_at: now() });
      db.tables.team_members.push({ team_id: id, user_id: u.id, nome: displayName(u), role: 'owner', joined_at: now() });
      db.tables.channels.push({ id: uuid(), team_id: id, nome: 'generale', created_by: u.id, created_at: now() });
      return ok(id);
    },
    create_team_invite({ p_team, p_max_uses = 10, p_valid_days = 7 }) {
      const m = memberOf(p_team, currentUser().id);
      if (!m || !['owner', 'admin'].includes(m.role)) return { data: null, error: err('Solo gli amministratori del team possono invitare', '42501') };
      const code = uuid().replace(/-/g, '');
      db.tables.team_invites.push({ code, team_id: p_team, created_by: m.user_id, created_at: now(), expires_at: new Date(Date.now() + p_valid_days * 864e5).toISOString(), max_uses: p_max_uses, uses: 0, revoked_at: null });
      return ok(code);
    },
    revoke_team_invite({ p_code }) {
      const inv = db.tables.team_invites.find((i) => i.code === p_code);
      if (inv) inv.revoked_at = now();
      return ok(null);
    },
    join_team_with_code({ invite_code }) {
      const u = currentUser();
      const inv = db.tables.team_invites.find((i) => i.code === String(invite_code).trim());
      if (!inv || inv.revoked_at) return ok('invalid');
      if (memberOf(inv.team_id, u.id)) return ok(inv.team_id);
      if (new Date(inv.expires_at) < new Date() || inv.uses >= inv.max_uses) return ok('expired');
      db.tables.team_members.push({ team_id: inv.team_id, user_id: u.id, nome: displayName(u), role: 'member', joined_at: now() });
      inv.uses += 1;
      return ok(inv.team_id);
    },
    remove_team_member({ p_team, p_user }) {
      db.tables.team_members = db.tables.team_members.filter((m) => !(m.team_id === p_team && m.user_id === p_user));
      return ok(null);
    },
    leave_team({ p_team }) {
      const u = currentUser(); const m = memberOf(p_team, u.id);
      const others = db.tables.team_members.filter((x) => x.team_id === p_team && x.user_id !== u.id);
      if (m && m.role === 'owner' && others.length) return { data: null, error: err('Prima di uscire trasferisci la proprietà del team a un altro membro', '42501') };
      db.tables.team_members = db.tables.team_members.filter((x) => !(x.team_id === p_team && x.user_id === u.id));
      if (!others.length) db.tables.teams = db.tables.teams.filter((t) => t.id !== p_team);
      return ok(null);
    },
    set_team_member_role({ p_team, p_user, p_role }) {
      const u = currentUser();
      if (p_role === 'owner') memberOf(p_team, u.id).role = 'admin';
      memberOf(p_team, p_user).role = p_role;
      return ok(null);
    },
    my_channels_last_message() {
      const u = currentUser();
      const teams = db.tables.team_members.filter((m) => m.user_id === u.id).map((m) => m.team_id);
      return { data: db.tables.channels.filter((c) => teams.includes(c.team_id)).map((c) => ({
        channel_id: c.id,
        last_at: db.tables.messages.filter((x) => x.channel_id === c.id).map((x) => x.created_at).sort().pop() || null,
      })), error: null };
    },
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
        mfa: {
          async getAuthenticatorAssuranceLevel() {
            const u = currentUser(); const s = getSession();
            const verified = u && (u.factors || []).some((f) => f.status === 'verified');
            return { data: { currentLevel: (s && s.aal) || 'aal1', nextLevel: verified ? 'aal2' : 'aal1' }, error: null };
          },
          async listFactors() {
            const u = currentUser(); const all = (u && u.factors) || [];
            return { data: { all, totp: all.filter((f) => f.factor_type === 'totp') }, error: null };
          },
          async enroll() {
            const u = currentUser();
            const f = { id: uuid(), factor_type: 'totp', status: 'unverified', friendly_name: 'App' };
            u.factors = (u.factors || []).concat(f); save();
            return { data: { id: f.id, type: 'totp', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="white"/><text x="10" y="64" font-size="14">QR di prova</text></svg>', secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/ModReport' } }, error: null };
          },
          async challenge() { return { data: { id: uuid() }, error: null }; },
          async verify({ factorId, code }) {
            const u = currentUser(); const f = u && (u.factors || []).find((x) => x.id === factorId);
            if (!f || code !== '123456') return { data: null, error: err('Invalid TOTP code entered', 'mfa_verification_failed') };
            f.status = 'verified'; save(); setSession(u, 'aal2');
            return { data: { access_token: 'fake' }, error: null };
          },
          async challengeAndVerify(args) { return this.verify(args); },
          async unenroll({ factorId }) {
            const u = currentUser(); u.factors = (u.factors || []).filter((x) => x.id !== factorId); save();
            return { data: { id: factorId }, error: null };
          },
        },
        async updateUser(attrs) {
          const u = currentUser();
          if (!u) return { data: { user: null }, error: err('Auth session missing!', 'session_not_found') };
          if (attrs.password) u.password = attrs.password;
          if (attrs.data) u.user_metadata = { ...u.user_metadata, ...attrs.data };
          save(); setSession(u, (getSession() || {}).aal || 'aal1');
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
