// Team e ruoli completi, canale Avvisi, turni e link per Google (issue #4) su Postgres in memoria (PGlite).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const migrations = readdirSync(new URL('supabase/migrations/', root)).filter((f) => f.endsWith('.sql')).sort();

const OWNER = '10000000-0000-4000-8000-000000000001';
const ADMIN = '10000000-0000-4000-8000-000000000002';
const MEMBER = '10000000-0000-4000-8000-000000000003';
const NEW = '10000000-0000-4000-8000-000000000004';
const OUT = '10000000-0000-4000-8000-000000000005';

let db;
let team;
const q = async (sql, params) => (await db.query(sql, params)).rows;
async function as(user, fn) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims', $1, false)", [user ? JSON.stringify({ sub: user, role: 'authenticated', aal: 'aal1' }) : '']);
  await db.exec(user ? 'set role authenticated' : 'set role anon');
  try { return await fn(); } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}
const one = async (user, sql) => (await as(user, () => q(sql)))[0];

before(async () => {
  db = new PGlite();
  await db.exec(read('supabase/tests/supabase-shim.sql'));
  for (const m of migrations) await db.exec(read('supabase/migrations/' + m));
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
    ('${OWNER}', 'owner@rep.it', '{"nome":"Olga"}'), ('${ADMIN}', 'admin@rep.it', '{"nome":"Aldo"}'),
    ('${MEMBER}', 'membro@rep.it', '{"nome":"Mara"}'), ('${NEW}', 'nuovo@rep.it', '{"nome":"Nico"}'),
    ('${OUT}', 'esterno@altro.it', '{"nome":"Ugo"}')`);
  team = (await one(OWNER, "select public.create_team('Radiologia', 'reparto', 'Ospedale San Marco') as id")).id;
  for (const u of [ADMIN, MEMBER]) {
    const { code } = await one(OWNER, `select public.create_team_invite('${team}', 5, 7) as code`);
    await as(u, () => q(`select public.join_team_with_code('${code}')`));
  }
  await as(OWNER, () => q(`select public.set_team_member_role('${team}', '${ADMIN}', 'admin')`));
});

test('nuovo team: tipo e sede, canali generale e Avvisi (solo amministratori)', async () => {
  const t = await one(OWNER, `select tipo, sede, richiede_approvazione from public.teams where id = '${team}'`);
  assert.deepEqual([t.tipo, t.sede, t.richiede_approvazione], ['reparto', 'Ospedale San Marco', false]);
  const ch = await as(MEMBER, () => q(`select nome, solo_admin from public.channels where team_id = '${team}' order by nome`));
  assert.deepEqual(ch.map((c) => [c.nome, c.solo_admin]), [['avvisi', true], ['generale', false]]);
  const avvisi = (await one(OWNER, `select id from public.channels where team_id = '${team}' and solo_admin`)).id;
  const generale = (await one(OWNER, `select id from public.channels where team_id = '${team}' and not solo_admin`)).id;
  await as(MEMBER, () => assert.rejects(q(`insert into public.messages (channel_id, testo) values ('${avvisi}', 'ciao')`), /row-level security/));
  await as(MEMBER, () => q(`insert into public.messages (channel_id, testo) values ('${generale}', 'ciao')`));
  await as(ADMIN, () => q(`insert into public.messages (channel_id, testo) values ('${avvisi}', 'Riunione lunedì')`));
  // Nuovi canali: solo proprietario e amministratori
  await as(MEMBER, () => assert.rejects(q(`insert into public.channels (team_id, nome) values ('${team}', 'mio')`), /row-level security/));
  await as(ADMIN, () => q(`insert into public.channels (team_id, nome) values ('${team}', 'turni')`));
});

test('impostazioni: le cambia solo il proprietario; eliminazione con il nome', async () => {
  await as(ADMIN, () => assert.rejects(q(`select public.update_team('${team}', 'Altro nome')`), /Solo il proprietario/));
  await as(MEMBER, async () => assert.equal((await q(`update public.teams set nome = 'x' where id = '${team}' returning id`)).length, 0));
  await as(OWNER, () => q(`select public.update_team('${team}', 'Radiologia SM', 'reparto', 'Ospedale San Marco', true)`));
  assert.equal((await one(MEMBER, `select nome from public.teams where id = '${team}'`)).nome, 'Radiologia SM');
  const tmp = (await one(ADMIN, "select public.create_team('Da eliminare') as id")).id;
  await as(ADMIN, () => assert.rejects(q(`select public.delete_team('${tmp}', 'sbagliato')`), /nome del team/));
  await as(ADMIN, () => q(`select public.delete_team('${tmp}', ' da ELIMINARE ')`));
  assert.equal((await q(`select id from public.teams where id = '${tmp}'`)).length, 0);
});

test('approvazione: chi entra aspetta, vede solo il nome del team; un amministratore lo accetta', async () => {
  const { code } = await one(ADMIN, `select public.create_team_invite('${team}', 5, 7) as code`);
  assert.equal((await one(NEW, `select public.join_team_with_code('${code}') as r`)).r, 'pending');
  assert.equal((await one(NEW, `select public.join_team_with_code('${code}') as r`)).r, 'pending', 'di nuovo: sempre in attesa');
  await as(NEW, async () => {
    assert.equal((await q('select nome from public.teams'))[0].nome, 'Radiologia SM');
    assert.equal((await q('select stato from public.team_members'))[0].stato, 'in_attesa');
    assert.equal((await q('select id from public.channels')).length, 0);
    assert.equal((await q('select id from public.messages')).length, 0);
  });
  await as(MEMBER, () => assert.rejects(q(`select public.approve_team_member('${team}', '${NEW}', true)`), /Solo proprietario/));
  await as(NEW, () => q(`select public.set_my_qualifica('${team}', 'specializzando')`));
  await as(ADMIN, () => q(`select public.approve_team_member('${team}', '${NEW}', true)`));
  await as(NEW, async () => assert.ok((await q('select id from public.channels')).length >= 2));
  assert.equal((await one(OWNER, `select qualifica from public.team_members where user_id = '${NEW}'`)).qualifica, 'specializzando');
  // Rifiuto e ritiro della richiesta
  const { code: c2 } = await one(ADMIN, `select public.create_team_invite('${team}', 5, 7) as code`);
  assert.equal((await one(OUT, `select public.join_team_with_code('${c2}') as r`)).r, 'pending');
  await as(OUT, () => q(`select public.leave_team('${team}')`));
  assert.equal((await q(`select * from public.team_members where user_id = '${OUT}'`)).length, 0);
  await as(OUT, () => q(`select public.join_team_with_code('${c2}')`));
  await as(ADMIN, () => q(`select public.approve_team_member('${team}', '${OUT}', false)`));
  assert.equal((await q(`select * from public.team_members where user_id = '${OUT}'`)).length, 0);
  await as(OUT, () => assert.rejects(q(`select public.set_my_qualifica('${team}', 'radiologo')`), /Non fai parte/));
});

test('sedi e tipi di turno del team: li impostano proprietario e amministratori', async () => {
  const cfg = JSON.stringify({ tipi: [{ nome: 'Notte', colore: '#1d4ed8', inizio: '20:00', fine: '08:00' }], sedi: ['Pronto Soccorso', 'TC'] });
  await as(MEMBER, () => assert.rejects(q(`select public.set_team_turni_config('${team}', '${cfg}')`), /Solo proprietario/));
  await as(ADMIN, () => q(`select public.set_team_turni_config('${team}', '${cfg}')`));
  await as(ADMIN, () => assert.rejects(q(`select public.set_team_turni_config('${team}', '[]')`), /non valide/));
  assert.deepEqual((await one(MEMBER, `select turni_config from public.teams where id = '${team}'`)).turni_config.sedi, ['Pronto Soccorso', 'TC']);
});

test('turni: privati; condivisi con il team in modo completo o solo "di turno"', async () => {
  await as(MEMBER, () => q(`insert into public.shifts (user_id, starts_at, ends_at, tipo, sede, note) values
    ('${MEMBER}', now() + interval '1 day', now() + interval '1 day 12 hours', 'Notte', 'Pronto Soccorso', 'reperibile per TC')`));
  await as(MEMBER, () => assert.rejects(q(`insert into public.shifts (user_id, starts_at, ends_at, tipo) values ('${MEMBER}', now(), now() - interval '1 hour', 'X')`), /check constraint/));
  await as(MEMBER, () => assert.rejects(q(`insert into public.shifts (user_id, starts_at, ends_at, tipo) values ('${MEMBER}', now(), now() + interval '3 days', 'X')`), /check constraint/));
  await as(MEMBER, () => assert.rejects(q(`insert into public.shifts (user_id, starts_at, ends_at, tipo) values ('${OWNER}', now(), now() + interval '1 hour', 'X')`), /row-level security/));
  await as(OWNER, async () => assert.equal((await q('select id from public.shifts')).length, 0, 'i turni degli altri non si leggono direttamente'));
  const range = `'${team}', now(), now() + interval '7 days'`;
  assert.equal((await as(OWNER, () => q(`select * from public.team_shifts(${range})`))).length, 0, 'non condivisi');
  await as(MEMBER, () => assert.rejects(q(`insert into public.shift_shares (user_id, team_id) values ('${MEMBER}', gen_random_uuid())`), /row-level security|foreign key/));
  await as(MEMBER, () => q(`insert into public.shift_shares (user_id, team_id) values ('${MEMBER}', '${team}')`));
  const [full] = await as(OWNER, () => q(`select nome, tipo, sede, note from public.team_shifts(${range})`));
  assert.deepEqual([full.nome, full.tipo, full.sede, full.note], ['Mara', 'Notte', 'Pronto Soccorso', 'reperibile per TC']);
  await as(MEMBER, () => q(`update public.shift_shares set dettaglio = 'occupato' where team_id = '${team}'`));
  const [busy] = await as(OWNER, () => q(`select tipo, sede, note from public.team_shifts(${range})`));
  assert.deepEqual([busy.tipo, busy.sede, busy.note], ['Di turno', null, null]);
  assert.equal((await as(OUT, () => q(`select * from public.team_shifts(${range})`))).length, 0, 'fuori dal team non si vede');
  assert.equal((await as(OWNER, () => q(`select * from public.team_shifts('${team}', now(), now() + interval '90 days')`))).length, 0, 'massimo 62 giorni');
  // Rimosso dal team: la condivisione sparisce
  await as(ADMIN, () => q(`select public.remove_team_member('${team}', '${MEMBER}')`));
  assert.equal((await q(`select * from public.shift_shares where user_id = '${MEMBER}'`)).length, 0);
});

test('turni: quelli finiti da più di 12 mesi si cancellano', async () => {
  await q(`insert into public.shifts (user_id, starts_at, ends_at, tipo) values ('${OWNER}', now() - interval '13 months', now() - interval '13 months' + interval '8 hours', 'Vecchio')`);
  await as(OWNER, () => q(`insert into public.shifts (user_id, starts_at, ends_at, tipo) values ('${OWNER}', now(), now() + interval '8 hours', 'Mattina')`));
  assert.deepEqual((await q(`select tipo from public.shifts where user_id = '${OWNER}'`)).map((r) => r.tipo), ['Mattina']);
});

test('link per Google: token segreto da 64 caratteri, leggibile senza accesso, rigenerabile', async () => {
  const { t1 } = await one(OWNER, 'select public.create_calendar_feed() as t1');
  assert.match(t1, /^[0-9a-f]{64}$/);
  assert.equal((await as(null, () => q(`select tipo from public.calendar_feed_events('${t1}')`)))[0].tipo, 'Mattina');
  assert.equal((await as(null, () => q(`select * from public.calendar_feed_events('${'0'.repeat(64)}')`))).length, 0);
  await as(null, () => assert.rejects(q('select * from public.shifts'), /permission denied/));
  const { t2 } = await one(OWNER, 'select public.create_calendar_feed() as t2');
  assert.equal((await as(null, () => q(`select * from public.calendar_feed_events('${t1}')`))).length, 0, 'il vecchio link non vale più');
  assert.equal((await as(null, () => q(`select * from public.calendar_feed_events('${t2}')`))).length, 1);
  await as(OWNER, () => q('select public.delete_calendar_feed()'));
  assert.equal((await as(null, () => q(`select * from public.calendar_feed_events('${t2}')`))).length, 0);
});
