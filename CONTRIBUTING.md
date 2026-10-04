# Come lavorare sul progetto

Il 24/09 e il 03/10/2026 due caricamenti di file vecchi direttamente su `main` hanno cancellato funzioni in produzione. Per evitarlo:

1. **Mai modificare `main` dall'interfaccia web di GitHub.** Ogni modifica parte da un branch: `git switch -c nome-modifica`.
2. **Pull request** verso `main`, con descrizione di cosa cambia e come è stato provato.
3. La **CI deve essere verde** (sintassi, test unitari, regole del database, test nel browser).
4. Almeno una **revisione** da parte di un'altra persona per le modifiche a sicurezza, database o stampa.
5. Le modifiche al database vanno in un **nuovo file** in `supabase/migrations/` (mai modificare quelli già applicati) con il relativo test in `tests/sql/`.
6. Prima di unire: aggiornare `CHANGELOG.md`.

## Impostazioni consigliate su GitHub
- Settings → Branches → regola di protezione per `main`: pull request obbligatoria, CI obbligatoria, niente push diretti.
- Settings → Pages: pubblicazione solo da `main` (oppure spostare l'hosting, vedi `docs/PIANO-LAVORI.md`).

## Stile
- Testi dell'interfaccia in italiano, chiari e brevi.
- Niente script inline nelle pagine (la CSP li blocca): il codice va in `js/pages/` o `js/lib/`.
- Dati inseriti dagli utenti sempre con `textContent` o `escapeHtml()` di `js/lib/dom.js`.
- Nessun dato dei pazienti deve finire nel cloud: in caso di dubbio, chiedere prima.
