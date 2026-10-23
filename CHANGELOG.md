# Novità

## [Non pubblicato] — branch `migliorie-audit`

### Issue #4 — Turni, team e referti tipo
- **Turni** (Account → Turni): calendario mensile con tipo, orario, sede e note; ripetizione settimanale, copia della settimana, tipi e sedi proposti dal team. Privati, condivisibili per team (completi o "solo di turno"), cancellati dopo 12 mesi.
- **Google Calendar**: file .ics da importare e link personale segreto (funzione `turni-ics`), rigenerabile e disattivabile.
- **Team**: tipo e sede, approvazione degli ingressi, qualifica dei membri, impostazioni ed eliminazione del team (proprietario), sedi e tipi di turno comuni (amministratori), canali creati solo da proprietario e amministratori, canale **Avvisi** in cui scrivono solo loro, vista **Turni del team**.
- Contatore dei messaggi non letti sul link "Team" in tutte le pagine.
- **Referti tipo** per esame (icona segnalibro nel blocco Referto e Ctrl+K) e riga **Più usate** con Alt+Maiusc+1…6.
- Finestra **Novità** dopo l'aggiornamento (e dal menu dell'account), sezione Novità e passo "Turni" nel tutorial.
- Informativa aggiornata (turni, qualifica, richieste di ingresso): versione 2026-10-23, da riaccettare.
- Migrazione `20261023120000_team-turni.sql`.

## v0.2.2 — 21/10/2026

### Issue #3 — Nuovi profili
- Admin → Utenti registrati: "Elimina account" per gli altri utenti (non per sé né per altri amministratori), con conferma scrivendo l'email. Cancella anche i file caricati; registro delle eliminazioni (`admin_actions`). Migrazione `20261021120000_admin-elimina-utenti.sql`.
- Registrazione: messaggio chiaro se il servizio email rifiuta l'invio; la schermata "Controlla la tua email" indica l'indirizzo e lo spam. Guida per capire dove si fermano le email in `docs/SUPABASE.md`.
- **Libreria predefinita v5 = libreria dell'account di Iacopo al 21/10/2026** (34 esami, 759 frasi, copiata una volta sola con `scripts/preset-da-libreria.mjs`), con la sua proposta di referto negativo per RX torace e RX addome.
- Aggiornamento degli utenti esistenti: le frasi non modificate prendono testo, gruppo e posizione della nuova base; quelle scritte o modificate restano; esami e indicazioni tolti spariscono se non personalizzati; versione precedente salvata. L'account di origine resta identico, senza doppioni.

## v0.2.1 — 17/10/2026

### Issue #2 — Ordine delle sezioni e delle frasi
- L'ordine delle sezioni scelto in Account ora resta: il database (jsonb) riordinava i gruppi; l'ordine si salva anche in `ordineGruppi`. Le librerie salvate prima tornano all'ordine dei predefiniti.
- Le frasi si aggiungono sempre in fondo al referto, nell'ordine in cui si premono i pulsanti (prima delle eventuali Conclusioni); una variante patologica sostituisce ancora la normale al suo posto.
- In Account → Libreria, "Ordine delle sezioni del referto" è un elenco a parte: si trascina (mouse o dito sulla maniglia) o si usa Alt + ↑/↓; tolte le frecce dai gruppi.
- Il backend finto dei test riproduce il riordino delle chiavi di jsonb.

## v0.2.0 — 16/10/2026

### Issue #1 — Referto negativo
- "Referto normale" diventa "Referto negativo": per ogni esame si scelgono le frasi da inserire (pulsante ⚙ accanto), salvate nella libreria personale.
- Libreria predefinita v4: tolti i gruppi Tecnica e Conclusioni da tutti gli esami (le librerie esistenti si aggiornano senza toccare le frasi modificate).
- Tolta la classe di dose dal punto 04, dai controlli prima di copiare e dalle preferenze.

### Versione di prova online
- Pubblicazione su Cloudflare Workers (`wrangler.jsonc`, `.assetsignore`): anteprime per branch su `*.workers.dev`.
- Ambiente "prova" con un progetto Supabase separato: la produzione si usa solo su `jgave99.github.io`.
- Video di presentazione in homepage (sezione "Come funziona"), compresso per il web; guida `docs/AGGIORNARE-IL-SITO.md`.

### Step 1 — Urgenze
- Libreria predefinita ripristinata (33 esami, frasi corrette dopo revisione clinica) con migrazione automatica per chi aveva la libreria ridotta.
- Stampa PDF: a capo corretto, più pagine con carta intestata su ognuna, caratteri speciali (≥ ≤ → …), anteprima in pagina.
- Libreria: niente sovrascritture dopo errori di rete, stato di salvataggio visibile, controllo dei conflitti tra finestre.
- Ripristinate le 5 schede; "Esci" azzera il referto; password dimenticata; messaggi in italiano.

### Step 2 — Sicurezza
- Regole di accesso del database versionate e testate; team per organizzazione con inviti a scadenza.
- Verifica in due passaggi, modalità "postazione condivisa", password di almeno 12 caratteri.
- Importazione: blocco delle frasi con dati del paziente; classificazione da confermare.
- Librerie e font in locale, Content Security Policy.

### Step 3 — Privacy e legale
- Archivio dei referti solo sul computer, con spostamento dei referti salvati nel cloud.
- Avviso sulla dettatura (servizio del browser) e possibilità di disattivarla.
- Nuove informativa e condizioni d'uso; consensi registrati.

### Step 4 — Bug e architettura
- Editor: intestazione senza doppioni, Ctrl+Z, inserimento al cursore, "Svuota" annullabile, bozza conservata.
- Modalità locale ("Prova senza account").
- Test end-to-end e integrazione continua.

### Step 6 — Funzionalità
- Libreria v3 (bozza da validare): 38 esami con tecnica, frase normale per distretto, varianti patologiche e conclusioni; categorie RADS come liste di scelta.
- ID stabili: gli aggiornamenti della libreria predefinita non toccano le frasi personalizzate né ripropongono quelle eliminate.
- Editor: "Referto normale" in un clic, varianti che sostituiscono la frase del distretto, frasi inserite nell'ordine dei distretti, conclusioni in fondo.
- Campi da compilare con Tab e scelte con i numeri; avvisi prima di copiare o stampare (campi vuoti, lato, frasi in contraddizione, classe di dose).
- Copia per sezione, ricerca rapida (Ctrl+K), scorciatoie, abbreviazioni personali, comandi vocali, dettatura sul dispositivo dove supportata.
- Stampa: titolo, luogo e data, dati del paziente solo per il PDF (mai salvati).
- Versioni salvate della libreria, libreria condivisa del team, configurazione guidata al primo accesso.
- Statistiche dell'archivio con esportazione CSV per il libretto; app installabile con uso offline.

### Step 5 — Grafica e UX
- Nuovo design system condiviso da tutte le pagine (tema scuro e chiaro, dimensione del testo regolabile) e icone al posto delle emoji.
- Editor riorganizzato: barra superiore più ordinata, frasi normali e patologiche riconoscibili, frasi inserite evidenziate, stato del microfono visibile.
- Editor della libreria ad albero con modifica in linea, riordino ed eliminazioni annullabili.
- Notifiche e finestre di dialogo al posto degli avvisi del browser; accessibilità (etichette, tastiera, contrasti AA).
- Layout per smartphone e tablet in tutte le pagine.
- Nuova home page: screenshot reali, sicurezza e privacy, prezzi (beta gratuita), domande frequenti, registrazione diretta, anteprime per i social; tutorial e pagine legali con la nuova grafica.
