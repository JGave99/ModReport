-- Schema del progetto Supabase di PRODUZIONE com'era il 16/10/2026, prima delle migrazioni del repository
-- (letto dal catalogo: vincoli, colonne, funzioni, bucket). I corpi delle funzioni non erano disponibili:
-- qui hanno firme plausibili e corpi semplici, quanto basta per verificare che le migrazioni le sostituiscano.
-- Serve a tests/sql/produzione.test.mjs: le migrazioni devono applicarsi senza errori su questo schema.

create table public.app_admins (
  user_id uuid not null primary key references auth.users (id)
);
create table public.app_presets (
  name text not null primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.channels (
  id uuid not null default gen_random_uuid() primary key,
  nome text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz default now()
);
create table public.channel_reads (
  user_id uuid not null references auth.users (id),
  channel_id uuid not null references public.channels (id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (user_id, channel_id)
);
create table public.letterheads (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id),
  nome text not null,
  storage_path text not null,
  margine_top numeric not null default 40,
  margine_left numeric not null default 20,
  margine_right numeric not null default 20,
  created_at timestamptz default now()
);
create table public.messages (
  id uuid not null default gen_random_uuid() primary key,
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  nome_mittente text not null,
  testo text not null,
  created_at timestamptz default now()
);
create table public.report_archive (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id),
  esame text,
  testo text not null,
  created_at timestamptz default now()
);
create table public.subscriptions (
  user_id uuid not null primary key references auth.users (id),
  plan text not null check (plan = any (array['specializzando', 'base', 'pro'])),
  status text not null default 'incomplete' check (status = any (array['active', 'trialing', 'past_due', 'canceled', 'incomplete'])),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.team_invites (
  code text not null primary key,
  created_by uuid not null references auth.users (id),
  created_at timestamptz default now()
);
create table public.team_members (
  user_id uuid not null primary key references auth.users (id),
  nome text not null,
  role text not null default 'member' check (role = any (array['admin', 'member'])),
  joined_at timestamptz default now()
);
create table public.user_data (
  user_id uuid not null primary key references auth.users (id),
  data jsonb not null,
  updated_at timestamptz default now()
);
create table public.verification_requests (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id),
  storage_path text not null,
  status text not null default 'in_attesa' check (status = any (array['in_attesa', 'approvato', 'rifiutato'])),
  note_admin text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  email text
);
-- I nomi dei vincoli CHECK in produzione: <tabella>_<colonna>_check (come li genera Postgres).

do $$
declare t text;
begin
  foreach t in array array['app_admins', 'app_presets', 'channels', 'channel_reads', 'letterheads', 'messages',
    'report_archive', 'subscriptions', 'team_invites', 'team_members', 'user_data', 'verification_requests'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Funzioni della versione precedente (firme plausibili; is_team_member riceve l'utente, come in produzione).
create function public.is_app_admin() returns boolean language sql stable security definer as
  $f$ select exists (select 1 from public.app_admins where user_id = auth.uid()) $f$;
create function public.is_team_member(check_user_id uuid) returns boolean language sql stable security definer as
  $f$ select exists (select 1 from public.team_members where user_id = check_user_id) $f$;
create function public.is_team_admin(check_user_id uuid) returns boolean language sql stable security definer as
  $f$ select exists (select 1 from public.team_members where user_id = check_user_id and role = 'admin') $f$;
create function public.team_exists() returns boolean language sql stable security definer as
  $f$ select exists (select 1 from public.team_members) $f$;
create function public.has_chat_access(check_user_id uuid) returns boolean language sql stable security definer as
  $f$ select public.is_team_member(check_user_id) $f$;
create function public.has_reporting_access(check_user_id uuid) returns boolean language sql stable security definer as
  $f$ select true $f$;
create function public.join_team_with_code(code text, nome text) returns boolean language plpgsql security definer as
  $f$ begin insert into public.team_members (user_id, nome) values (auth.uid(), nome); return true; end $f$;
create function public.list_app_users() returns table (id uuid, email text) language sql security definer as
  $f$ select id, email from auth.users $f$;
create function public.delete_my_account() returns void language sql security definer as
  $f$ delete from auth.users where id = auth.uid() $f$;
create function public.update_my_display_name(nuovo text) returns void language sql security definer as
  $f$ update public.team_members set nome = nuovo where user_id = auth.uid() $f$;
create function public.copy_base_preset_to_new_user() returns trigger language plpgsql security definer as
  $f$ begin
    insert into public.user_data (user_id, data) select new.id, data from public.app_presets where name = 'base'
      on conflict (user_id) do nothing;
    return new;
  end $f$;
create trigger on_auth_user_created_copy_preset after insert on auth.users
  for each row execute function public.copy_base_preset_to_new_user();

-- Policy della versione precedente (si appoggiano alle vecchie funzioni).
create policy "Membri leggono i canali" on public.channels for select to authenticated using (public.is_team_member(auth.uid()));
create policy "Membri leggono i messaggi" on public.messages for select to authenticated using (public.has_chat_access(auth.uid()));
create policy "Admin gestisce i membri" on public.team_members for all to authenticated using (public.is_team_admin(auth.uid()));
create policy "Utente legge i suoi dati" on public.user_data for all to authenticated using (user_id = auth.uid());
create policy "Utente legge il suo abbonamento" on public.subscriptions for select to authenticated using (user_id = auth.uid());
create policy "Tutti leggono i preset" on public.app_presets for select to authenticated using (true);
create policy "Carte intestate personali" on storage.objects for all to authenticated
  using (bucket_id = 'letterheads' and (storage.foldername(name))[1] = auth.uid()::text);

insert into storage.buckets (id, name, public) values ('letterheads', 'letterheads', false), ('verifiche', 'verifiche', false);
