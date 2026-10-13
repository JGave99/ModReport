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

// Ambienti. "prova" vale per le anteprime (Cloudflare Pages *.pages.dev, Netlify *.netlify.app) e usa un progetto
// Supabase separato: chi prova non tocca mai i dati reali. Finché il progetto di prova non è configurato le anteprime
// funzionano solo in modalità locale ("Prova senza account"). L'host di ogni progetto va anche nella CSP (pagine e _headers).
(function () {
  var ENVS = {
    produzione: {
      SUPABASE_URL: 'https://umejthggxihtyqvcszgm.supabase.co',
      SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZWp0aGdneGlodHlxdmNzemdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzI0MzEsImV4cCI6MjEwNDQ0ODQzMX0.BPaujgB70aLpWSifk5nH93fuyyyfOe8Uw4RupV1YQQE',
    },
    prova: {
      SUPABASE_URL: '',
      SUPABASE_KEY: '',
    },
  };
  var preview = /\.(pages\.dev|netlify\.app)$/.test(window.location.hostname);
  window.MR_ENV = preview ? 'prova' : 'produzione';
  window.MR_CONFIG = Object.freeze(ENVS[window.MR_ENV]);
})();
