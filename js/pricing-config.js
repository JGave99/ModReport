// Listino mostrato nella landing: è solo la vetrina. Prezzi e limiti effettivi saranno quelli
// configurati su Stripe e verificati dal server (Step 7). Finché PUBLISHED è false la landing
// mostra "Gratuito durante la beta" e questi valori (BOZZA dall'analisi di mercato) restano nascosti.
window.MR_PRICING = Object.freeze({
  PUBLISHED: false,
  NOTE: 'Prezzi IVA inclusa. Disdici quando vuoi dal tuo account; la libreria resta sempre esportabile.',
  PLANS: [
    {
      id: 'free', nome: 'Free', prezzo: '0 €', periodo: 'per sempre',
      descrizione: 'Per provare il metodo sul lavoro di tutti i giorni.',
      funzioni: ['Libreria personale (fino a 150 frasi)', 'Copia nel RIS e dettatura del browser', 'Archivio locale sul dispositivo'],
      cta: 'Crea un account', href: 'app.html?view=signup',
    },
    {
      id: 'pro', nome: 'Pro', prezzo: '12 €', periodo: 'al mese · 99 € all\'anno', evidenza: true,
      descrizione: 'Per chi referta ogni giorno.',
      funzioni: ['Libreria completa curata da radiologi e aggiornata', 'Frasi illimitate, versioni e ripristino', 'PDF su più carte intestate', 'Prova gratuita di 30 giorni'],
      cta: 'Prova Pro', href: 'app.html?view=signup&plan=pro',
    },
    {
      id: 'specializzandi', nome: 'Specializzandi', prezzo: '5 €', periodo: 'al mese · 49 € all\'anno',
      descrizione: 'Tutto il piano Pro durante la specializzazione.',
      funzioni: ['Verifica automatica con l\'email dell\'università', 'Rinnovo annuale della verifica'],
      cta: 'Verifica e attiva', href: 'app.html?view=signup&plan=specializzandi',
    },
    {
      id: 'studio', nome: 'Studio', prezzo: '15 €', periodo: 'a postazione al mese',
      descrizione: 'Per studi e reparti che vogliono una libreria comune.',
      funzioni: ['Libreria di studio condivisa', 'Team, ruoli e inviti', 'Fattura unica'],
      cta: 'Contattaci', href: 'mailto:',
    },
  ],
});
