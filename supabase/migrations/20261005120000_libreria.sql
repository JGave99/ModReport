-- ModReport — Step 6: versioni salvate della libreria personale e libreria condivisa del team.

-- ============================================================
-- VERSIONI DELLA LIBRERIA PERSONALE
-- Copie salvate a mano o in automatico (prima di un ripristino, di un'importazione da file o di un
-- aggiornamento dei predefiniti). Si tengono le ultime 30 per utente; non si modificano.
-- ============================================================
create table if not exists public.library_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  label text not null default '' check (char_length(label) <= 80),
  reason text not null default 'manuale' check (reason in ('manuale', 'ripristino', 'importazione', 'aggiornamento')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 1048576)
);
create index if not exists library_versions_user_idx on public.library_versions (user_id, created_at desc);
alter table public.library_versions enable row level security;

drop policy if exists library_versions_select on public.library_versions;
drop policy if exists library_versions_insert on public.library_versions;
drop policy if exists library_versions_delete on public.library_versions;
create policy library_versions_select on public.library_versions for select to authenticated using (user_id = (select auth.uid()));
create policy library_versions_insert on public.library_versions for insert to authenticated with check (user_id = (select auth.uid()));
create policy library_versions_delete on public.library_versions for delete to authenticated using (user_id = (select auth.uid()));

-- Data decisa dal server e solo le ultime 30 versioni.
create or replace function public.library_versions_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.created_at := now();
  return new;
end $$;

create or replace function public.library_versions_trim()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.library_versions
   where user_id = new.user_id
     and id in (select id from public.library_versions where user_id = new.user_id order by created_at desc, id desc offset 30);
  return null;
end $$;

drop trigger if exists library_versions_guard on public.library_versions;
create trigger library_versions_guard before insert on public.library_versions for each row execute function public.library_versions_guard();
drop trigger if exists library_versions_trim on public.library_versions;
create trigger library_versions_trim after insert on public.library_versions for each row execute function public.library_versions_trim();

-- ============================================================
-- LIBRERIA CONDIVISA DEL TEAM (studio o reparto)
-- La leggono tutti i membri; la creano e la modificano proprietario e amministratori.
-- updated_at è scelto dal client per il controllo dei conflitti (come user_data).
-- ============================================================
create table if not exists public.team_libraries (
  team_id uuid primary key references public.teams (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 2097152),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.team_libraries enable row level security;

drop policy if exists team_libraries_select on public.team_libraries;
drop policy if exists team_libraries_insert on public.team_libraries;
drop policy if exists team_libraries_update on public.team_libraries;
drop policy if exists team_libraries_delete on public.team_libraries;
create policy team_libraries_select on public.team_libraries for select to authenticated using (public.is_team_member(team_id));
create policy team_libraries_insert on public.team_libraries for insert to authenticated with check (public.is_team_admin(team_id));
create policy team_libraries_update on public.team_libraries for update to authenticated
  using (public.is_team_admin(team_id)) with check (public.is_team_admin(team_id));
create policy team_libraries_delete on public.team_libraries for delete to authenticated using (public.is_team_admin(team_id));

-- Autore dell'ultima modifica deciso dal server; il team non si può cambiare.
create or replace function public.team_libraries_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' then new.team_id := old.team_id; end if;
  return new;
end $$;

drop trigger if exists team_libraries_guard on public.team_libraries;
create trigger team_libraries_guard before insert or update on public.team_libraries for each row execute function public.team_libraries_guard();

-- ============================================================
-- VERIFICA IN DUE PASSAGGI anche per le nuove tabelle
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array['library_versions', 'team_libraries'] loop
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok())', t);
  end loop;
end $$;

-- Le funzioni dei trigger non si chiamano direttamente.
revoke all on function public.library_versions_guard() from public, anon, authenticated;
revoke all on function public.library_versions_trim() from public, anon, authenticated;
revoke all on function public.team_libraries_guard() from public, anon, authenticated;
