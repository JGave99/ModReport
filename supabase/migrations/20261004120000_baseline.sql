-- ModReport — schema di base (ricostruito dal codice del client, 04/10/2026).
-- Idempotente: crea solo ciò che manca e non modifica dati esistenti.
-- Prima di applicarlo in produzione: backup + confronto con `supabase db pull`.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data add column if not exists updated_at timestamptz not null default now();

create table if not exists public.report_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  esame text,
  testo text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.letterheads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  storage_path text not null,
  margine_top numeric not null default 40,
  margine_left numeric not null default 20,
  margine_right numeric not null default 20,
  created_at timestamptz not null default now()
);

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  storage_path text not null,
  status text not null default 'in_attesa',
  note_admin text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

-- Team nella forma originaria (un solo team per tutto il sito).
-- La migrazione successiva introduce le organizzazioni (tabella teams).
create table if not exists public.team_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text,
  role text not null default 'member',
  joined_at timestamptz not null default now()
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  nome_mittente text,
  testo text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.channel_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);

create table if not exists public.team_invites (
  code text primary key,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Profilo dell'utente: nome visualizzato, titolo per la firma, consensi (Step 3).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  cognome text,
  titolo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
