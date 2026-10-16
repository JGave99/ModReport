// Le migrazioni applicate sullo schema reale della produzione (supabase/tests/produzione-2026-10-16.sql),
// con dati come quelli degli utenti: devono passare senza errori e lasciare il database funzionante.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const migrations = readdirSync(new URL('supabase/migrations/', root)).filter((f) => f.endsWith('.sql')).sort();

const A = 'a0000000-0000-4000-8000-00000000000a'; // amministratore del vecchio team unico
const B = 'b0000000-0000-4000-8000-00000000000b'; // membro
const N = 'd0000000-0000-4000-8000-00000000000d'; // utente che si registra dopo l'aggiornamento
const CH = '11111111-1111-4111-8111-111111111111';

let db;
const q = async (sql) => (await db.query(sql)).rows;
async function as(user, fn) {
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: user, role: 'authenticated', aal: 'aal1' })]);
  await db.exec('set role authenticated');
  try { return await fn(); } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

before(async () => {
  db = new PGlite();
  await db.exec(read('supabase/tests/supabase-shim.sql'));
  await db.exec(read('supabase/tests/produzione-2026-10-16.sql'));
  await db.exec(`
    insert into public.app_presets (name, data) values ('base', '{"metodiche":["RX"],"esamiByMetodica":{"RX":[]}}');
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'iacopo@ospedale.it', '{"nome":"Iacopo","cognome":"G"}'),
      ('${B}', 'bruno@ospedale.it', '{}');
    insert into public.team_members (user_id, nome, role, joined_at) values
      ('${A}', 'Iacopo G', 'admin', now() - interval '30 days'),
      ('${B}', 'Bruno', 'member', now() - interval '3 days');
    insert into public.channels (id, nome, created_by) values ('${CH}', 'generale', '${A}');
    insert into public.messages (channel_id, user_id, nome_mittente, testo) values ('${CH}', '${B}', 'Bruno', 'ciao');
    insert into public.channel_reads (user_id, channel_id) values ('${A}', '${CH}'), ('${B}', '${CH}');
    insert into public.team_invites (code, created_by) values ('codiceinvito1234', '${B}');
    insert into public.report_archive (user_id, esame, testo) values ('${B}', 'RX TORACE', 'Referto vecchio.');
    insert into public.app_admins (user_id) values ('${A}');
    insert into public.subscriptions (user_id, plan, status) values ('${A}', 'pro', 'canceled');
  `);
  // Tutte le migrazioni in un solo blocco, come quando si incolla il file nel SQL Editor.
  await db.exec(migrations.map((m) => read('supabase/migrations/' + m)).join('\n'));
});

test('produzione: il vecchio team unico diventa "Team ModReport" con il proprietario', async () => {
  const [team] = await q('select id, nome, created_by from public.teams');
  assert.equal(team.nome, 'Team ModReport');
  const roles = await q('select user_id, role from public.team_members order by role');
  assert.deepEqual(roles.map((r) => [r.user_id, r.role]), [[B, 'member'], [A, 'owner']]);
  assert.equal((await q('select team_id from public.channels'))[0].team_id, team.id);
});

test('produzione: dati esistenti intatti, vecchie funzioni sostituite', async () => {
  assert.equal((await q('select count(*)::int as n from public.report_archive'))[0].n, 1);
  assert.equal((await q('select count(*)::int as n from public.subscriptions'))[0].n, 1);
  const args = await q("select pg_get_function_identity_arguments(oid) as a from pg_proc where proname = 'is_team_member'");
  assert.deepEqual(args.map((r) => r.a), ['p_team uuid']);
  // Le vecchie policy delle tabelle gestite non restano accanto alle nuove.
  const old = await q("select policyname from pg_policies where schemaname = 'public' and policyname like '%Membri%'");
  assert.deepEqual(old, []);
  await as(B, async () => {
    assert.equal((await q('select id from public.channels')).length, 1);
    assert.equal((await q('select id from public.messages')).length, 1);
  });
});

test('produzione: chi si registra dopo l\'aggiornamento ha profilo e libreria', async () => {
  await q(`insert into auth.users (id, email, raw_user_meta_data) values ('${N}', 'nuova@studio.it', '{"nome":"Nora"}')`);
  assert.equal((await q(`select nome from public.profiles where id = '${N}'`))[0].nome, 'Nora');
  // Niente più copia della vecchia libreria base: il primo accesso parte dai predefiniti e dalla configurazione guidata.
  assert.equal((await q(`select * from public.user_data where user_id = '${N}'`)).length, 0);
  const leftovers = await q("select proname from pg_proc where pronamespace = 'public'::regnamespace and proname in ('copy_base_preset_to_new_user', 'has_chat_access', 'has_reporting_access', 'team_exists')");
  assert.deepEqual(leftovers, []);
});

test('produzione: l\'eliminazione dell\'account funziona anche con letture, canali e inviti creati', async () => {
  await as(B, () => q('select public.delete_my_account()'));
  assert.equal((await q(`select id from auth.users where id = '${B}'`)).length, 0);
  assert.equal((await q(`select * from public.channel_reads where user_id = '${B}'`)).length, 0);
  assert.equal((await q(`select * from public.team_invites where created_by = '${B}'`)).length, 0);
  // Il proprietario che ha creato il canale: il canale resta al team, senza autore.
  await as(A, () => q('select public.delete_my_account()'));
  assert.equal((await q(`select id from auth.users where id = '${A}'`)).length, 0);
});
