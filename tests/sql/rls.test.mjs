// Test delle migrazioni e delle regole di accesso (RLS) su un Postgres in memoria (PGlite).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const migrations = readdirSync(new URL('supabase/migrations/', root)).filter((f) => f.endsWith('.sql')).sort();

const A = 'a0000000-0000-4000-8000-00000000000a';
const B = 'b0000000-0000-4000-8000-00000000000b';
const C = 'c0000000-0000-4000-8000-00000000000c';
const X = 'f0000000-0000-4000-8000-00000000000f'; // amministratore del sito

let db;
const q = async (sql, params) => (await db.query(sql, params)).rows;

async function as(user, fn, { aal = 'aal1' } = {}) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims', $1, false)", [user ? JSON.stringify({ sub: user, role: 'authenticated', aal }) : '']);
  await db.exec(user ? 'set role authenticated' : 'set role anon');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

before(async () => {
  db = new PGlite();
  await db.exec(read('supabase/tests/supabase-shim.sql'));
  const [baseline, ...rest] = migrations;
  await db.exec(read('supabase/migrations/' + baseline));
  // Utenti e dati "legacy" come in produzione prima della migrazione dei team.
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'anna@ospedale.it', '{"nome":"Anna","cognome":"Bianchi"}'),
      ('${B}', 'bruno@ospedale.it', '{"nome":"Bruno","cognome":"Verdi"}'),
      ('${C}', 'carla@studio.it', '{}'),
      ('${X}', 'admin@modreport.it', '{}');
    insert into public.team_members (user_id, nome, role, joined_at) values
      ('${B}', 'Bruno Verdi', 'member', now() - interval '1 day'),
      ('${A}', 'Anna Bianchi', 'admin', now() - interval '2 days');
    insert into public.channels (id, nome, created_by) values ('11111111-1111-4111-8111-111111111111', 'generale', '${A}');
    insert into public.messages (channel_id, user_id, nome_mittente, testo) values ('11111111-1111-4111-8111-111111111111', '${A}', 'Anna Bianchi', 'ciao');
    insert into public.team_invites (code, created_by) values ('vecchiocodice123', '${A}');
  `);
  for (const m of rest) await db.exec(read('supabase/migrations/' + m));
  await db.exec(`insert into public.app_admins (user_id) values ('${X}');`);
});

test('migrazione: i dati del team unico finiscono in "Team ModReport" e i vecchi inviti scadono', async () => {
  const [team] = await q("select id, nome, created_by from public.teams");
  assert.equal(team.nome, 'Team ModReport');
  assert.equal(team.created_by, A);
  const members = await q('select user_id, role from public.team_members order by role');
  assert.deepEqual(members.map((m) => [m.user_id, m.role]), [[B, 'member'], [A, 'owner']]);
  const [ch] = await q('select team_id from public.channels');
  assert.equal(ch.team_id, team.id);
  const [inv] = await q('select expires_at <= now() as expired from public.team_invites');
  assert.equal(inv.expired, true);
  const profiles = await q('select id, nome from public.profiles order by nome nulls last');
  assert.equal(profiles.length, 4);
});

test('anon non può leggere né scrivere nulla', async () => {
  await as(null, async () => {
    await assert.rejects(q('select * from public.user_data'), /permission denied/);
    await assert.rejects(q('select * from public.teams'), /permission denied/);
    await assert.rejects(q('select public.list_app_users()'), /permission denied/);
  });
});

test('user_data: ognuno legge e modifica solo la propria libreria', async () => {
  await as(A, () => q(`insert into public.user_data (user_id, data) values ('${A}', '{"x":1}')`));
  await as(B, async () => {
    assert.equal((await q('select * from public.user_data')).length, 0);
    const upd = await q(`update public.user_data set data = '{"x":2}' where user_id = '${A}' returning *`);
    assert.equal(upd.length, 0);
    await assert.rejects(q(`insert into public.user_data (user_id, data) values ('${A}', '{}')`), /row-level security|duplicate/);
    await q(`insert into public.user_data (user_id, data) values ('${B}', '{"mia":true}')`);
  });
  await as(A, async () => {
    const rows = await q('select data from public.user_data');
    assert.deepEqual(rows.map((r) => r.data), [{ x: 1 }]);
    await assert.rejects(q(`update public.user_data set user_id = '${B}' where user_id = '${A}'`), /row-level security|duplicate/);
  });
});

test('archivio e carte intestate isolati; percorso del file nella propria cartella', async () => {
  await as(A, async () => {
    await q(`insert into public.report_archive (user_id, testo) values ('${A}', 'referto A')`);
    await q(`insert into public.letterheads (user_id, nome, storage_path) values ('${A}', 'Studio', '${A}/carta.pdf')`);
    await assert.rejects(q(`insert into public.letterheads (user_id, nome, storage_path) values ('${A}', 'Furbo', '${B}/carta.pdf')`), /row-level security/);
  });
  await as(B, async () => {
    assert.equal((await q('select * from public.report_archive')).length, 0);
    assert.equal((await q('select * from public.letterheads')).length, 0);
    assert.equal((await q(`delete from public.report_archive returning id`)).length, 0);
  });
});

test('amministrazione: solo gli admin del sito vedono gli utenti', async () => {
  await as(A, async () => {
    await assert.rejects(q('select * from public.list_app_users()'), /Permesso negato/);
    assert.equal((await q('select * from public.app_admins')).length, 0);
    await assert.rejects(q(`insert into public.app_admins (user_id) values ('${A}')`), /row-level security|permission/);
  });
  await as(X, async () => {
    const users = await q('select * from public.list_app_users()');
    assert.equal(users.length, 4);
    assert.equal(users.find((u) => u.id === X).is_admin, true);
  });
});

test('verifiche: stato sempre "in attesa" all\'invio, approva solo l\'admin, revisore dal server', async () => {
  const [req] = await as(C, () => q(`insert into public.verification_requests (user_id, storage_path, status, note_admin) values ('${C}', '${C}/doc.pdf', 'approvato', 'ok') returning id, status, email, note_admin`));
  assert.equal(req.status, 'in_attesa');
  assert.equal(req.email, 'carla@studio.it');
  assert.equal(req.note_admin, null);
  await as(C, async () => {
    const upd = await q(`update public.verification_requests set status = 'approvato' where id = '${req.id}' returning id`);
    assert.equal(upd.length, 0);
    await assert.rejects(q(`insert into public.verification_requests (user_id, storage_path) values ('${C}', '${A}/doc.pdf')`), /Percorso/);
  });
  await as(A, async () => assert.equal((await q('select * from public.verification_requests')).length, 0));
  await as(X, async () => {
    const [r] = await q(`update public.verification_requests set status = 'approvato', reviewed_by = '${A}' where id = '${req.id}' returning status, reviewed_by`);
    assert.equal(r.status, 'approvato');
    assert.equal(r.reviewed_by, X);
  });
});

let teamC;
test('team: chi crea è proprietario; membri, canali e messaggi visibili solo ai membri', async () => {
  [{ create_team: teamC }] = await as(C, () => q("select public.create_team('Studio Carla')"));
  await as(C, async () => {
    const [m] = await q(`select role, nome from public.team_members where team_id = '${teamC}'`);
    assert.equal(m.role, 'owner');
    assert.equal(m.nome, 'carla');
    assert.equal((await q(`select nome from public.channels where team_id = '${teamC}'`))[0].nome, 'generale');
  });
  await as(B, async () => {
    assert.equal((await q(`select * from public.teams where id = '${teamC}'`)).length, 0);
    assert.equal((await q(`select * from public.channels where team_id = '${teamC}'`)).length, 0);
    await assert.rejects(q(`insert into public.team_members (team_id, user_id, role) values ('${teamC}', '${B}', 'owner')`), /row-level security|permission/);
  });
});

test('inviti: solo gli admin; scadenza, limite di usi e revoca', async () => {
  await as(B, () => assert.rejects(q(`select public.create_team_invite('${teamC}')`), /Solo gli amministratori/));
  const [{ create_team_invite: code }] = await as(C, () => q(`select public.create_team_invite('${teamC}', 1, 7)`));
  assert.match(code, /^[0-9a-f]{32}$/);
  assert.equal((await as(B, () => q(`select public.join_team_with_code('${code}')`)))[0].join_team_with_code, teamC);
  assert.equal((await as(A, () => q(`select public.join_team_with_code('${code}')`)))[0].join_team_with_code, 'expired');
  assert.equal((await as(A, () => q("select public.join_team_with_code('codicefalso')")))[0].join_team_with_code, 'invalid');
  const [{ create_team_invite: code2 }] = await as(C, () => q(`select public.create_team_invite('${teamC}')`));
  await as(C, () => q(`select public.revoke_team_invite('${code2}')`));
  assert.equal((await as(A, () => q(`select public.join_team_with_code('${code2}')`)))[0].join_team_with_code, 'invalid');
  await as(B, async () => assert.equal((await q('select * from public.team_invites')).length, 0));
});

test('messaggi: il mittente lo decide il server, niente messaggi in team altrui', async () => {
  const [{ id: chC }] = await as(C, () => q(`select id from public.channels where team_id = '${teamC}'`));
  const [msg] = await as(B, () => q(`insert into public.messages (channel_id, user_id, nome_mittente, testo, created_at) values ('${chC}', '${C}', 'Primario', ' ciao ', '2020-01-01') returning user_id, nome_mittente, testo, created_at > now() - interval '1 minute' as fresh`));
  assert.equal(msg.user_id, B);
  assert.equal(msg.nome_mittente, 'Bruno Verdi');
  assert.equal(msg.testo, 'ciao');
  assert.equal(msg.fresh, true);
  await as(A, () => assert.rejects(q(`insert into public.messages (channel_id, testo) values ('${chC}', 'intruso')`), /row-level security|Non fai parte/));
  await as(B, () => assert.rejects(q(`insert into public.messages (channel_id, testo) values ('${chC}', '${'x'.repeat(4001)}')`), /check constraint/));
});

test('membri: l\'admin non rimuove il proprietario; il proprietario non esce lasciando il team', async () => {
  await as(B, () => assert.rejects(q(`select public.remove_team_member('${teamC}', '${C}')`), /proprietario|Permesso/));
  await as(C, () => assert.rejects(q(`select public.leave_team('${teamC}')`), /trasferisci/));
  await as(C, () => q(`select public.set_team_member_role('${teamC}', '${B}', 'admin')`));
  await as(C, () => q(`select public.remove_team_member('${teamC}', '${B}')`));
  await as(B, async () => assert.equal((await q(`select * from public.channels where team_id = '${teamC}'`)).length, 0));
});

test('storage: ognuno nella propria cartella; documenti di verifica visibili all\'admin', async () => {
  await as(A, async () => {
    await q(`insert into storage.objects (bucket_id, name, owner) values ('letterheads', '${A}/carta.pdf', '${A}')`);
    await assert.rejects(q(`insert into storage.objects (bucket_id, name) values ('letterheads', '${B}/x.pdf')`), /row-level security/);
  });
  await as(B, async () => assert.equal((await q("select * from storage.objects where bucket_id = 'letterheads'")).length, 0));
  await as(C, () => q(`insert into storage.objects (bucket_id, name, owner) values ('verifiche', '${C}/doc.pdf', '${C}')`));
  await as(X, async () => assert.equal((await q("select * from storage.objects where bucket_id = 'verifiche'")).length, 1));
  const [bucket] = await q("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'letterheads'");
  assert.deepEqual([bucket.public, Number(bucket.file_size_limit), bucket.allowed_mime_types], [false, 5242880, ['application/pdf']]);
});

test('MFA: con un fattore verificato serve una sessione aal2', async () => {
  await q(`insert into auth.mfa_factors (user_id, status) values ('${A}', 'verified')`);
  await as(A, async () => assert.equal((await q('select * from public.user_data')).length, 0), { aal: 'aal1' });
  await as(A, async () => assert.equal((await q('select * from public.user_data')).length, 1), { aal: 'aal2' });
  await q(`delete from auth.mfa_factors where user_id = '${A}'`);
});

test('eliminazione account: servono prima i file rimossi; poi dati cancellati e proprietà trasferita', async () => {
  // A è proprietaria del "Team ModReport" con B ancora membro.
  await as(A, () => assert.rejects(q('select public.delete_my_account()'), /Elimina prima i file/));
  await q(`delete from storage.objects where name like '${A}/%'`);
  await as(A, () => q('select public.delete_my_account()'));
  assert.equal((await q(`select * from auth.users where id = '${A}'`)).length, 0);
  assert.equal((await q(`select * from public.user_data where user_id = '${A}'`)).length, 0);
  const [heir] = await q(`select user_id, role from public.team_members where role = 'owner' and team_id = (select id from public.teams where nome = 'Team ModReport')`);
  assert.equal(heir.user_id, B);
});
