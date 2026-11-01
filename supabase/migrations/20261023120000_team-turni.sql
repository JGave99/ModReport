-- ModReport — team e ruoli completi, canale Avvisi, calendario dei turni (issue #4).
--
-- Ruoli nel team: proprietario (owner), amministratore (admin), membro (member).
-- - Proprietario: impostazioni del team (nome, tipo, sede, approvazione), eliminazione, ruoli e proprietà.
-- - Amministratori: inviti e approvazioni, rimozione dei membri, canali, libreria del team, sedi e tipi di turno,
--   messaggi nel canale Avvisi.
-- - Membri: messaggi negli altri canali, turni condivisi, la propria qualifica.
-- Chi entra con un invito in un team "con approvazione" resta in attesa (stato 'in_attesa') e non vede nulla
-- finché un amministratore non lo accetta.

-- ============================================================
-- TEAM: tipo, sede, approvazione, impostazioni dei turni
-- ============================================================
alter table public.teams add column if not exists tipo text;
alter table public.teams add column if not exists sede text;
alter table public.teams add column if not exists richiede_approvazione boolean not null default false;
alter table public.teams add column if not exists turni_config jsonb not null default '{}'::jsonb;

alter table public.team_members add column if not exists qualifica text;
alter table public.team_members add column if not exists stato text not null default 'attivo';

alter table public.channels add column if not exists solo_admin boolean not null default false;

do $$
declare
  c record;
begin
  for c in select * from (values
    ('teams', 'teams_tipo_check', 'tipo is null or tipo in (''reparto'', ''studio'', ''gruppo'')'),
    ('teams', 'teams_sede_check', 'sede is null or char_length(sede) <= 80'),
    ('teams', 'teams_turni_config_check', 'jsonb_typeof(turni_config) = ''object'' and pg_column_size(turni_config) <= 32768'),
    ('team_members', 'team_members_qualifica_check',
      'qualifica is null or qualifica in (''radiologo'', ''specializzando'', ''tsrm'', ''infermiere'', ''segreteria'', ''altro'')'),
    ('team_members', 'team_members_stato_check', 'stato in (''attivo'', ''in_attesa'')')
  ) as x (tbl, name, expr)
  loop
    if not exists (select 1 from pg_constraint where conname = c.name) then
      execute format('alter table public.%I add constraint %I check (%s)', c.tbl, c.name, c.expr);
    end if;
  end loop;
end $$;

-- Chi è in attesa di approvazione non è ancora membro.
create or replace function public.team_role(p_team uuid)
returns text language sql stable security definer set search_path = '' as $$
  select role from public.team_members where team_id = p_team and user_id = auth.uid() and stato = 'attivo';
$$;

create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where team_id = p_team and user_id = auth.uid() and stato = 'attivo');
$$;

create or replace function public.is_team_admin(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members
    where team_id = p_team and user_id = auth.uid() and stato = 'attivo' and role in ('owner', 'admin'));
$$;

-- Chi è in attesa vede il nome del team e la propria riga (per sapere a chi ha chiesto di entrare).
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated using (
  public.is_team_member(id)
  or exists (select 1 from public.team_members m where m.team_id = id and m.user_id = (select auth.uid()))
);
-- Le impostazioni si cambiano solo con update_team (proprietario) e set_team_turni_config (amministratori).
drop policy if exists teams_update on public.teams;

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select to authenticated
  using (public.is_team_member(team_id) or user_id = (select auth.uid()));

-- Canali: li creano proprietario e amministratori; nei canali "solo amministratori" (Avvisi) scrivono solo loro.
drop policy if exists channels_insert on public.channels;
create policy channels_insert on public.channels for insert to authenticated with check (public.is_team_admin(team_id));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated with check (
  exists (select 1 from public.channels c where c.id = channel_id and public.is_team_member(c.team_id)
          and (not c.solo_admin or public.is_team_admin(c.team_id)))
);

-- Ogni team ha un canale Avvisi.
insert into public.channels (team_id, nome, created_by, solo_admin)
select t.id, 'avvisi', t.created_by, true from public.teams t
where not exists (select 1 from public.channels c where c.team_id = t.id and c.solo_admin);

-- ============================================================
-- FUNZIONI DEI TEAM
-- ============================================================
drop function if exists public.create_team(text);
create or replace function public.create_team(p_nome text, p_tipo text default null, p_sede text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if coalesce(btrim(p_nome), '') = '' then raise exception 'Il nome del team è obbligatorio' using errcode = '22023'; end if;
  if (select count(*) from public.team_members where user_id = auth.uid() and role = 'owner') >= 5 then
    raise exception 'Hai già creato il numero massimo di team' using errcode = '54000';
  end if;
  insert into public.teams (nome, created_by, tipo, sede)
  values (left(btrim(p_nome), 80), auth.uid(), nullif(p_tipo, ''), left(nullif(btrim(coalesce(p_sede, '')), ''), 80)) returning id into t;
  insert into public.team_members (team_id, user_id, nome, role) values (t, auth.uid(), public.display_name_for(auth.uid()), 'owner');
  insert into public.channels (team_id, nome, created_by) values (t, 'generale', auth.uid());
  insert into public.channels (team_id, nome, created_by, solo_admin) values (t, 'avvisi', auth.uid(), true);
  return t;
end $$;

create or replace function public.update_team(p_team uuid, p_nome text, p_tipo text default null, p_sede text default null,
  p_richiede_approvazione boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.team_role(p_team) is distinct from 'owner' then raise exception 'Solo il proprietario può modificare il team' using errcode = '42501'; end if;
  if coalesce(btrim(p_nome), '') = '' then raise exception 'Il nome del team è obbligatorio' using errcode = '22023'; end if;
  update public.teams set nome = left(btrim(p_nome), 80), tipo = nullif(p_tipo, ''),
    sede = left(nullif(btrim(coalesce(p_sede, '')), ''), 80), richiede_approvazione = coalesce(p_richiede_approvazione, false)
  where id = p_team;
end $$;

-- Eliminazione: solo il proprietario, scrivendo il nome del team. Si cancellano canali, messaggi, inviti,
-- libreria e condivisioni dei turni del team (i turni personali dei membri restano loro).
create or replace function public.delete_team(p_team uuid, p_conferma text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  n text;
begin
  if public.team_role(p_team) is distinct from 'owner' then raise exception 'Solo il proprietario può eliminare il team' using errcode = '42501'; end if;
  select nome into n from public.teams where id = p_team;
  if lower(btrim(coalesce(p_conferma, ''))) <> lower(btrim(n)) then
    raise exception 'Per confermare scrivi esattamente il nome del team' using errcode = '22023';
  end if;
  delete from public.teams where id = p_team;
end $$;

-- Sedi e tipi di turno comuni del team: { tipi: [{ nome, colore, inizio, fine }], sedi: [testo] }.
create or replace function public.set_team_turni_config(p_team uuid, p_config jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_team_admin(p_team) then raise exception 'Solo proprietario e amministratori' using errcode = '42501'; end if;
  if jsonb_typeof(p_config) <> 'object'
     or jsonb_typeof(coalesce(p_config -> 'tipi', '[]')) <> 'array' or jsonb_array_length(coalesce(p_config -> 'tipi', '[]')) > 30
     or jsonb_typeof(coalesce(p_config -> 'sedi', '[]')) <> 'array' or jsonb_array_length(coalesce(p_config -> 'sedi', '[]')) > 50
     or pg_column_size(p_config) > 32768 then
    raise exception 'Impostazioni dei turni non valide' using errcode = '22023';
  end if;
  update public.teams set turni_config = p_config where id = p_team;
end $$;

-- La propria qualifica nel team (anche mentre si è in attesa).
create or replace function public.set_my_qualifica(p_team uuid, p_qualifica text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.team_members set qualifica = nullif(p_qualifica, '') where team_id = p_team and user_id = auth.uid();
  if not found then raise exception 'Non fai parte di questo team' using errcode = '22023'; end if;
end $$;

-- Ingresso con invito. Restituisce l'id del team, 'pending' (team con approvazione), 'invalid' o 'expired'.
create or replace function public.join_team_with_code(invite_code text, member_name text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  inv public.team_invites%rowtype;
  st text;
  needs_ok boolean;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  select * into inv from public.team_invites where code = btrim(invite_code) for update;
  if not found or inv.revoked_at is not null then return 'invalid'; end if;
  select stato into st from public.team_members where team_id = inv.team_id and user_id = auth.uid();
  if st = 'attivo' then return inv.team_id::text; end if;
  if st = 'in_attesa' then return 'pending'; end if;
  if inv.expires_at < now() or inv.uses >= inv.max_uses then return 'expired'; end if;
  select richiede_approvazione into needs_ok from public.teams where id = inv.team_id;
  insert into public.team_members (team_id, user_id, nome, role, stato)
  values (inv.team_id, auth.uid(), public.display_name_for(auth.uid()), 'member', case when needs_ok then 'in_attesa' else 'attivo' end);
  update public.team_invites set uses = uses + 1 where code = inv.code;
  return case when needs_ok then 'pending' else inv.team_id::text end;
end $$;

create or replace function public.approve_team_member(p_team uuid, p_user uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_team_admin(p_team) then raise exception 'Solo proprietario e amministratori' using errcode = '42501'; end if;
  if not exists (select 1 from public.team_members where team_id = p_team and user_id = p_user and stato = 'in_attesa') then
    raise exception 'Richiesta non trovata' using errcode = '22023';
  end if;
  if p_approve then
    update public.team_members set stato = 'attivo', joined_at = now() where team_id = p_team and user_id = p_user;
  else
    delete from public.team_members where team_id = p_team and user_id = p_user;
  end if;
end $$;

create or replace function public.remove_team_member(p_team uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  my_role text := public.team_role(p_team);
  target_role text;
begin
  select role into target_role from public.team_members where team_id = p_team and user_id = p_user;
  if target_role is null then raise exception 'Membro non trovato' using errcode = '22023'; end if;
  if p_user = auth.uid() then raise exception 'Per uscire dal team usa "Esci dal team"' using errcode = '22023'; end if;
  if target_role = 'owner' then raise exception 'Il proprietario non può essere rimosso' using errcode = '42501'; end if;
  if not (my_role = 'owner' or (my_role = 'admin' and target_role = 'member')) then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;
  delete from public.channel_reads r using public.channels c where r.channel_id = c.id and c.team_id = p_team and r.user_id = p_user;
  delete from public.shift_shares where team_id = p_team and user_id = p_user;
  delete from public.team_members where team_id = p_team and user_id = p_user;
end $$;

-- Uscita (o ritiro della richiesta, se si è in attesa).
create or replace function public.leave_team(p_team uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  my_role text := public.team_role(p_team);
begin
  if my_role is null then
    delete from public.team_members where team_id = p_team and user_id = auth.uid() and stato = 'in_attesa';
    if not found then raise exception 'Non fai parte di questo team' using errcode = '22023'; end if;
    return;
  end if;
  if my_role = 'owner' then
    if exists (select 1 from public.team_members where team_id = p_team and user_id <> auth.uid() and stato = 'attivo') then
      raise exception 'Prima di uscire trasferisci la proprietà del team a un altro membro' using errcode = '42501';
    end if;
    delete from public.teams where id = p_team;
    return;
  end if;
  delete from public.channel_reads r using public.channels c where r.channel_id = c.id and c.team_id = p_team and r.user_id = auth.uid();
  delete from public.shift_shares where team_id = p_team and user_id = auth.uid();
  delete from public.team_members where team_id = p_team and user_id = auth.uid();
end $$;

create or replace function public.set_team_member_role(p_team uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.team_role(p_team) is distinct from 'owner' then raise exception 'Solo il proprietario può cambiare i ruoli' using errcode = '42501'; end if;
  if p_role not in ('owner', 'admin', 'member') then raise exception 'Ruolo non valido' using errcode = '22023'; end if;
  if not exists (select 1 from public.team_members where team_id = p_team and user_id = p_user and stato = 'attivo') then
    raise exception 'Membro non trovato' using errcode = '22023';
  end if;
  if p_user = auth.uid() then raise exception 'Non puoi cambiare il tuo ruolo' using errcode = '22023'; end if;
  if p_role = 'owner' then
    update public.team_members set role = 'admin' where team_id = p_team and user_id = auth.uid();
  end if;
  update public.team_members set role = p_role where team_id = p_team and user_id = p_user;
end $$;

-- ============================================================
-- TURNI
-- Personali e privati; si condividono, a scelta, con i propri team. Si cancellano dopo 12 mesi.
-- ============================================================
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  tipo text not null check (char_length(btrim(tipo)) between 1 and 40),
  sede text check (sede is null or char_length(sede) <= 80),
  note text check (note is null or char_length(note) <= 500),
  colore text check (colore is null or colore ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '48 hours')
);
create index if not exists shifts_user_start_idx on public.shifts (user_id, starts_at);
alter table public.shifts enable row level security;
drop policy if exists shifts_own on public.shifts;
create policy shifts_own on public.shifts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.shifts_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    if (select count(*) from public.shifts where user_id = new.user_id) >= 3000 then
      raise exception 'Troppi turni salvati' using errcode = '54000';
    end if;
  else
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  new.tipo := btrim(new.tipo);
  return new;
end $$;
drop trigger if exists shifts_guard on public.shifts;
create trigger shifts_guard before insert or update on public.shifts for each row execute function public.shifts_guard();

-- Conservazione: i turni finiti da più di 12 mesi si cancellano a ogni nuovo inserimento dell'utente.
create or replace function public.shifts_retention()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.shifts where user_id = auth.uid() and ends_at < now() - interval '12 months';
  return null;
end $$;
drop trigger if exists shifts_retention on public.shifts;
create trigger shifts_retention after insert on public.shifts for each statement execute function public.shifts_retention();

create table if not exists public.shift_shares (
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  dettaglio text not null default 'completo' check (dettaglio in ('completo', 'occupato')),
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);
alter table public.shift_shares enable row level security;
drop policy if exists shift_shares_own on public.shift_shares;
create policy shift_shares_own on public.shift_shares for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_team_member(team_id));

-- Turni dei colleghi che li condividono con il team (al massimo 62 giorni per volta).
-- Con dettaglio 'occupato' si vede solo che sono di turno: niente tipo, sede, note.
create or replace function public.team_shifts(p_team uuid, p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, nome text, qualifica text, starts_at timestamptz, ends_at timestamptz,
               tipo text, sede text, note text, colore text, dettaglio text)
language sql stable security definer set search_path = '' as $$
  select s.user_id, m.nome, m.qualifica, s.starts_at, s.ends_at,
    case when sh.dettaglio = 'completo' then s.tipo else 'Di turno' end,
    case when sh.dettaglio = 'completo' then s.sede end,
    case when sh.dettaglio = 'completo' then s.note end,
    case when sh.dettaglio = 'completo' then s.colore end,
    sh.dettaglio
  from public.shift_shares sh
  join public.team_members m on m.team_id = sh.team_id and m.user_id = sh.user_id and m.stato = 'attivo'
  join public.shifts s on s.user_id = sh.user_id
  where sh.team_id = p_team and public.is_team_member(p_team) and public.mfa_ok()
    and p_to > p_from and p_to - p_from <= interval '62 days'
    and s.ends_at > p_from and s.starts_at < p_to
  order by s.starts_at, m.nome;
$$;

-- ============================================================
-- CALENDARIO PER GOOGLE (abbonamento a un link segreto)
-- Del link si conserva solo l'impronta (sha256); lo si può rigenerare o disattivare.
-- La funzione pubblica supabase/functions/turni-ics lo legge con calendar_feed_events.
-- ============================================================
create table if not exists public.calendar_feeds (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.calendar_feeds enable row level security;
drop policy if exists calendar_feeds_select on public.calendar_feeds;
create policy calendar_feeds_select on public.calendar_feeds for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.create_calendar_feed()
returns text language plpgsql security definer set search_path = '' as $$
declare
  token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  insert into public.calendar_feeds (user_id, token_hash) values (auth.uid(), encode(sha256(convert_to(token, 'UTF8')), 'hex'))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now();
  return token;
end $$;

create or replace function public.delete_calendar_feed()
returns void language sql security definer set search_path = '' as $$
  delete from public.calendar_feeds where user_id = auth.uid();
$$;

create or replace function public.calendar_feed_events(p_token text)
returns table (id uuid, starts_at timestamptz, ends_at timestamptz, tipo text, sede text, note text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.starts_at, s.ends_at, s.tipo, s.sede, s.note, s.updated_at
  from public.calendar_feeds f
  join public.shifts s on s.user_id = f.user_id
  where char_length(coalesce(p_token, '')) = 64
    and f.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and s.ends_at > now() - interval '90 days' and s.starts_at < now() + interval '400 days'
  order by s.starts_at
  limit 3000;
$$;

-- ============================================================
-- VERIFICA IN DUE PASSAGGI E PERMESSI
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array['shifts', 'shift_shares', 'calendar_feeds'] loop
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok())', t);
  end loop;
end $$;
revoke all on public.shifts, public.shift_shares, public.calendar_feeds from anon;

do $$
declare
  f text;
begin
  foreach f in array array[
    'create_team(text, text, text)', 'update_team(uuid, text, text, text, boolean)', 'delete_team(uuid, text)',
    'set_team_turni_config(uuid, jsonb)', 'set_my_qualifica(uuid, text)', 'join_team_with_code(text, text)',
    'approve_team_member(uuid, uuid, boolean)', 'remove_team_member(uuid, uuid)', 'leave_team(uuid)',
    'set_team_member_role(uuid, uuid, text)', 'team_shifts(uuid, timestamptz, timestamptz)',
    'create_calendar_feed()', 'delete_calendar_feed()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function public.shifts_guard() from public, anon, authenticated;
revoke all on function public.shifts_retention() from public, anon, authenticated;
-- Il link per Google è letto senza accesso (dalla funzione pubblica): basta il token segreto.
revoke all on function public.calendar_feed_events(text) from public;
grant execute on function public.calendar_feed_events(text) to anon, authenticated;
