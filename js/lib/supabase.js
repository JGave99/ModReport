// Client Supabase condiviso. Richiede assets/vendor/supabase.js e js/config.js caricati prima.
let client = null;

export function getSupabase() {
  if (client) return client;
  const cfg = window.MR_CONFIG;
  if (!window.supabase || !cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) return null;
  client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

// URL assoluto di una pagina del sito, valido sia su GitHub Pages (/ModReport/) sia su un dominio proprio.
export function pageUrl(page) {
  return new URL(page, window.location.href).href;
}
