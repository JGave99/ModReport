// Regole per le password e la sessione (da allineare alla dashboard Supabase: Authentication → Policies).
export const MIN_PASSWORD_LENGTH = 12;
export const SHARED_DEVICE_IDLE_MINUTES = 30;

// Restituisce un messaggio se la password non va bene, altrimenti null.
export function passwordProblem(password, email = '') {
  const pw = String(password || '');
  if (pw.length < MIN_PASSWORD_LENGTH) return 'La password deve avere almeno ' + MIN_PASSWORD_LENGTH + ' caratteri.';
  if (/^(.)\1+$/.test(pw)) return 'La password non può essere un solo carattere ripetuto.';
  const user = String(email || '').split('@')[0].toLowerCase();
  if (user.length >= 4 && pw.toLowerCase().includes(user)) return 'La password non deve contenere il tuo nome utente.';
  if (/^(password|passwort|12345678|qwertyui|modreport)/i.test(pw)) return 'Password troppo prevedibile: scegline una diversa.';
  return null;
}
