// Configurazione unica del client (script classico: va caricato prima degli altri script).
// La chiave è pubblica per progetto: la protezione dei dati sta nelle policy RLS di Supabase.
// DA FARE entro fine 2026: Supabase dismette le chiavi "anon" legacy. Creare nella dashboard
// (Project Settings → API Keys) la chiave "publishable" (sb_publishable_…) e incollarla qui.

// Solo in sviluppo locale (localhost): ?fake=1 attiva un backend finto in memoria per i test
// (tests/fixtures/fake-supabase.js); ?fake=0 lo disattiva. Su qualunque altro dominio è ignorato.
(function () {
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) return;
  var mode = new URLSearchParams(window.location.search).get('fake');
  if (mode === '1') sessionStorage.setItem('mr-fake-backend', '1');
  if (mode === '0') sessionStorage.removeItem('mr-fake-backend');
  if (sessionStorage.getItem('mr-fake-backend') === '1') {
    document.write('<script src="tests/fixtures/fake-supabase.js"><\/script>');
  }
})();

// Ambienti. "produzione" vale solo sui domini elencati in PRODUZIONE; ovunque altrove (anteprime Cloudflare
// *.workers.dev, sviluppo locale, ecc.) si usa il progetto Supabase di prova: chi prova non tocca mai i dati reali.
// Quando il sito passerà a un dominio definitivo, aggiungerlo a PRODUZIONE. L'host di ogni progetto va anche nella CSP
// (pagine e _headers).
(function () {
  var ENVS = {
    produzione: {
      SUPABASE_URL: 'https://umejthggxihtyqvcszgm.supabase.co',
      SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZWp0aGdneGlodHlxdmNzemdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzI0MzEsImV4cCI6MjEwNDQ0ODQzMX0.BPaujgB70aLpWSifk5nH93fuyyyfOe8Uw4RupV1YQQE',
    },
    prova: {
      SUPABASE_URL: 'https://blwcqwajcjklgzgbfdfc.supabase.co',
      SUPABASE_KEY: 'sb_publishable_jrlMnG_aEk-GvpiDu9lhtg_17yNNTk4',
    },
  };
  var PRODUZIONE = ['modreport.it', 'www.modreport.it', 'jgave99.github.io'];
  window.MR_ENV = PRODUZIONE.indexOf(window.location.hostname) >= 0 ? 'produzione' : 'prova';
  window.MR_CONFIG = Object.freeze(ENVS[window.MR_ENV]);
})();
