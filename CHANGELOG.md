# Novità

## [Non pubblicato] — branch `migliorie-audit`

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
