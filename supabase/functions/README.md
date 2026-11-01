# Funzioni del server (Supabase Edge Functions)

| Funzione | A cosa serve | Accesso |
|---|---|---|
| `turni-ics` | calendario dei turni di un utente per Google Calendar e simili (link segreto creato in Account → Turni) | pubblica, protetta dal token nel link |

`_shared/ics.js` è una copia identica di `js/lib/ics.js` (un test lo controlla): dopo una modifica
`cp js/lib/ics.js supabase/functions/_shared/ics.js`.

## Pubblicazione
Una volta sola: `brew install supabase/tap/supabase` e `supabase login` (apre il browser).
```bash
supabase functions deploy turni-ics --no-verify-jwt --project-ref blwcqwajcjklgzgbfdfc
supabase functions deploy turni-ics --no-verify-jwt --project-ref umejthggxihtyqvcszgm
```
Il primo è il progetto di prova, il secondo la produzione (prima del merge su `main`, insieme alla migrazione
`20261023120000_team-turni.sql`). `--no-verify-jwt` serve perché Google legge il calendario senza accedere.
