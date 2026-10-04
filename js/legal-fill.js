// Inserisce nelle pagine i dati di js/legal-config.js negli elementi [data-legal="CHIAVE"].
// I dati mancanti restano segnalati come "da compilare" (vedi npm run check:lancio).
(function () {
  var L = window.MR_LEGAL || {};
  var LABELS = {
    TITOLARE: 'titolare', FORMA: 'forma giuridica', SEDE: 'sede', PIVA: 'partita IVA', EMAIL: 'email di contatto',
    PEC: 'PEC', FORO: 'foro competente', DPO: 'DPO', HOSTING: 'hosting', SUPABASE_REGIONE: 'regione dei server',
    EMAIL_PROVIDER: 'fornitore email', TERMS_VERSION: 'versione', PRIVACY_VERSION: 'versione',
  };
  document.querySelectorAll('[data-legal]').forEach(function (el) {
    var key = el.getAttribute('data-legal');
    var value = L[key];
    if (value) {
      el.textContent = value;
      if (el.tagName === 'A' && key === 'EMAIL') el.href = 'mailto:' + value;
    } else if (el.hasAttribute('data-legal-optional')) {
      el.textContent = el.getAttribute('data-legal-optional');
    } else {
      el.textContent = '[da compilare: ' + (LABELS[key] || key) + ']';
      el.classList.add('legal-todo');
    }
  });
  document.querySelectorAll('[data-legal-if]').forEach(function (el) {
    if (!L[el.getAttribute('data-legal-if')]) el.hidden = true;
  });
})();
