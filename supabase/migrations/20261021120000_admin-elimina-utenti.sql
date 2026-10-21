-- ModReport — gli amministratori del sito possono eliminare l'account di altri utenti (issue #3).
-- La cancellazione dei dati è in una funzione unica, usata sia da delete_my_account sia da admin_delete_user.
-- I file nello storage si cancellano prima dal browser con l'API dello storage (così spariscono davvero
-- anche dal disco): le funzioni rifiutano l'eliminazione finché l'utente ha ancora file caricati.

-- ============================================================
-- REGISTRO DELLE AZIONI DEGLI AMMINISTRATORI
-- Chi ha eliminato quale account e quando. Dell'utente eliminato resta solo l'identificativo.
-- ============================================================
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('elimina_utente')),
  target_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.admin_actions enable row level security;
revoke all on public.admin_actions from anon;
drop policy if exists admin_actions_select on public.admin_actions;
create policy admin_actions_select on public.admin_actions for select to authenticated using (public.is_app_admin());
drop policy if exists mfa_required on public.admin_actions;
create policy mfa_required on public.admin_actions as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());

-- ============================================================
-- CANCELLAZIONE DI UN UTENTE (uso interno)
-- ============================================================
create or replace function public.user_has_files(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from storage.objects
    where owner = p_user or owner_id = p_user::text
       or (bucket_id in ('letterheads', 'verifiche') and (storage.foldername(name))[1] = p_user::text)
  );
$$;

create or replace function public.delete_user_data(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t record;
  heir uuid;
begin
  -- I team di cui era proprietario passano al membro più anziano (prima gli amministratori) o si chiudono.
  for t in select team_id from public.team_members where user_id = p_user and role = 'owner' loop
    select user_id into heir from public.team_members
      where team_id = t.team_id and user_id <> p_user order by (role = 'admin') desc, joined_at asc limit 1;
    if heir is null then
      delete from public.teams where id = t.team_id;
    else
      update public.team_members set role = 'owner' where team_id = t.team_id and user_id = heir;
    end if;
  end loop;
  delete from public.messages where user_id = p_user;
  delete from public.team_members where user_id = p_user;
  delete from public.report_archive where user_id = p_user;
  delete from public.letterheads where user_id = p_user;
  delete from public.user_data where user_id = p_user;
  delete from public.verification_requests where user_id = p_user;
  delete from public.profiles where id = p_user;
  delete from auth.users where id = p_user;
end $$;

-- ============================================================
-- ELIMINAZIONE DEL PROPRIO ACCOUNT (stesso comportamento di prima)
-- ============================================================
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if public.user_has_files(me) then
    raise exception 'Elimina prima i file caricati (carte intestate, documenti)' using errcode = '55000';
  end if;
  perform public.delete_user_data(me);
end $$;

-- ============================================================
-- ELIMINAZIONE DI UN ALTRO UTENTE (solo amministratori del sito)
-- ============================================================
create or replace function public.admin_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null or not public.is_app_admin() then raise exception 'Permesso negato' using errcode = '42501'; end if;
  if not public.mfa_ok() then raise exception 'Serve la verifica in due passaggi' using errcode = '42501'; end if;
  if p_user is null or p_user = me then
    raise exception 'Per il tuo account usa "Elimina account" nella pagina Account' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'Utente non trovato' using errcode = 'P0002'; end if;
  if exists (select 1 from public.app_admins where user_id = p_user) then
    raise exception 'Non si può eliminare un altro amministratore' using errcode = '42501';
  end if;
  if public.user_has_files(p_user) then
    raise exception 'L''utente ha ancora file caricati: eliminali prima' using errcode = '55000';
  end if;
  insert into public.admin_actions (admin_id, action, target_id) values (me, 'elimina_utente', p_user);
  perform public.delete_user_data(p_user);
end $$;

revoke all on function public.user_has_files(uuid) from public, anon, authenticated;
revoke all on function public.delete_user_data(uuid) from public, anon, authenticated;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ============================================================
-- STORAGE: per eliminare un account l'amministratore deve poter vedere e cancellare le carte intestate
-- dell'utente (i documenti di verifica li gestiva già).
-- ============================================================
drop policy if exists letterheads_admin_read on storage.objects;
create policy letterheads_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'letterheads' and public.is_app_admin());
drop policy if exists letterheads_admin_delete on storage.objects;
create policy letterheads_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'letterheads' and public.is_app_admin());
