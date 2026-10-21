# ModReport

Strumento di scrittura per la refertazione radiologica: si compone il referto da frasi personalizzabili (metodica → esame → indicazione → confronto → reperti), si detta, si copia nel RIS o si stampa su carta intestata. Libreria sincronizzata nel cloud, archivio dei referti solo locale, team per organizzazione.

> ModReport non è un dispositivo medico: non fornisce diagnosi né classificazioni (vedi `docs/legale/destinazione-uso.md`).

## Struttura

| Percorso | Contenuto |
|---|---|
| `*.html` | Pagine (sito statico, nessuna build) |
| `js/pages/` | Logica di ogni pagina (moduli ES) |
| `js/lib/` | Moduli condivisi: client Supabase, libreria, PDF, dettatura, sessione, archivio locale, modalità locale… |
| `js/config.js` | Configurazione Supabase (unico punto con URL e chiave) |
| `js/legal-config.js` | Dati legali del titolare (informativa, termini, piè di pagina) |
| `js/lib/library-base/` | Libreria predefinita (`preset.js`, generata da `scripts/preset-da-libreria.mjs`) e versioni precedenti per gli aggiornamenti; vedi `docs/libreria-revisione.md` |
| `js/site-config.js`, `js/pricing-config.js` | Contenuti della landing: fondatori, testimonianze, listino (nascosto finché non è pubblicato) |
| `css/` | Design system: `tokens.css` (colori, tipografia, spaziature, tema chiaro), `base.css`, `components.css`, `pages/` |
| `assets/` | Logo, icone Lucide (`icons.svg`), immagini della landing, font e librerie di terze parti in locale |
| `supabase/` | Schema, regole di accesso (RLS) e funzioni del database — vedi `supabase/README.md` |
| `tests/` | Test unitari, SQL (PGlite) ed end-to-end (Playwright) |
| `docs/` | Piano lavori, configurazione delle dashboard, documenti legali |

## Sviluppo

```bash
npm install          # dipendenze di sviluppo (librerie, test)
npm run serve        # sito su http://127.0.0.1:8765 (senza cache)
```

- `http://127.0.0.1:8765/app.html?fake=1` usa un **backend finto in memoria** (utente `demo@modreport.test` / `password-demo-123`): si sviluppa senza toccare i dati reali. `?fake=0` lo disattiva. Funziona solo su localhost.
- "Prova senza account" nella schermata di accesso (o `app.html?local=1`) attiva la **modalità locale**: tutto resta nel browser.
- `npm run icons` rigenera lo sprite `assets/icons.svg` (elenco in `scripts/icons.mjs`); `npm run render-icons` le icone PNG e il favicon; `npm run screenshots` le immagini della landing e quella per le anteprime dei link, dall'editor vero con il backend finto.

## Test

```bash
npm run lint         # sintassi di tutti i file JavaScript
npm test             # test unitari + regole del database (RLS) su Postgres in memoria
npm run test:e2e     # test nel browser (Playwright) sul backend finto
npm run check:lancio # cosa manca prima della pubblicazione (dati legali, hosting, chiavi)
```

La CI (`.github/workflows/ci.yml`) esegue tutto a ogni pull request.

## Librerie di terze parti

Le librerie del browser sono copiate in `assets/vendor/` con `npm run vendor` (versioni in `assets/vendor/VERSIONS.json`, licenze in `assets/vendor/licenses/`). Per aggiornarle: cambiare la versione in `package.json`, `npm install`, `npm run vendor`, eseguire i test.

## Pubblicazione

Il sito è statico: si pubblica il contenuto della cartella così com'è (produzione su GitHub Pages, anteprime dei branch su Cloudflare Workers). `_headers` contiene gli header di sicurezza per Cloudflare. **Come aggiornare codice e sito, URL di produzione e prova, video della homepage: [`docs/AGGIORNARE-IL-SITO.md`](docs/AGGIORNARE-IL-SITO.md). Servizi e architettura: [`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md).** Prima del lancio: `docs/SUPABASE.md` (configurazione delle dashboard) e `npm run check:lancio`.
