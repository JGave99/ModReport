# Query utili (Supabase → SQL Editor)

Query pronte da incollare nel SQL Editor di Supabase. Valgono per entrambi i progetti (produzione e prova).

Prima di eseguire:
- controlla in alto a sinistra **in quale progetto sei**;
- non selezionare parte del testo: il SQL Editor esegue solo la selezione.

Sono tutte in sola lettura, tranne la 3, che è segnata. Il test `tests/sql/produzione.test.mjs` le prova a ogni modifica dello schema.

## 1. Stato delle migrazioni

Dice quali migrazioni risultano applicate, controllando per ognuna un oggetto che crea. Tutte le righe devono essere `true`. A ogni nuova migrazione va aggiunta una riga.

```sql
select migrazione, applicata from (values
  ('20261004120000_baseline', to_regclass('public.user_data') is not null),
  ('20261004120100_teams', to_regclass('public.teams') is not null),
  ('20261004120200_security', exists (select 1 from pg_proc where proname = 'mfa_ok')),
  ('20261004130000_privacy', to_regclass('public.consent_log') is not null),
  ('20261005120000_libreria', to_regclass('public.library_versions') is not null),
  ('20261016120000_utenti-collegamenti', not exists (select 1 from pg_constraint where contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'a')),
  ('20261016130000_pulizia-versione-precedente', not exists (select 1 from pg_proc where proname = 'copy_base_preset_to_new_user')),
  ('20261021120000_admin-elimina-utenti', exists (select 1 from pg_proc where proname = 'admin_delete_user')),
  ('20261023120000_team-turni', exists (select 1 from pg_proc where proname = 'calendar_feed_events'))
) as m (migrazione, applicata);
```

## 2. Utenti registrati

Per ogni utente mostra:
- se ha confermato l'email;
- l'ultimo accesso;
- se ha attivato la verifica in due passaggi;
- se è amministratore.

Utile quando qualcuno dice di non riuscire a entrare o di non aver ricevuto l'email.

```sql
select u.email,
       u.created_at::date as registrato,
       u.email_confirmed_at is not null as email_confermata,
       u.last_sign_in_at as ultimo_accesso,
       exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified') as due_passaggi,
       exists (select 1 from public.app_admins a where a.user_id = u.id) as amministratore
from auth.users u
order by u.created_at desc;
```

## 3. Rendere amministratore un utente (modifica i dati)

Cambiare l'email prima di eseguire. Per togliere il ruolo, usare `delete from public.app_admins where user_id = (select id from auth.users where email = '...');`.

```sql
insert into public.app_admins (user_id)
select id from auth.users where email = 'iacopo.gavesidr@gmail.com'
on conflict do nothing;
```

## 4. Chi ha accettato l'informativa in vigore

`2026-10-23` è la versione attuale, cioè `PRIVACY_VERSION` in `js/legal-config.js`: va aggiornata quando cambia. Chi ha la data vuota la accetterà al prossimo accesso.

```sql
select u.email,
       max(c.accepted_at) filter (where c.kind = 'privacy' and c.version = '2026-10-23') as privacy_accettata
from auth.users u
left join public.consent_log c on c.user_id = u.id
group by u.email
order by 2 nulls first;
```

## 5. Team e richieste in attesa

```sql
select t.nome, t.tipo, t.sede, t.richiede_approvazione,
       count(m.user_id) filter (where m.stato = 'attivo') as membri,
       count(m.user_id) filter (where m.stato = 'in_attesa') as in_attesa
from public.teams t
left join public.team_members m on m.team_id = t.id
group by t.id
order by t.nome;
```

## 6. Quanto è usato il servizio

Il piano gratuito di Supabase ha un limite di 500 MB per il database.

```sql
select (select count(*) from auth.users) as utenti,
       (select count(*) from public.user_data) as librerie,
       (select count(*) from public.library_versions) as versioni_salvate,
       (select count(*) from public.teams) as team,
       (select count(*) from public.messages) as messaggi,
       (select count(*) from public.shifts) as turni,
       pg_size_pretty(pg_database_size(current_database())) as spazio_database;
```

## 7. Account eliminati dagli amministratori

```sql
select a.created_at as quando, ad.email as amministratore, a.target_id as utente_eliminato
from public.admin_actions a
left join auth.users ad on ad.id = a.admin_id
order by a.created_at desc;
```
