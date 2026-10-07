# Piano lavori — branch `migliorie-audit`

Origine: audit del 03-04/10/2026. Legenda: `[x]` fatto · `[ ]` da fare · 👤 azione esterna (dashboard, legale, contenuti clinici).

## Step 1 — Urgenze
- [x] Ripristino funzioni perse: PDF multipagina con a capo, 5 schede, reset al logout, link Tutorial
- [x] Libreria predefinita: 33 esami ripristinati, 3 frasi rischiose corrette, migrazione per chi ha la libreria ridotta
- [x] PDF: niente sovrapposizioni o troncamenti, caratteri come ≥ ≤ →, errori in italiano, niente blocco popup
- [x] Libreria: niente sovrascrittura dopo errore di caricamento, errori di salvataggio visibili, salvataggio alla chiusura, conflitti tra schede, menu che non tornano al primo esame
- [x] PC condivisi: "Esci" azzera referto, microfono e campi login
- [x] Registrazione: redirect corretto, "Password dimenticata", messaggi in italiano, reinvio conferma
- [x] Configurazione Supabase in un solo file (pronta per le nuove chiavi)
- [x] Nascoste le sezioni Abbonamento/Verifica non funzionanti
- 👤 [ ] Supabase: SMTP proprio, Site URL e Redirect URLs (vedi `docs/SUPABASE.md`)
- 👤 [ ] Stripe: controllare abbonamenti live 18-24/09; disattivare le edge function checkout/portal
- 👤 [ ] Supabase: creare la chiave publishable e inserirla in `js/config.js` entro fine 2026

## Step 2 — Sicurezza
- [x] Schema, policy RLS/storage e RPC versionati in `supabase/migrations`, con test automatici
- [x] Team per organizzazione (fine del team unico); ruoli e inviti gestiti dal server (scadenza, limite usi, revoca); rimozione membri
- [x] Nome del mittente in chat impostato dal server
- [x] XSS: escape completo, status admin, breadcrumb, margini
- [x] Librerie e font in locale (niente CDN), CSP, header di sicurezza
- [x] Auth: password ≥ 12 caratteri, MFA (TOTP), modalità "PC condiviso" con uscita per inattività, conferma password per azioni sensibili
- [x] Eliminazione account completa (file, dati, team)
- [x] Importazione: filtro dati identificativi, classificazione normale/patologico corretta
- [x] Limiti di dimensione (upload, testi) lato client e server
- 👤 [ ] Applicare le migrazioni (dopo backup e confronto con `supabase db pull`); attivare MFA e regole password nella dashboard (vedi `supabase/README.md`)

## Step 3 — Privacy e legale
- [x] Archivio referti solo locale (nel browser) + spostamento dell'archivio cloud esistente
- [x] Dettatura: avviso al primo uso (Google/Microsoft/Apple), disattivabile, testi corretti
- [x] Informativa privacy completa (art. 13) e Termini riscritti (artt. 1341-1342 c.c., destinazione d'uso non-MDR)
- [x] Accettazione di Termini/Privacy registrata (versione e data)
- [x] Documenti interni: registro trattamenti, procedura data breach, bozza DPIA, modello DPA per strutture
- [x] Cookie e localStorage dichiarati
- 👤 [ ] Dati del titolare in `js/legal-config.js` (ragione sociale, P.IVA, sede, email, foro) e revisione legale dei testi — verifica con `npm run check:lancio`
- 👤 [ ] Hosting fuori da GitHub Pages (Cloudflare Pages o Netlify) e dominio proprio
- 👤 [ ] Regione UE del progetto Supabase e DPA accettato

## Step 4 — Bug e architettura
- [x] Codice JavaScript in moduli condivisi (`js/`), niente duplicazioni (CSS condiviso: vedi Step 5)
- [x] Livello dati con modalità cloud e modalità locale/demo
- [x] Chat: ultimi messaggi, niente N+1, cambio canale senza race, messaggio non perso se l'invio fallisce
- [x] Editor: intestazione senza duplicati, bozza salvata, Svuota annullabile, Ctrl+Z, inserimento al cursore, Copia su referto vuoto
- [x] Test automatici (unit + e2e) e CI su GitHub Actions
- [x] README, CONTRIBUTING (branch + PR), CHANGELOG
- 👤 [ ] Proteggere `main` (solo PR) e creare un progetto Supabase di staging

## Step 5 — Grafica e UX
- [x] Design system unico in CSS condiviso (`css/`: token, componenti) e icone SVG al posto delle emoji
- [x] Bug visivi: anteprima della landing senza a capo, campi login bianchi
- [x] Layout responsive (editor, team, account)
- [x] Editor: topbar riordinata, stato del microfono, normale/patologico con icona, frasi inserite evidenziate
- [x] Editor della libreria ad albero con modifica in linea e riordino
- [x] Toast e finestre di dialogo al posto di alert/confirm/prompt
- [x] Accessibilità (form, label, tastiera, Esc, focus, contrasti AA)
- [x] Tema chiaro opzionale e dimensione del testo
- [x] Logo SVG, favicon, manifest
- [x] Landing: claim, prezzi, FAQ, sicurezza, chi siamo, footer, SEO/Open Graph, registrazione diretta
- 👤 [ ] Foto, nomi e ruoli dei fondatori; testimonianze (in `js/site-config.js`; le sezioni compaiono da sole)
- 👤 [ ] Dominio definitivo in canonical/Open Graph di `index.html`, `sitemap.xml` e `robots.txt` (lo segnala `npm run check:lancio`)

## Step 6 — Funzionalità
- [x] Libreria con ID stabili: base versionata + modifiche utente
- [x] Libreria v3 ampliata (bozza clinica da validare, vedi docs/libreria-revisione.md): tecnica, normale per distretto, varianti patologiche, conclusioni; 38 esami
- [x] "Referto normale" in un clic; varianti che sostituiscono la frase del distretto; blocchi Tecnica e Conclusioni
- [x] Campi da compilare con Tab (`[___ mm]`, `[a/b]`, `[data]`) e avviso se vuoti
- [x] PDF: titolo (Dott./Dott.ssa/Prof.), luogo e data, anteprima, campi paziente solo per la stampa, classe di dose
- [x] Export/import della libreria e versioni salvate
- [x] Configurazione guidata al primo accesso
- [x] Ricerca rapida (Ctrl+K), abbreviazioni, scorciatoie
- [x] Comandi vocali (punto, virgola, a capo…) e dettatura elaborata sul dispositivo dove il browser lo consente
- [x] Controlli di coerenza locali (lato, campi vuoti, normale+patologico, classe di dose)
- [x] Libreria condivisa di studio/reparto
- [x] Copia per sezione
- [x] App installabile (PWA) con uso offline
- [x] Modelli semi-strutturati con categorie RADS a scelta (non calcolate)
- [x] Statistiche per specializzandi (dall'archivio locale, CSV per il libretto)
- [ ] Estensione browser con scorciatoia sopra il RIS (prototipo) — sospeso: bozza in extension/, non verificata né inclusa
- [ ] Dettatura sul dispositivo con Whisper (prototipo) — sospeso: bozza in labs/, non verificata né inclusa
- 👤 [ ] Revisione clinica della libreria da parte di 2-3 radiologi (punti in docs/libreria-revisione.md)
- 👤 [ ] Applicare la migrazione 20261005120000_libreria.sql in produzione

## Step 7 — Pagamento
- [ ] Piani Free / Pro / Specializzandi / Studio con limiti applicati dal server
- [ ] Stripe Checkout, portale clienti, webhook verificati, prezzi lato server, prova di 30 giorni
- [ ] Verifica specializzandi tramite email universitaria
- [ ] Recesso online ("Recedi dal contratto"), condizioni di vendita, prezzi IVA inclusa
- [ ] Metriche anonime (attivazione, tempo per referto) e cruscotto admin
- [ ] Admin aggiornato (abbonamenti, verifiche)
- 👤 [ ] P.IVA o società, commercialista, fatturazione elettronica
- 👤 [ ] Stripe: prodotti e prezzi, chiavi e webhook secret nelle variabili Supabase
- 👤 [ ] Beta chiusa, interviste, Congresso SIRM 5-8/11
