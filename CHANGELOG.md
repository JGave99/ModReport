# Novità

## [Non pubblicato] — branch `migliorie-audit`

### Versione di prova online
- Pubblicazione su Cloudflare Workers (`wrangler.jsonc`, `.assetsignore`): anteprime per branch su `*.workers.dev`.
- Ambiente "prova" con un progetto Supabase separato: la produzione si usa solo su `jgave99.github.io`.

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
