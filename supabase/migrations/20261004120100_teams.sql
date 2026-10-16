-- ModReport — team per organizzazione (fine del team unico globale).
-- Converte i dati esistenti: tutti i membri, canali e inviti attuali finiscono in un team
-- "Team ModReport" il cui proprietario è il primo amministratore. Gli inviti esistenti
-- (generati dal browser, senza scadenza) vengono fatti scadere.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.team_members add column if not exists team_id uuid references public.teams (id) on delete cascade;
alter table public.channels add column if not exists team_id uuid references public.teams (id) on delete cascade;
alter table public.team_invites add column if not exists team_id uuid references public.teams (id) on delete cascade;
alter table public.team_invites add column if not exists expires_at timestamptz;
alter table public.team_invites add column if not exists max_uses integer not null default 10;
alter table public.team_invites add column if not exists uses integer not null default 0;
alter table public.team_invites add column if not exists revoked_at timestamptz;

-- Ruoli: in produzione c'era un vincolo con i soli 'admin' e 'member'; i team hanno anche il proprietario.
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check check (role in ('owner', 'admin', 'member'));

do $$
declare
  legacy_team uuid;
  legacy_owner uuid;
begin
  if exists (select 1 from public.team_members where team_id is null)
     or exists (select 1 from public.channels where team_id is null)
     or exists (select 1 from public.team_invites where team_id is null) then
    select user_id into legacy_owner from public.team_members
      where team_id is null order by (role = 'admin') desc, joined_at asc limit 1;
    insert into public.teams (nome, created_by) values ('Team ModReport', legacy_owner) returning id into legacy_team;
    update public.team_members set team_id = legacy_team where team_id is null;
    update public.channels set team_id = legacy_team where team_id is null;
    update public.team_invites set team_id = legacy_team where team_id is null;
    update public.team_members set role = 'owner' where team_id = legacy_team and user_id = legacy_owner;
  end if;
end $$;

update public.team_invites set expires_at = least(created_at + interval '7 days', now()) where expires_at is null;

-- Inviti senza team (nessun membro esistente): non più utilizzabili.
delete from public.team_invites where team_id is null;

alter table public.team_members alter column team_id set not null;
alter table public.channels alter column team_id set not null;
alter table public.team_invites alter column team_id set not null;
alter table public.team_invites alter column expires_at set not null;
alter table public.team_invites alter column expires_at set default now() + interval '7 days';

-- Chiave primaria di team_members: da (user_id) a (team_id, user_id).
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.team_members'::regclass and con.contype in ('p', 'u')
      and (select array_agg(att.attname::text order by att.attname)
           from unnest(con.conkey) k join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k)
          = array['user_id']
  loop
    execute format('alter table public.team_members drop constraint %I', c.conname);
  end loop;
  if not exists (select 1 from pg_constraint where conrelid = 'public.team_members'::regclass and contype = 'p') then
    alter table public.team_members add constraint team_members_pkey primary key (team_id, user_id);
  end if;
end $$;

create index if not exists team_members_user_idx on public.team_members (user_id);
create index if not exists channels_team_idx on public.channels (team_id);
create index if not exists messages_channel_created_idx on public.messages (channel_id, created_at desc);
create index if not exists team_invites_team_idx on public.team_invites (team_id);
