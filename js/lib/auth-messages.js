// Messaggi di errore di Supabase Auth tradotti in italiano.
// I codici sono quelli documentati in https://supabase.com/docs/guides/auth/debugging/error-codes

const BY_CODE = {
  invalid_credentials: 'Email o password non corretti.',
  email_not_confirmed: 'Email non ancora confermata: apri il link che ti abbiamo inviato (controlla anche lo spam) oppure richiedine uno nuovo.',
  user_already_exists: 'Esiste già un account con questa email. Accedi oppure usa "Password dimenticata?".',
  email_exists: 'Esiste già un account con questa email. Accedi oppure usa "Password dimenticata?".',
  weak_password: 'Password troppo debole: scegline una più lunga e meno prevedibile.',
  same_password: 'La nuova password deve essere diversa da quella attuale.',
  over_email_send_rate_limit: 'Sono state inviate troppe email in poco tempo. Riprova tra qualche minuto.',
  over_request_rate_limit: 'Troppi tentativi ravvicinati. Riprova tra qualche minuto.',
  email_address_not_authorized: 'Al momento non riusciamo a inviare email a questo indirizzo: la registrazione è temporaneamente non disponibile. Scrivici per assistenza.',
  email_address_invalid: 'Indirizzo email non valido.',
  validation_failed: 'Dati non validi: controlla email e password.',
  otp_expired: 'Il link è scaduto o è già stato usato. Richiedine uno nuovo.',
  signup_disabled: 'Le nuove registrazioni sono momentaneamente chiuse.',
  user_not_found: 'Account non trovato.',
  session_not_found: 'Sessione scaduta: accedi di nuovo.',
  reauthentication_needed: 'Per motivi di sicurezza accedi di nuovo e ripeti l\'operazione.',
};

const BY_TEXT = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/already registered|already exists/i, BY_CODE.user_already_exists],
  [/password should be at least|weak password/i, BY_CODE.weak_password],
  [/rate limit|too many/i, BY_CODE.over_request_rate_limit],
  [/not authorized/i, BY_CODE.email_address_not_authorized],
  [/expired|invalid.*link/i, BY_CODE.otp_expired],
  [/failed to fetch|network|load failed/i, 'Connessione non disponibile. Controlla la rete e riprova.'],
];

export function authErrorMessage(error) {
  if (!error) return '';
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  const text = String(error.message || error.error_description || error);
  for (const [re, msg] of BY_TEXT) if (re.test(text)) return msg;
  return 'Si è verificato un errore. Riprova tra poco.' + (error.code ? ' (' + error.code + ')' : '');
}

// Con la conferma email attiva, Supabase non segnala gli indirizzi già registrati:
// restituisce un utente senza identità. Lo riconosciamo per mostrare il messaggio giusto.
export function isExistingUserSignup(data) {
  return !!(data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
}

// Errori che Supabase rimanda nel fragment dell'URL (es. link di conferma scaduto).
export function readAuthErrorFromHash(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const code = params.get('error_code');
  const description = params.get('error_description');
  if (!code && !params.get('error')) return null;
  return authErrorMessage({ code: code || undefined, message: description || params.get('error') || '' });
}
