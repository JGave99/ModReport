// Tema (scuro / chiaro / automatico) e dimensione del testo. Script classico nel <head>,
// prima dei fogli di stile, per evitare il lampo del tema sbagliato.
(function () {
  var KEY_THEME = 'mr-theme';
  var KEY_SCALE = 'mr-text-scale';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignora */ } }
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function apply() {
    var pref = get(KEY_THEME) || 'dark';
    var resolved = pref === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : pref;
    document.documentElement.setAttribute('data-theme', resolved === 'light' ? 'light' : 'dark');
    document.documentElement.setAttribute('data-text-scale', get(KEY_SCALE) || '100');
  }
  apply();
  if (mq && mq.addEventListener) mq.addEventListener('change', apply);
  window.MR_THEME = {
    get: function () { return get(KEY_THEME) || 'dark'; },
    set: function (v) { put(KEY_THEME, v === 'dark' ? null : v); apply(); },
    getScale: function () { return get(KEY_SCALE) || '100'; },
    setScale: function (v) { put(KEY_SCALE, v === '100' ? null : v); apply(); },
  };
})();
