// Registrazione del service worker per PWA
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
  // In sviluppo su http://127.0.0.1 o localhost registra solo se l'URL contiene ?sw=1
  if (location.protocol === 'https:' || new URLSearchParams(location.search).has('sw')) {
    navigator.serviceWorker.register('sw.js');
  }
}