// Sessione: modalità "PC condiviso" (sessione solo nella scheda + uscita per inattività),
// controllo della verifica in due passaggi, accesso obbligatorio alle pagine riservate.
import { SHARED_DEVICE_IDLE_MINUTES } from './auth-policy.js';

const SHARED_KEY = 'mr-shared-device';

export function isSharedDevice() {
  try { return sessionStorage.getItem(SHARED_KEY) === '1'; } catch { return false; }
}

export function setSharedDevice(on) {
  try {
    if (on) sessionStorage.setItem(SHARED_KEY, '1');
    else sessionStorage.removeItem(SHARED_KEY);
  } catch { /* storage non disponibile */ }
}

// Archivio della sessione Supabase: su PC condiviso resta solo nella scheda (sessionStorage),
// altrimenti persiste (localStorage). In uscita si cancella da entrambi.
export const authStorage = {
  getItem(key) {
    try { return (isSharedDevice() ? sessionStorage : localStorage).getItem(key); } catch { return null; }
  },
  setItem(key, value) {
    try { (isSharedDevice() ? sessionStorage : localStorage).setItem(key, value); } catch { /* ignora */ }
  },
  removeItem(key) {
    try { sessionStorage.removeItem(key); localStorage.removeItem(key); } catch { /* ignora */ }
  },
};

// true se l'utente ha la verifica in due passaggi attiva ma questa sessione non l'ha ancora superata.
export async function needsMfa(sb) {
  if (!sb.auth.mfa || !sb.auth.mfa.getAuthenticatorAssuranceLevel) return false;
  const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
}

// Per le pagine riservate: senza sessione completa si torna all'editor (che chiede l'accesso).
export async function requireSession(sb, { redirect = 'app.html' } = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || !session.user || await needsMfa(sb)) {
    window.location.replace(new URL(redirect, window.location.href).href);
    return null;
  }
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') setTimeout(() => window.location.replace(new URL('app.html', window.location.href).href), 0);
  });
  startIdleLogout(sb);
  return session.user;
}

// Su PC condiviso: dopo N minuti senza attività esce e torna all'accesso.
export function startIdleLogout(sb, { minutes = SHARED_DEVICE_IDLE_MINUTES, beforeLogout } = {}) {
  if (!isSharedDevice() || startIdleLogout.started) return;
  startIdleLogout.started = true;
  let timer = null;
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (beforeLogout) { try { await beforeLogout(); } catch { /* si esce comunque */ } }
      try { await sb.auth.signOut({ scope: 'local' }); } catch { /* si esce comunque */ }
      window.location.replace(new URL('app.html?timeout=1', window.location.href).href);
    }, minutes * 60 * 1000);
  };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, reset, { passive: true, capture: true }));
  reset();
}
