# Aggiornare il codice e il sito

Guida pratica per chi modifica ModReport: dove si trova il sito, come provare le modifiche e come pubblicarle.
Le impostazioni delle dashboard (email, chiavi, pagamenti) sono in [`SUPABASE.md`](SUPABASE.md).

## Dove si trova il sito

| | Produzione | Prova |
|---|---|---|
| Sito | <https://jgave99.github.io/ModReport/> (GitHub Pages, branch `main`) | <https://migliorie-audit-modreport.iaco-gavesi.workers.dev> (Cloudflare, branch `migliorie-audit`) |
| Database e account | Supabase `umejthggxihtyqvcszgm` | Supabase `modreport-prova` (`blwcqwajcjklgzgbfdfc`) |
| Chi lo usa | utenti reali | colleghi che provano le novità; nessun dato reale |

- **Ogni branch** pubblicato su GitHub ha la sua anteprima: `https://<nome-branch>-modreport.iaco-gavesi.workers.dev`.
- Anche il branch `main` è pubblicato su Cloudflare, all'indirizzo <https://modreport.iaco-gavesi.workers.dev>, ma usa il database **di prova**.
- Dashboard:
  - Cloudflare → *Workers & Pages* → `modreport`;
  - Supabase → progetto di produzione o `modreport-prova`;
  - GitHub → `JGave99/ModReport`.
- Le credenziali non vanno mai nel repository: si tengono in un password manager.

### Quale database usa il sito

Lo decide `js/config.js`:
- sui domini elencati in `PRODUZIONE` (oggi solo `jgave99.github.io`) l'app usa il database di produzione;
- **ovunque altrove** (anteprime, sviluppo locale) usa quello di prova.

Quando arriverà un dominio definitivo:
1. aggiungerlo a `PRODUZIONE`;
2. aggiornare *Site URL* e *Redirect URLs* nel progetto Supabase di produzione;
3. aggiornare `sitemap.xml`, `robots.txt` e i meta `canonical`/Open Graph di `index.html`.

Se un giorno cambia un progetto Supabase, il suo indirizzo (`https://…` e `wss://…`) va aggiornato in tre posti:
- `js/config.js`;
- la `Content-Security-Policy` di **tutte** le pagine HTML;
- `_headers`.

Il test `tests/unit/pages.test.mjs` segnala le pagine dimenticate.

## Come si lavora

1. **Branch**: mai lavorare direttamente su `main`.
   ```bash
   git switch -c nome-modifica
   ```
2. **Prova in locale**:
   - avvia il server con `npm run serve` e apri <http://127.0.0.1:8765/app.html?fake=1>;
   - `?fake=1` attiva un backend finto in memoria, quindi nessun database viene toccato.
3. **Test**, tutti verdi prima di ogni commit:
   ```bash
   npm ci
   npm run lint
   npm test
   npx playwright install chromium
   npm run test:e2e
   ```
   - `npm ci` serve solo la prima volta e dopo ogni cambio di `package-lock.json`.
   - `npx playwright install chromium` serve solo la prima volta.
4. **Push**:
   - `git push -u origin nome-modifica`;
   - dopo circa un minuto Cloudflare pubblica l'anteprima del branch;
   - l'esito si vede nei controlli del commit su GitHub, oppure su Cloudflare → `modreport` → *Deployments*.
5. **Prova online** sull'anteprima, anche con i colleghi.
6. **Pubblicazione in produzione**:
   - si apre una *pull request* verso `main` e si aspetta che la CI (`.github/workflows/ci.yml`) sia verde;
   - si fa il merge;
   - GitHub Pages pubblica il sito di produzione in pochi minuti.
7. **Versione**:
   - per ogni pubblicazione importante si aggiorna `CHANGELOG.md`;
   - si crea un tag, per esempio `git tag -a v0.2.0 -m "…" && git push origin v0.2.0`;
   - il tag `v0.1.0` è il sito com'era prima delle migliorie dell'audit.

### Cache del browser

- **Service worker** (`sw.js`): cerca sempre prima la versione online, quindi le pagine si aggiornano da sole. Se cambia l'elenco dei file precaricati, si aggiorna anche `VERSION` in cima al file.
- **File in `assets/`**: il browser li conserva per un giorno (`_headers`). Per un cambio immediato si usa un nome di file nuovo.

## Database (Supabase)

Le modifiche al database stanno in `supabase/migrations/`, un file SQL per ogni modifica, in ordine di data. I test SQL (`npm test`) le provano su un database finto.

1. **Prima sul progetto di prova**: SQL Editor → incollare il file nuovo → *Run*. Poi si prova l'anteprima.
2. **Poi in produzione**, prima del merge su `main`:
   - backup da *Database → Backups*, oppure esportazione;
   - stesso file nel SQL Editor del progetto di produzione.
3. Il deploy automatico delle migrazioni dall'integrazione GitHub di Supabase (*Deploy to production*) è **disattivato apposta**: nessuna modifica al database reale parte da sola con un merge.

## Cambiare il video della homepage

- Video: `assets/video/modreport-presentazione.mp4`
- Copertina (immagine prima del play): `assets/video/modreport-presentazione.jpg`
- Testo sotto il video e descrizione per gli screen reader (con la durata): `index.html`, blocco `<figure … id="video">`, alla fine della sezione "Come funziona".

**Per sostituirlo:**

1. Comprimere il video nuovo per il web. **Ogni file deve stare sotto i 25 MB**, il limite di Cloudflare; l'ideale è sotto i 15 MB. Serve `ffmpeg` (`brew install ffmpeg`).
   ```bash
   ffmpeg -i video-originale.mp4 -c:v libx264 -preset slow -crf 23 -r 30 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart assets/video/modreport-presentazione.mp4
   ```
   - Se il file supera i 15 MB, alzare `-crf`: 25-26 resta ben leggibile.
   - `+faststart` fa partire il video prima che sia scaricato tutto.
2. Creare la copertina da un fotogramma significativo, qui a 12,2 secondi:
   ```bash
   ffmpeg -ss 12.2 -i video-originale.mp4 -frames:v 1 -vf scale=1280:-1 -q:v 4 assets/video/modreport-presentazione.jpg
   ```
3. Se cambiano durata o contenuto, aggiornare in `index.html` l'`aria-label` e la `<figcaption>`.
4. Per far vedere subito il video nuovo a chi ha già visitato il sito (vedi "Cache del browser"):
   - usare un nome nuovo, per esempio `modreport-presentazione-2.mp4`;
   - aggiornare i due percorsi in `index.html`.
5. Branch, test, push e controllo sull'anteprima, come sopra.

Il video originale non compresso non va nel repository.
