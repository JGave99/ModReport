// Se un link di Supabase (conferma email, recupero password, errore) atterra sulla home,
// lo inoltra all'editor, che sa gestire la sessione contenuta nel fragment dell'URL.
(function () {
  var h = window.location.hash;
  if (/(^|[#&])(access_token|error_code|error)=/.test(h)) window.location.replace('app.html' + h);
})();
