// Dati legali del servizio, usati da informativa, termini e piè di pagina.
// VANNO COMPILATI prima di pubblicare o di attivare i pagamenti: `npm run check:lancio` elenca quelli mancanti.
window.MR_LEGAL = Object.freeze({
  TITOLARE: '',          // nome e cognome o ragione sociale di chi fornisce il servizio (titolare del trattamento)
  FORMA: '',             // es. "ditta individuale", "S.r.l."
  SEDE: '',              // indirizzo completo della sede
  PIVA: '',              // partita IVA
  EMAIL: '',             // contatto per privacy e assistenza
  PEC: '',               // PEC (facoltativa ma consigliata)
  FORO: '',              // città del foro competente per le controversie con i professionisti
  DPO: '',               // Responsabile della protezione dei dati, se nominato (altrimenti lasciare vuoto)
  HOSTING: 'GitHub Pages — GitHub, Inc. (USA)', // da aggiornare quando si cambia hosting
  SUPABASE_REGIONE: '',  // regione del progetto Supabase, es. "Unione Europea (Francoforte)"
  EMAIL_PROVIDER: '',    // fornitore SMTP delle email di servizio, es. "Brevo (Sendinblue SAS, Francia)"
  TERMS_VERSION: '2026-10-04',
  PRIVACY_VERSION: '2026-10-04',
});
