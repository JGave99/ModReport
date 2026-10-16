-- ModReport — collegamenti con auth.users: cosa succede ai dati quando un utente viene eliminato.
-- In produzione le tabelle erano state create senza "on delete": l'eliminazione dell'account
-- (delete_my_account, o dalla dashboard) falliva se l'utente aveva letto un canale, creato un invito o un canale.
-- Dati personali dell'utente: si cancellano con lui. Autore di contenuti del team: resta il contenuto, senza autore.

do $$
declare
  spec record;
  c record;
begin
  for spec in
    select * from (values
      ('user_data', 'user_id', 'cascade'),
      ('report_archive', 'user_id', 'cascade'),
      ('letterheads', 'user_id', 'cascade'),
      ('app_admins', 'user_id', 'cascade'),
      ('verification_requests', 'user_id', 'cascade'),
      ('verification_requests', 'reviewed_by', 'set null'),
      ('team_members', 'user_id', 'cascade'),
      ('channels', 'created_by', 'set null'),
      ('messages', 'user_id', 'cascade'),
      ('channel_reads', 'user_id', 'cascade'),
      ('team_invites', 'created_by', 'cascade'),
      ('subscriptions', 'user_id', 'cascade')
    ) as t (tbl, col, action)
  loop
    continue when to_regclass('public.' || spec.tbl) is null;
    -- Toglie i vincoli esistenti da quella colonna verso auth.users, qualunque nome abbiano.
    for c in
      select con.conname from pg_constraint con
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
      where con.conrelid = ('public.' || spec.tbl)::regclass and con.contype = 'f'
        and con.confrelid = 'auth.users'::regclass and att.attname = spec.col and array_length(con.conkey, 1) = 1
    loop
      execute format('alter table public.%I drop constraint %I', spec.tbl, c.conname);
    end loop;
    execute format('alter table public.%I add constraint %I foreign key (%I) references auth.users (id) on delete %s',
      spec.tbl, spec.tbl || '_' || spec.col || '_fkey', spec.col, spec.action);
  end loop;
end $$;
