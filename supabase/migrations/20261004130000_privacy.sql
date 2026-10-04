-- ModReport — privacy: archivio dei referti solo locale, consensi registrati dal server.

-- L'archivio dei referti ora resta nel browser: niente nuovi inserimenti nel cloud.
-- Restano lettura ed eliminazione, per spostare sul computer i referti salvati in passato.
drop policy if exists report_archive_insert on public.report_archive;

-- ============================================================
-- CONSENSI (Termini, clausole artt. 1341-1342 c.c., informativa)
-- ============================================================
alter table public.profiles add column if not exists terms_version text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists clauses_accepted_at timestamptz;
alter table public.profiles add column if not exists privacy_version text;
alter table public.profiles add column if not exists privacy_seen_at timestamptz;

-- Registro delle accettazioni. Dopo la cancellazione dell'account resta solo l'identificativo
-- pseudonimo (user_ref) con data e versione, a prova dell'accettazione.
create table if not exists public.consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_ref uuid not null,
  kind text not null check (kind in ('termini', 'clausole', 'privacy')),
  version text not null,
  accepted_at timestamptz not null default now(),
  user_agent text
);
create index if not exists consent_log_user_idx on public.consent_log (user_id);
alter table public.consent_log enable row level security;
drop policy if exists consent_log_select on public.consent_log;
create policy consent_log_select on public.consent_log for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists mfa_required on public.consent_log;
create policy mfa_required on public.consent_log as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());

-- I campi del consenso li scrive solo il server (accept_terms / registrazione), con la sua ora.
create or replace function public.profiles_touch()
returns trigger language plpgsql set search_path = '' as $$
declare
  trusted boolean := coalesce(current_setting('modreport.consent', true), '') = 'on';
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
    if not trusted then
      new.terms_version := null; new.terms_accepted_at := null; new.clauses_accepted_at := null;
      new.privacy_version := null; new.privacy_seen_at := null;
    end if;
  else
    new.created_at := old.created_at;
    new.id := old.id;
    if not trusted then
      new.terms_version := old.terms_version; new.terms_accepted_at := old.terms_accepted_at;
      new.clauses_accepted_at := old.clauses_accepted_at; new.privacy_version := old.privacy_version;
      new.privacy_seen_at := old.privacy_seen_at;
    end if;
  end if;
  return new;
end $$;

create or replace function public.record_consent(p_user uuid, p_terms text, p_privacy text, p_user_agent text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('modreport.consent', 'on', true);
  insert into public.profiles (id) values (p_user) on conflict (id) do nothing;
  update public.profiles
     set terms_version = left(p_terms, 20), terms_accepted_at = now(), clauses_accepted_at = now(),
         privacy_version = left(p_privacy, 20), privacy_seen_at = now()
   where id = p_user;
  insert into public.consent_log (user_id, user_ref, kind, version, user_agent) values
    (p_user, p_user, 'termini', left(p_terms, 20), left(p_user_agent, 300)),
    (p_user, p_user, 'clausole', left(p_terms, 20), left(p_user_agent, 300)),
    (p_user, p_user, 'privacy', left(p_privacy, 20), left(p_user_agent, 300));
  perform set_config('modreport.consent', 'off', true);
end $$;
revoke all on function public.record_consent(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.accept_terms(p_terms_version text, p_privacy_version text, p_clauses boolean, p_user_agent text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if coalesce(btrim(p_terms_version), '') = '' or coalesce(btrim(p_privacy_version), '') = '' then
    raise exception 'Versione dei documenti mancante' using errcode = '22023';
  end if;
  if not coalesce(p_clauses, false) then
    raise exception 'Serve l''approvazione specifica delle clausole indicate nei Termini' using errcode = '22023';
  end if;
  perform public.record_consent(auth.uid(), p_terms_version, p_privacy_version, p_user_agent);
end $$;
revoke all on function public.accept_terms(text, text, boolean, text) from public, anon;
grant execute on function public.accept_terms(text, text, boolean, text) to authenticated;

-- Registrazione: il consenso dato nel modulo arriva nei metadati dell'utente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome, cognome)
  values (new.id, left(new.raw_user_meta_data ->> 'nome', 80), left(new.raw_user_meta_data ->> 'cognome', 80))
  on conflict (id) do nothing;
  if coalesce((new.raw_user_meta_data ->> 'clauses_accepted')::boolean, false)
     and coalesce(new.raw_user_meta_data ->> 'terms_version', '') <> ''
     and coalesce(new.raw_user_meta_data ->> 'privacy_version', '') <> '' then
    perform public.record_consent(new.id, new.raw_user_meta_data ->> 'terms_version',
      new.raw_user_meta_data ->> 'privacy_version', 'registrazione');
  end if;
  return new;
end $$;
