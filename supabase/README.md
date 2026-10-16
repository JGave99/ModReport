# Database Supabase — schema, regole di accesso, test

Le regole di sicurezza vere stanno qui (RLS, funzioni, trigger, policy dello Storage): il codice del browser può essere aggirato.

## File

| File | Contenuto |
|---|---|
| `migrations/20261004120000_baseline.sql` | Tabelle usate dall'app (idempotente, non tocca i dati esistenti) |
| `migrations/20261004120100_teams.sql` | Team per organizzazione; converte il team unico in "Team ModReport" e fa scadere i vecchi inviti |
| `migrations/20261004120200_security.sql` | RLS, funzioni RPC, trigger, limiti di dimensione, Storage, MFA obbligatoria per chi l'ha attivata |
| `migrations/20261004130000_privacy.sql` | Consensi (versioni di termini e informativa), registro dei consensi |
| `migrations/20261005120000_libreria.sql` | Versioni salvate della libreria (ultime 30) e libreria condivisa del team |
| `migrations/20261016120000_utenti-collegamenti.sql` | Cosa succede ai dati quando un utente viene eliminato (in produzione mancava: l'eliminazione dell'account falliva) |
| `migrations/20261016130000_pulizia-versione-precedente.sql` | Toglie trigger e funzioni della versione precedente non più usati (copia della vecchia libreria base ai nuovi utenti) |
| `tests/supabase-shim.sql` | Ambiente Supabase minimo per i test (non va applicato in produzione) |
| `tests/produzione-2026-10-16.sql` | Schema reale della produzione prima delle migrazioni: `tests/sql/produzione.test.mjs` verifica che si applichino senza errori |

Test: `npm run test:sql` esegue le migrazioni su un Postgres in memoria (PGlite) e verifica le regole con utenti di prova.

## Come applicarle in produzione

1. **Backup** del database (Database → Backups, oppure `supabase db dump`).
2. Confronto con lo schema reale: `supabase link --project-ref umejthggxihtyqvcszgm` e poi `supabase db pull`. Controllare differenze di colonne, tipi e vincoli rispetto a `20261004120000_baseline.sql`.
3. Provarle prima su un progetto di **staging** (copia dei dati o dati finti).
4. Applicarle: `supabase db push` (oppure SQL Editor, un file alla volta, nell'ordine).
5. In **Authentication → Policies**: lunghezza minima della password 12; attivare la protezione contro le password compromesse (piano Pro).
6. In **Authentication → Multi-Factor**: attivare TOTP.
7. **Advisors → Security Advisor**: deve risultare senza avvisi sulle tabelle `public`.
8. Pubblicare il nuovo codice del sito subito dopo: la pagina Team usa le nuove funzioni (`create_team`, `create_team_invite`…).

Note:
- La migrazione di sicurezza **elimina tutte le policy preesistenti** delle tabelle dell'app e quelle dello Storage che riguardano i bucket `letterheads` e `verifiche`, comprese quelle create a mano dalla dashboard, e le ricrea.
- I vincoli di dimensione sono `NOT VALID`: valgono per i nuovi dati e non bloccano quelli già presenti.
- I file nello Storage si cancellano solo dall'app (API Storage): `delete_my_account()` rifiuta l'eliminazione finché l'utente ha ancora file.
