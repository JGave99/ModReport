-- ModReport — pulizia degli oggetti della versione precedente rimasti in produzione.
-- - trg_copy_base_preset copiava ai nuovi utenti la vecchia libreria base (app_presets): ora la libreria
--   predefinita arriva dal client e il primo accesso apre la configurazione guidata;
-- - has_chat_access, has_reporting_access, team_exists: funzioni SECURITY DEFINER non più usate
--   (has_chat_access si appoggiava alla vecchia is_team_member, già sostituita).
-- La tabella app_presets resta (solo dati, nessun uso): si potrà eliminare in seguito.

drop trigger if exists trg_copy_base_preset on auth.users;

do $$
declare
  f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('copy_base_preset_to_new_user', 'has_chat_access', 'has_reporting_access', 'team_exists')
  loop
    execute format('drop function %s', f);
  end loop;
end $$;
