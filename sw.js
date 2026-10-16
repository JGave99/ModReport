// Service worker di ModReport: uso offline. Rete prima di tutto (così si vede sempre la versione pubblicata),
// cache solo come ripiego; mai richieste verso altri domini (Supabase) né con credenziali.
const VERSION = 'mr-2026-10-16';
const CACHE_NAME = 'modreport-' + VERSION;

// File da precaricare all'installazione
const PRECACHE_FILES = [
  'app.html',
  'account.html',
  'archivio.html',
  'index.html',
  'tutorial.html',
  'manifest.webmanifest',
  'assets/logo.svg',
  'assets/icons.svg',
  'css/fonts.css',
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'css/pages/app.css',
  'js/theme.js',
  'js/config.js',
  'js/legal-config.js',
  'assets/vendor/supabase.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Precarica i file uno per uno, ignorando quelli mancanti
        const promises = PRECACHE_FILES.map(file => {
          return fetch(file)
            .then(response => {
              if (!response.ok) return;
              // Cloudflare risponde a /pagina.html con un redirect a /pagina: in cache va una risposta "pulita",
              // altrimenti offline il browser rifiuta una risposta redirect per una navigazione.
              if (!response.redirected) return cache.put(file, response);
              return response.blob().then((body) => cache.put(file, new Response(body, { status: 200, headers: response.headers })));
            })
            .catch(error => {
              // Se un file non è disponibile, continua senza fallire
              console.warn('File non precaricato:', file, error);
            });
        });
        return Promise.all(promises);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Solo richieste GET dello stesso origin
  if (event.request.method !== 'GET') return;
  
  // Non servire da cache se è una richiesta verso altri domini (Supabase)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  
  // Non servire da cache se contiene ?fake=
  if (url.searchParams.has('fake')) return;
  
  // Non servire da cache se ha l'intestazione Authorization
  const authHeader = event.request.headers.get('Authorization');
  if (authHeader) return;
  
  // Strategia network-first: prova la rete, salva in cache la risposta ok (status 200, type basic)
  // Se la rete fallisce rispondi dalla cache
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      // Se la rete fallisce, rispondi dalla cache
      return caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        // Per le navigazioni, se la pagina non c'è, prova con app.html dalla cache
        if (event.request.destination === 'document') {
          return caches.match('app.html');
        }
        return Response.error();
      });
    })
  );
});