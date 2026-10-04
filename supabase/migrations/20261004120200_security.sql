-- ModReport — sicurezza lato server: RLS, funzioni, trigger, limiti, storage.
-- Ogni controllo del client è solo estetico: qui si decide chi può fare cosa.
-- Convenzioni: funzioni SECURITY DEFINER con search_path vuoto; nessun permesso al ruolo anon.

-- ============================================================
-- PERMESSI DI BASE
-- ============================================================
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke execute on functions from public;

-- Le funzioni RPC create a mano in passato potrebbero avere firme o tipi diversi: si ricreano da zero.
drop function if exists public.join_team_with_code(text, text);
drop function if exists public.join_team_with_code(text);
drop function if exists public.update_my_display_name(text);
drop function if exists public.list_app_users();
drop function if exists public.delete_my_account();

-- Le policy preesistenti (anche create dalla dashboard) si sommerebbero a queste allargando i
-- permessi: si eliminano tutte quelle delle tabelle gestite e dei bucket dell'app.
do $$
declare
  p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('user_data', 'report_archive', 'letterheads', 'profiles', 'app_admins',
      'verification_requests', 'teams', 'team_members', 'channels', 'messages', 'channel_reads', 'team_invites')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
  for p in select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(letterheads|verifiche)'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- ============================================================
-- FUNZIONI DI SUPPORTO (usate nelle policy)
-- ============================================================
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

create or replace function public.team_role(p_team uuid)
returns text language sql stable security definer set search_path = '' as $$
  select role from public.team_members where team_id = p_team and user_id = auth.uid();
$$;

create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where team_id = p_team and user_id = auth.uid());
$$;

create or replace function public.is_team_admin(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where team_id = p_team and user_id = auth.uid() and role in ('owner', 'admin'));
$$;

-- Se l'utente ha attivato la verifica in due passaggi, la sessione deve averla superata (aal2).
create or replace function public.mfa_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified');
$$;

create or replace function public.display_name_for(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif(trim(concat_ws(' ', p.nome, p.cognome)), ''),
    nullif(trim(concat_ws(' ', u.raw_user_meta_data ->> 'nome', u.raw_user_meta_data ->> 'cognome')), ''),
    split_part(u.email, '@', 1)
  )
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = p_user;
$$;

-- ============================================================
-- PROFILI
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome, cognome)
  values (new.id, left(new.raw_user_meta_data ->> 'nome', 80), left(new.raw_user_meta_data ->> 'cognome', 80))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, nome, cognome)
select id, left(raw_user_meta_data ->> 'nome', 80), left(raw_user_meta_data ->> 'cognome', 80) from auth.users
on conflict (id) do nothing;

create or replace function public.profiles_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_at := now(); else new.created_at := old.created_at; new.id := old.id; end if;
  return new;
end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.profiles_touch();

-- Il nome nei team segue il profilo.
create or replace function public.profiles_sync_team_names()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.team_members set nome = public.display_name_for(new.id) where user_id = new.id;
  return new;
end $$;
drop trigger if exists profiles_sync_team_names on public.profiles;
create trigger profiles_sync_team_names after insert or update of nome, cognome on public.profiles
  for each row execute function public.profiles_sync_team_names();

-- ============================================================
-- RLS: DATI PERSONALI
-- ============================================================
alter table public.user_data enable row level security;
alter table public.report_archive enable row level security;
alter table public.letterheads enable row level security;
alter table public.profiles enable row level security;
alter table public.app_admins enable row level security;
alter table public.verification_requests enable row level security;

drop policy if exists user_data_own on public.user_data;
create policy user_data_own on public.user_data for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists report_archive_select on public.report_archive;
drop policy if exists report_archive_insert on public.report_archive;
drop policy if exists report_archive_delete on public.report_archive;
create policy report_archive_select on public.report_archive for select to authenticated using (user_id = (select auth.uid()));
create policy report_archive_insert on public.report_archive for insert to authenticated with check (user_id = (select auth.uid()));
create policy report_archive_delete on public.report_archive for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists letterheads_own on public.letterheads;
create policy letterheads_own on public.letterheads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and storage_path like (select auth.uid())::text || '/%');

drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists app_admins_self on public.app_admins;
create policy app_admins_self on public.app_admins for select to authenticated using (user_id = (select auth.uid()));

-- Verifiche specializzandi: l'utente invia, solo un amministratore del sito decide.
drop policy if exists verification_select on public.verification_requests;
drop policy if exists verification_insert on public.verification_requests;
drop policy if exists verification_update on public.verification_requests;
drop policy if exists verification_delete on public.verification_requests;
create policy verification_select on public.verification_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_app_admin());
create policy verification_insert on public.verification_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy verification_update on public.verification_requests for update to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());
create policy verification_delete on public.verification_requests for delete to authenticated
  using ((user_id = (select auth.uid()) and status = 'in_attesa') or public.is_app_admin());

create or replace function public.verification_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'in_attesa';
    new.note_admin := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.submitted_at := now();
    new.email := (select email from auth.users where id = auth.uid());
    if new.storage_path not like auth.uid()::text || '/%' then
      raise exception 'Percorso del documento non valido' using errcode = '42501';
    end if;
  else
    if new.status not in ('in_attesa', 'approvato', 'rifiutato') then
      raise exception 'Stato non valido' using errcode = '22023';
    end if;
    new.id := old.id; new.user_id := old.user_id; new.email := old.email;
    new.storage_path := old.storage_path; new.submitted_at := old.submitted_at;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;
drop trigger if exists verification_guard on public.verification_requests;
create trigger verification_guard before insert or update on public.verification_requests
  for each row execute function public.verification_guard();

-- ============================================================
-- RLS: TEAM, CANALI, MESSAGGI
-- ============================================================
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.channel_reads enable row level security;
alter table public.team_invites enable row level security;

-- Le tabelle dei team si modificano solo tramite le funzioni qui sotto (niente insert diretti).
drop policy if exists teams_select on public.teams;
drop policy if exists teams_update on public.teams;
create policy teams_select on public.teams for select to authenticated using (public.is_team_member(id));
create policy teams_update on public.teams for update to authenticated
  using (public.is_team_admin(id)) with check (public.is_team_admin(id));

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select to authenticated using (public.is_team_member(team_id));

drop policy if exists channels_select on public.channels;
drop policy if exists channels_insert on public.channels;
drop policy if exists channels_update on public.channels;
drop policy if exists channels_delete on public.channels;
create policy channels_select on public.channels for select to authenticated using (public.is_team_member(team_id));
create policy channels_insert on public.channels for insert to authenticated with check (public.is_team_member(team_id));
create policy channels_update on public.channels for update to authenticated
  using (public.is_team_admin(team_id)) with check (public.is_team_admin(team_id));
create policy channels_delete on public.channels for delete to authenticated using (public.is_team_admin(team_id));

drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;
drop policy if exists messages_delete on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (exists (select 1 from public.channels c where c.id = channel_id and public.is_team_member(c.team_id)));
create policy messages_insert on public.messages for insert to authenticated
  with check (exists (select 1 from public.channels c where c.id = channel_id and public.is_team_member(c.team_id)));
create policy messages_delete on public.messages for delete to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.channels c where c.id = channel_id and public.is_team_admin(c.team_id)));

drop policy if exists channel_reads_own on public.channel_reads;
create policy channel_reads_own on public.channel_reads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.channels c where c.id = channel_id and public.is_team_member(c.team_id)));

drop policy if exists team_invites_select on public.team_invites;
create policy team_invites_select on public.team_invites for select to authenticated using (public.is_team_admin(team_id));

-- Mittente, ora e canale dei messaggi decisi dal server (niente impersonificazione).
create or replace function public.messages_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
  n text;
begin
  select c.team_id into t from public.channels c where c.id = new.channel_id;
  select m.nome into n from public.team_members m where m.team_id = t and m.user_id = auth.uid();
  if t is null or n is null then
    raise exception 'Non fai parte di questo team' using errcode = '42501';
  end if;
  if (select count(*) from public.messages where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Troppi messaggi in poco tempo: riprova tra un minuto' using errcode = '54000';
  end if;
  new.user_id := auth.uid();
  new.nome_mittente := n;
  new.created_at := now();
  new.testo := btrim(new.testo);
  return new;
end $$;
drop trigger if exists messages_guard on public.messages;
create trigger messages_guard before insert on public.messages for each row execute function public.messages_guard();

create or replace function public.channels_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.nome := left(regexp_replace(lower(btrim(new.nome)), '\s+', '-', 'g'), 60);
  if new.nome = '' then raise exception 'Nome del canale vuoto' using errcode = '22023'; end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.team_id := old.team_id; new.created_by := old.created_by; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists channels_guard on public.channels;
create trigger channels_guard before insert or update on public.channels for each row execute function public.channels_guard();

create or replace function public.channel_reads_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.last_read_at := now();
  return new;
end $$;
drop trigger if exists channel_reads_guard on public.channel_reads;
create trigger channel_reads_guard before insert or update on public.channel_reads for each row execute function public.channel_reads_guard();

-- ============================================================
-- FUNZIONI (RPC) DEI TEAM
-- ============================================================
create or replace function public.create_team(p_nome text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if coalesce(btrim(p_nome), '') = '' then raise exception 'Il nome del team è obbligatorio' using errcode = '22023'; end if;
  if (select count(*) from public.team_members where user_id = auth.uid() and role = 'owner') >= 5 then
    raise exception 'Hai già creato il numero massimo di team' using errcode = '54000';
  end if;
  insert into public.teams (nome, created_by) values (left(btrim(p_nome), 80), auth.uid()) returning id into t;
  insert into public.team_members (team_id, user_id, nome, role) values (t, auth.uid(), public.display_name_for(auth.uid()), 'owner');
  insert into public.channels (team_id, nome, created_by) values (t, 'generale', auth.uid());
  return t;
end $$;

create or replace function public.create_team_invite(p_team uuid, p_max_uses integer default 10, p_valid_days integer default 7)
returns text language plpgsql security definer set search_path = '' as $$
declare
  c text := replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_team_admin(p_team) then raise exception 'Solo gli amministratori del team possono invitare' using errcode = '42501'; end if;
  insert into public.team_invites (code, team_id, created_by, created_at, expires_at, max_uses, uses)
  values (c, p_team, auth.uid(), now(), now() + make_interval(days => least(greatest(coalesce(p_valid_days, 7), 1), 30)),
          least(greatest(coalesce(p_max_uses, 10), 1), 100), 0);
  return c;
end $$;

create or replace function public.revoke_team_invite(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
begin
  select team_id into t from public.team_invites where code = p_code;
  if t is null or not public.is_team_admin(t) then raise exception 'Invito non trovato' using errcode = '42501'; end if;
  update public.team_invites set revoked_at = now() where code = p_code;
end $$;

-- Restituisce l'id del team, oppure 'invalid' / 'expired' (compatibile con il client precedente).
create or replace function public.join_team_with_code(invite_code text, member_name text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  inv public.team_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  select * into inv from public.team_invites where code = btrim(invite_code) for update;
  if not found or inv.revoked_at is not null then return 'invalid'; end if;
  if exists (select 1 from public.team_members where team_id = inv.team_id and user_id = auth.uid()) then
    return inv.team_id::text;
  end if;
  if inv.expires_at < now() or inv.uses >= inv.max_uses then return 'expired'; end if;
  insert into public.team_members (team_id, user_id, nome, role)
  values (inv.team_id, auth.uid(), public.display_name_for(auth.uid()), 'member');
  update public.team_invites set uses = uses + 1 where code = inv.code;
  return inv.team_id::text;
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
  delete from public.team_members where team_id = p_team and user_id = p_user;
end $$;

create or replace function public.leave_team(p_team uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  my_role text := public.team_role(p_team);
begin
  if my_role is null then raise exception 'Non fai parte di questo team' using errcode = '22023'; end if;
  if my_role = 'owner' then
    if exists (select 1 from public.team_members where team_id = p_team and user_id <> auth.uid()) then
      raise exception 'Prima di uscire trasferisci la proprietà del team a un altro membro' using errcode = '42501';
    end if;
    delete from public.teams where id = p_team;
    return;
  end if;
  delete from public.channel_reads r using public.channels c where r.channel_id = c.id and c.team_id = p_team and r.user_id = auth.uid();
  delete from public.team_members where team_id = p_team and user_id = auth.uid();
end $$;

create or replace function public.set_team_member_role(p_team uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.team_role(p_team) is distinct from 'owner' then raise exception 'Solo il proprietario può cambiare i ruoli' using errcode = '42501'; end if;
  if p_role not in ('owner', 'admin', 'member') then raise exception 'Ruolo non valido' using errcode = '22023'; end if;
  if not exists (select 1 from public.team_members where team_id = p_team and user_id = p_user) then
    raise exception 'Membro non trovato' using errcode = '22023';
  end if;
  if p_user = auth.uid() then raise exception 'Non puoi cambiare il tuo ruolo' using errcode = '22023'; end if;
  if p_role = 'owner' then
    update public.team_members set role = 'admin' where team_id = p_team and user_id = auth.uid();
  end if;
  update public.team_members set role = p_role where team_id = p_team and user_id = p_user;
end $$;

create or replace function public.update_my_display_name(new_nome text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.team_members set nome = public.display_name_for(auth.uid()) where user_id = auth.uid();
end $$;

-- Ultimo messaggio di ogni canale dei miei team (evita una query per canale).
create or replace function public.my_channels_last_message()
returns table (channel_id uuid, last_at timestamptz) language sql stable security definer set search_path = '' as $$
  select c.id, (select max(m.created_at) from public.messages m where m.channel_id = c.id)
  from public.channels c
  where public.is_team_member(c.team_id);
$$;

-- ============================================================
-- AMMINISTRAZIONE DEL SITO
-- ============================================================
create or replace function public.list_app_users()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then raise exception 'Permesso negato' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, exists (select 1 from public.app_admins a where a.user_id = u.id)
    from auth.users u order by u.created_at desc;
end $$;

-- ============================================================
-- ELIMINAZIONE DELL'ACCOUNT
-- I file nello Storage vanno rimossi prima dal client (Supabase non permette di cancellarli via SQL).
-- ============================================================
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  t record;
  heir uuid;
begin
  if me is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if exists (select 1 from storage.objects where owner = me or owner_id = me::text) then
    raise exception 'Elimina prima i file caricati (carte intestate, documenti)' using errcode = '55000';
  end if;
  for t in select team_id from public.team_members where user_id = me and role = 'owner' loop
    select user_id into heir from public.team_members
      where team_id = t.team_id and user_id <> me order by (role = 'admin') desc, joined_at asc limit 1;
    if heir is null then
      delete from public.teams where id = t.team_id;
    else
      update public.team_members set role = 'owner' where team_id = t.team_id and user_id = heir;
    end if;
  end loop;
  delete from public.messages where user_id = me;
  delete from public.team_members where user_id = me;
  delete from public.report_archive where user_id = me;
  delete from public.letterheads where user_id = me;
  delete from public.user_data where user_id = me;
  delete from public.verification_requests where user_id = me;
  delete from public.profiles where id = me;
  delete from auth.users where id = me;
end $$;

-- Permessi di esecuzione: solo utenti autenticati.
do $$
declare
  f text;
begin
  foreach f in array array[
    'is_app_admin()', 'team_role(uuid)', 'is_team_member(uuid)', 'is_team_admin(uuid)', 'mfa_ok()', 'display_name_for(uuid)',
    'create_team(text)', 'create_team_invite(uuid, integer, integer)', 'revoke_team_invite(text)',
    'join_team_with_code(text, text)', 'remove_team_member(uuid, uuid)', 'leave_team(uuid)',
    'set_team_member_role(uuid, uuid, text)', 'update_my_display_name(text)', 'my_channels_last_message()',
    'list_app_users()', 'delete_my_account()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ============================================================
-- VERIFICA IN DUE PASSAGGI: obbligatoria per chi l'ha attivata
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array['user_data', 'report_archive', 'letterheads', 'profiles', 'verification_requests',
                           'teams', 'team_members', 'channels', 'messages', 'channel_reads', 'team_invites'] loop
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok())', t);
  end loop;
end $$;

-- ============================================================
-- LIMITI DI DIMENSIONE (NOT VALID: non bloccano i dati già presenti)
-- ============================================================
do $$
declare
  c record;
begin
  for c in select * from (values
    ('report_archive', 'report_archive_testo_len', 'char_length(testo) <= 20000 and char_length(coalesce(esame, '''')) <= 200'),
    ('messages', 'messages_testo_len', 'char_length(testo) between 1 and 4000'),
    ('channels', 'channels_nome_len', 'char_length(nome) between 1 and 60'),
    ('teams', 'teams_nome_len', 'char_length(nome) between 1 and 80'),
    ('team_members', 'team_members_role_valid', 'role in (''owner'', ''admin'', ''member'')'),
    ('team_members', 'team_members_nome_len', 'char_length(coalesce(nome, '''')) <= 120'),
    ('letterheads', 'letterheads_nome_len', 'char_length(nome) between 1 and 120'),
    ('letterheads', 'letterheads_margini', 'margine_top between 0 and 200 and margine_left between 0 and 100 and margine_right between 0 and 100'),
    ('user_data', 'user_data_size', 'octet_length(data::text) <= 2000000'),
    ('profiles', 'profiles_len', 'char_length(coalesce(nome, '''')) <= 80 and char_length(coalesce(cognome, '''')) <= 80 and char_length(coalesce(titolo, '''')) <= 40'),
    ('verification_requests', 'verification_note_len', 'char_length(coalesce(note_admin, '''')) <= 500'),
    ('team_invites', 'team_invites_uses', 'max_uses between 1 and 100 and uses >= 0')
  ) as v(tbl, name, expr) loop
    if not exists (select 1 from pg_constraint where conname = c.name) then
      execute format('alter table public.%I add constraint %I check (%s) not valid', c.tbl, c.name, c.expr);
    end if;
  end loop;
end $$;

-- ============================================================
-- STORAGE: cartelle per utente, file privati, tipi e dimensioni
-- ============================================================
insert into storage.buckets (id, name, public) values ('letterheads', 'letterheads', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('verifiche', 'verifiche', false) on conflict (id) do nothing;
update storage.buckets set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'] where id = 'letterheads';
update storage.buckets set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'] where id = 'verifiche';

drop policy if exists letterheads_read on storage.objects;
drop policy if exists letterheads_write on storage.objects;
drop policy if exists letterheads_delete on storage.objects;
create policy letterheads_read on storage.objects for select to authenticated
  using (bucket_id = 'letterheads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy letterheads_write on storage.objects for insert to authenticated
  with check (bucket_id = 'letterheads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy letterheads_delete on storage.objects for delete to authenticated
  using (bucket_id = 'letterheads' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists verifiche_read on storage.objects;
drop policy if exists verifiche_write on storage.objects;
drop policy if exists verifiche_delete on storage.objects;
create policy verifiche_read on storage.objects for select to authenticated
  using (bucket_id = 'verifiche' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_app_admin()));
create policy verifiche_write on storage.objects for insert to authenticated
  with check (bucket_id = 'verifiche' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy verifiche_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verifiche' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_app_admin()));

-- ============================================================
-- REALTIME: solo i messaggi (gli eventi rispettano le policy RLS)
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when others then
  null; -- già presente o pubblicazione non disponibile
end $$;
