// Editor dei referti (app.html).
import { getSupabase, pageUrl } from '../lib/supabase.js';
import { $ } from '../lib/dom.js';
import { authErrorMessage, isExistingUserSignup, readAuthErrorFromHash } from '../lib/auth-messages.js';
import { LibraryStore, cloneDefaults } from '../lib/library.js';
import { attachDictation, stopAllDictation } from '../lib/dictation.js';
import { buildReportPdf } from '../lib/pdf.js';
import { passwordProblem } from '../lib/auth-policy.js';
import { isSharedDevice, setSharedDevice, needsMfa, startIdleLogout } from '../lib/session.js';
import { addEntry } from '../lib/local-archive.js';

// Il fragment dell'URL va letto prima che supabase-js lo consumi.
const initialHash = window.location.hash;
const initialSearch = window.location.search;
const isRecoveryLink = /(^|[#&])type=recovery(&|$)/.test(initialHash);
const isSignupConfirmation = /(^|[#&])type=signup(&|$)/.test(initialHash);
const urlAuthError = readAuthErrorFromHash(initialHash) || readAuthErrorFromHash(initialSearch.replace(/^\?/, '#'));

const sb = getSupabase();

let DATA = cloneDefaults();
let currentUser = null;
let recoveryMode = isRecoveryLink;
let pendingEmail = '';

// ============================================================
// STATO DEL REFERTO E SCHEDE (5 referti in parallelo)
// ============================================================
const WORKSPACE_COUNT = 5;
const emptyWorkspace = () => ({ metodica: null, esame: null, urgenzaMode: false, indicazioneLines: [], lastHeaderText: '', pendingEsameOpen: false, reportText: '' });
let workspaces = Array.from({ length: WORKSPACE_COUNT }, emptyWorkspace);
let activeWorkspace = 0;

const state = { metodica: null, esame: null };
let urgenzaMode = false;
let indicazioneLines = [];
let lastHeaderText = '';
let pendingEsameOpen = false;

const el = {
  metodicaRow: $('metodica-row'),
  esameBody: $('esame-body'),
  indicazioneBody: $('indicazione-body'),
  refertoBody: $('referto-body'),
  reportText: $('report-text'),
  metaMetodica: $('meta-metodica'),
  metaEsame: $('meta-esame'),
  breadcrumb: $('breadcrumb'),
  copyFlash: $('copy-flash'),
  tabs: $('workspace-tabs'),
};

function flash(text, ms = 1500) {
  el.copyFlash.textContent = text;
  el.copyFlash.classList.add('show');
  clearTimeout(flash.t);
  flash.t = setTimeout(() => el.copyFlash.classList.remove('show'), ms);
}

function saveActiveWorkspace() {
  workspaces[activeWorkspace] = {
    metodica: state.metodica, esame: state.esame, urgenzaMode,
    indicazioneLines, lastHeaderText, pendingEsameOpen, reportText: el.reportText.value,
  };
}

function loadWorkspace(i) {
  activeWorkspace = i;
  const w = workspaces[i];
  state.metodica = w.metodica;
  state.esame = w.esame;
  urgenzaMode = w.urgenzaMode;
  indicazioneLines = w.indicazioneLines;
  lastHeaderText = w.lastHeaderText;
  pendingEsameOpen = w.pendingEsameOpen;
  el.reportText.value = w.reportText;
  setUrgenzaButton();
  renderAll();
}

function switchWorkspace(i) {
  if (i === activeWorkspace) return;
  saveActiveWorkspace();
  loadWorkspace(i);
}

function renderWorkspaceTabs() {
  el.tabs.innerHTML = '';
  workspaces.forEach((w, i) => {
    const isActive = i === activeWorkspace;
    const hasContent = isActive
      ? !!(el.reportText.value.trim() || state.metodica || state.esame)
      : !!(w.reportText.trim() || w.metodica || w.esame);
    const b = document.createElement('button');
    b.className = 'workspace-tab' + (isActive ? ' active' : '') + (hasContent ? ' has-content' : '');
    b.textContent = String(i + 1);
    const dot = document.createElement('span');
    dot.className = 'dot';
    b.appendChild(dot);
    b.title = 'Referto ' + (i + 1) + (hasContent ? '' : ' (vuoto)');
    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    b.onclick = () => switchWorkspace(i);
    el.tabs.appendChild(b);
  });
}

// ============================================================
// RENDER DEI BLOCCHI
// ============================================================
function renderMetodica() {
  el.metodicaRow.innerHTML = '';
  DATA.metodiche.forEach((m) => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.metodica === m ? ' active' : '');
    b.textContent = m.toUpperCase();
    b.onclick = () => {
      if (state.metodica === m) return;
      state.metodica = m;
      state.esame = null;
      renderAll();
    };
    el.metodicaRow.appendChild(b);
  });
}

function renderEsame() {
  el.esameBody.innerHTML = '';
  if (!state.metodica) {
    el.esameBody.innerHTML = '<div class="empty-state">Seleziona prima una metodica.</div>';
    return;
  }
  const row = document.createElement('div');
  row.className = 'chip-row';
  (DATA.esamiByMetodica[state.metodica] || []).forEach((e) => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.esame === e ? ' active' : '');
    b.textContent = e;
    b.onclick = () => {
      if (state.esame === e) return;
      state.esame = e;
      renderAll();
      insertEsameLine(e);
    };
    row.appendChild(b);
  });
  el.esameBody.appendChild(row);
}

function renderIndicazione() {
  el.indicazioneBody.innerHTML = '';
  if (!state.esame) {
    el.indicazioneBody.innerHTML = '<div class="empty-state">Seleziona prima un esame.</div>';
    return;
  }
  const row = document.createElement('div');
  row.className = 'chip-row';
  (DATA.indicazioniByEsame[state.esame] || []).forEach((txt) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = txt;
    b.onclick = () => insertIndicazione(txt);
    row.appendChild(b);
  });
  el.indicazioneBody.appendChild(row);

  const freeWrap = document.createElement('div');
  freeWrap.style.marginTop = '12px';
  freeWrap.innerHTML = `
    <label class="visually-hidden" for="indicazione-free">Indicazione libera</label>
    <textarea class="free-text" id="indicazione-free" placeholder="…oppure scrivi o detta un'indicazione libera"></textarea>
    <div style="display:flex; gap:8px; margin-top:8px; align-items:center;">
      <button class="mic-btn" id="mic-indicazione-free" title="Detta" aria-label="Detta un'indicazione libera" aria-pressed="false">🎤</button>
      <button class="add-free" id="add-indicazione-free">Aggiungi</button>
    </div>`;
  el.indicazioneBody.appendChild(freeWrap);
  const ta = $('indicazione-free');
  $('add-indicazione-free').onclick = () => {
    if (ta.value.trim()) {
      insertIndicazione(ta.value.trim());
      ta.value = '';
    }
  };
  attachDictation($('mic-indicazione-free'), () => ta, { onError: (m) => alert(m) });
}

function renderReferto() {
  el.refertoBody.innerHTML = '';
  if (!state.esame) {
    el.refertoBody.innerHTML = '<div class="empty-state">Seleziona prima un esame.</div>';
    return;
  }
  const groups = DATA.refertoByEsame[state.esame];
  if (!groups || Object.keys(groups).length === 0) {
    el.refertoBody.innerHTML = '<div class="empty-state">Nessuna frase ancora definita per questo esame. Puoi aggiungerne da <a href="account.html" style="color:var(--accent);">Il mio account → Personalizza referti</a>.</div>';
    return;
  }
  const note = document.createElement('p');
  note.className = 'sample-note';
  note.textContent = 'Frasi di esempio: verificale e adattale alla tua pratica prima dell\'uso.';
  el.refertoBody.appendChild(note);

  Object.entries(groups).forEach(([groupName, buttons]) => {
    const g = document.createElement('div');
    g.className = 'subgroup';
    const label = document.createElement('div');
    label.className = 'subgroup-label';
    label.textContent = groupName;
    g.appendChild(label);
    const row = document.createElement('div');
    row.className = 'chip-row';
    (buttons || []).forEach((btnData) => {
      const b = document.createElement('button');
      b.className = 'btn-report' + (btnData.neg ? ' neg' : '');
      b.textContent = btnData.label;
      b.title = btnData.text;
      b.onclick = () => insertReferto(btnData.text);
      row.appendChild(b);
    });
    g.appendChild(row);
    el.refertoBody.appendChild(g);
  });
}

function renderBreadcrumb() {
  el.breadcrumb.innerHTML = '';
  const seg = (text, empty) => {
    const s = document.createElement('span');
    s.className = 'seg' + (empty ? ' empty' : '');
    s.textContent = text;
    return s;
  };
  const sep = document.createElement('span');
  sep.className = 'sep';
  sep.textContent = '›';
  el.breadcrumb.append(seg(state.metodica ? state.metodica.toUpperCase() : 'metodica', !state.metodica), sep, seg(state.esame || 'esame', !state.esame));
  el.metaMetodica.textContent = state.metodica ? state.metodica.toUpperCase() : '—';
  el.metaEsame.textContent = state.esame || '—';
}

function renderAll() {
  renderMetodica();
  renderEsame();
  renderIndicazione();
  renderReferto();
  renderBreadcrumb();
  renderWorkspaceTabs();
}

el.reportText.addEventListener('input', renderWorkspaceTabs);

// ============================================================
// COMPOSIZIONE DEL TESTO
// ============================================================
function computeHeader() {
  if (!indicazioneLines.length) return '';
  const label = urgenzaMode ? "Esame eseguito in regime d'urgenza con indicazione clinica: " : 'Indicazione: ';
  return label + indicazioneLines.join('; ') + '\n\n';
}

function rebuildHeader() {
  const current = el.reportText.value;
  const body = (lastHeaderText && current.startsWith(lastHeaderText)) ? current.slice(lastHeaderText.length) : current;
  const newHeader = computeHeader();
  el.reportText.value = newHeader + body;
  lastHeaderText = newHeader;
  renderWorkspaceTabs();
}

function appendToReport(text, trailingNewlines) {
  let value = el.reportText.value;
  if (value.length && !value.endsWith('\n')) value += '\n';
  value += text + (trailingNewlines !== undefined ? trailingNewlines : '\n');
  el.reportText.value = value;
  el.reportText.scrollTop = el.reportText.scrollHeight;
  renderWorkspaceTabs();
}

function insertIndicazione(txt) {
  indicazioneLines.push(txt);
  rebuildHeader();
}

function insertEsameLine(esameName) {
  if (el.reportText.value.length && !el.reportText.value.endsWith('\n\n')) appendToReport('', '\n');
  appendToReport(esameName, '\n');
  pendingEsameOpen = true;
}

function insertConfronto(txt) {
  appendToReport(txt, '\n\n');
  pendingEsameOpen = false;
}

function insertReferto(txt) {
  if (pendingEsameOpen) {
    appendToReport('', '\n');
    pendingEsameOpen = false;
  }
  appendToReport(txt, '\n');
}

function setUrgenzaButton() {
  const b = $('btn-urgenza-toggle');
  b.classList.toggle('active', urgenzaMode);
  b.setAttribute('aria-pressed', urgenzaMode ? 'true' : 'false');
}

$('btn-urgenza-toggle').onclick = () => {
  urgenzaMode = !urgenzaMode;
  setUrgenzaButton();
  rebuildHeader();
};

$('btn-reset').onclick = () => {
  urgenzaMode = false;
  indicazioneLines = [];
  lastHeaderText = '';
  pendingEsameOpen = false;
  setUrgenzaButton();
  el.reportText.value = '';
  if (state.esame) insertEsameLine(state.esame);
  renderWorkspaceTabs();
};

$('btn-copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(el.reportText.value);
  } catch (e) {
    el.reportText.select();
    document.execCommand('copy');
  }
  flash('Copiato negli appunti', 1400);
};

$('btn-archive').onclick = async () => {
  const testo = el.reportText.value.trim();
  if (!testo) { alert('Non c\'è nulla da salvare: il referto è vuoto.'); return; }
  if (testo.length > 20000) { alert('Il referto è troppo lungo per l\'archivio (massimo 20.000 caratteri).'); return; }
  if (isSharedDevice()) {
    alert('Su una postazione condivisa l\'archivio non è disponibile: copia o stampa il referto.');
    return;
  }
  if (!confirm('Salvare il referto nell\'archivio di QUESTO computer?\n\nResta solo in questo browser, non viene inviato al cloud. Togli comunque i dati che identificano il paziente.')) return;
  const btn = $('btn-archive');
  btn.disabled = true;
  try {
    await addEntry(currentUser.id, { esame: state.esame || null, testo });
    flash('Salvato nell\'archivio di questo computer', 1800);
  } catch (e) {
    alert('Errore durante il salvataggio: ' + e.message);
  }
  btn.disabled = false;
};

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    $('btn-copy').click();
  }
});

attachDictation($('btn-mic-report'), () => el.reportText, { onError: (m) => alert(m) });

$('btn-confronto').onclick = () => insertConfronto('Confronto con precedente analogo del ');
$('btn-presa-visione').onclick = () => insertConfronto('Presa visione di precedente analogo del ');
$('btn-non-precedenti').onclick = () => insertConfronto('Non disponibili precedenti per confronto.');

// ============================================================
// STAMPA PDF (anteprima in pagina: niente popup bloccati)
// ============================================================
const print = {
  overlay: $('print-overlay'),
  select: $('print-letterhead-select'),
  hint: $('print-letterhead-hint'),
  margins: $('print-manual-margins'),
  msg: $('print-message'),
  signatureInfo: $('print-signature-info'),
  setup: $('print-setup'),
  preview: $('print-preview'),
  frame: $('print-frame'),
  warning: $('print-warning'),
  url: null,
  letterheads: [],
};

function setMsg(node, text, kind) {
  node.className = 'field-message' + (kind ? ' ' + kind : '');
  node.textContent = text || '';
}

function doctorSignature() {
  const meta = (currentUser && currentUser.user_metadata) || {};
  const nome = (meta.nome || '').trim();
  const cognome = (meta.cognome || '').trim();
  if (!nome && !cognome) return null;
  return 'Dott. ' + [nome, cognome].filter(Boolean).join(' ');
}

function revokePreview() {
  if (print.url) URL.revokeObjectURL(print.url);
  print.url = null;
  print.frame.removeAttribute('src');
}

function showPrintSetup() {
  print.preview.hidden = true;
  print.setup.hidden = false;
  revokePreview();
}

function closePrint() {
  print.overlay.classList.remove('open');
  showPrintSetup();
}

function updateMarginsVisibility() {
  print.margins.hidden = !!print.select.value;
}

$('btn-open-print').onclick = async () => {
  if (!el.reportText.value.trim()) {
    alert('Il referto è vuoto. Componi o scrivi del testo prima di stampare.');
    return;
  }
  showPrintSetup();
  setMsg(print.msg, '');
  print.select.innerHTML = '<option value="">Nessuna (pagina bianca)</option>';
  print.letterheads = [];
  if (currentUser && sb) {
    const { data, error } = await sb
      .from('letterheads')
      .select('id, nome, storage_path, margine_top, margine_left, margine_right')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (error) {
      setMsg(print.msg, 'Impossibile caricare le carte intestate: puoi stampare su pagina bianca.', 'warn');
    } else {
      print.letterheads = data || [];
    }
  }
  print.letterheads.forEach((lh) => {
    const opt = document.createElement('option');
    opt.value = lh.id;
    opt.textContent = lh.nome;
    print.select.appendChild(opt);
  });
  print.hint.textContent = print.letterheads.length
    ? 'Con una carta intestata vengono usati i margini salvati per quella carta.'
    : 'Nessuna carta intestata salvata: puoi aggiungerne una da "Il mio account → Gestione stampa".';
  updateMarginsVisibility();
  const sign = doctorSignature();
  setMsg(print.signatureInfo, sign
    ? 'Firma in calce: ' + sign
    : 'Nome e cognome non impostati: la firma non verrà stampata. Puoi aggiungerli in "Il mio account".', sign ? '' : 'warn');
  print.overlay.classList.add('open');
};

print.select.onchange = updateMarginsVisibility;
$('print-close').onclick = closePrint;
$('print-back').onclick = showPrintSetup;
print.overlay.addEventListener('click', (e) => { if (e.target === print.overlay) closePrint(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && print.overlay.classList.contains('open')) closePrint(); });

const readMm = (id, fallback) => {
  const v = parseFloat($(id).value);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

$('print-generate-btn').onclick = async () => {
  const btn = $('print-generate-btn');
  btn.disabled = true;
  setMsg(print.msg, 'Generazione del PDF in corso…');
  try {
    const lh = print.letterheads.find((l) => l.id === print.select.value) || null;
    let template = null;
    let margins;
    if (lh) {
      const { data: fileData, error } = await sb.storage.from('letterheads').download(lh.storage_path);
      if (error) throw new Error('impossibile scaricare la carta intestata (' + error.message + ')');
      template = await fileData.arrayBuffer();
      margins = { top: Number(lh.margine_top) || 0, left: Number(lh.margine_left) || 0, right: Number(lh.margine_right) || 0 };
    } else {
      margins = { top: readMm('margin-top', 40), left: readMm('margin-left', 20), right: readMm('margin-right', 20) };
    }
    const result = await buildReportPdf({ text: el.reportText.value, template, margins, signature: doctorSignature() });
    revokePreview();
    print.url = URL.createObjectURL(new Blob([result.bytes], { type: 'application/pdf' }));
    print.frame.src = print.url;
    $('print-open').href = print.url;
    $('print-download').href = print.url;
    const warnings = [];
    if (result.pages > 1) warnings.push('Il referto occupa ' + result.pages + ' pagine.');
    if (result.replacedChars.length) warnings.push('Alcuni caratteri non erano stampabili e sono stati sostituiti: ' + result.replacedChars.join(' '));
    setMsg(print.warning, warnings.join(' '), warnings.length ? 'warn' : '');
    setMsg(print.msg, '');
    print.setup.hidden = true;
    print.preview.hidden = false;
  } catch (e) {
    setMsg(print.msg, 'Non è stato possibile generare il PDF: ' + (e && e.message ? e.message : e), 'error');
  }
  btn.disabled = false;
};

$('print-do').onclick = () => {
  try {
    print.frame.contentWindow.focus();
    print.frame.contentWindow.print();
  } catch (e) {
    window.open(print.url, '_blank', 'noopener');
  }
};

// ============================================================
// AUTENTICAZIONE
// ============================================================
const loginOverlay = $('login-overlay');
const appRoot = $('app-root');
const AUTH_VIEWS = ['login', 'signup', 'forgot', 'recovery', 'mfa', 'consent', 'check-email'];
const ERROR_BOX = { login: 'login-error', signup: 'signup-error', forgot: 'forgot-error', recovery: 'recovery-error', mfa: 'mfa-error', consent: 'consent-error', 'check-email': 'check-email-error' };
const LEGAL = window.MR_LEGAL || {};

function authMessage(view, text, ok) {
  const box = $(ERROR_BOX[view]);
  box.textContent = text || '';
  box.classList.toggle('ok', !!ok);
}

function showAuthView(view, message, ok) {
  AUTH_VIEWS.forEach((v) => { $('view-' + v).hidden = v !== view; });
  AUTH_VIEWS.forEach((v) => authMessage(v, ''));
  if (message) authMessage(view, message, ok);
  loginOverlay.classList.remove('hidden');
  appRoot.classList.add('hidden');
  const first = $('view-' + view).querySelector('input');
  if (first) setTimeout(() => first.focus(), 0);
}

document.querySelectorAll('[data-auth-view]').forEach((b) => {
  b.addEventListener('click', () => {
    const view = b.dataset.authView;
    const email = $('login-email').value.trim();
    if (view === 'forgot' && email) $('forgot-email').value = email;
    if (view === 'signup' && email) $('signup-email').value = email;
    showAuthView(view);
  });
});

async function withBusy(button, fn) {
  button.disabled = true;
  try { await fn(); } finally { button.disabled = false; }
}

function cleanUrl() {
  if (window.location.hash || window.location.search) {
    history.replaceState(null, '', window.location.pathname);
  }
}

$('view-login').addEventListener('submit', (e) => {
  e.preventDefault();
  withBusy($('btn-signin'), async () => {
    if (!sb) return;
    const email = $('login-email').value.trim();
    const password = $('login-password').value;
    if (!email || !password) { authMessage('login', 'Inserisci email e password.'); return; }
    // La scelta va fatta prima dell'accesso: decide dove viene salvata la sessione.
    setSharedDevice($('login-shared').checked);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === 'email_not_confirmed') {
        pendingEmail = email;
        showAuthView('check-email', authErrorMessage(error));
        return;
      }
      authMessage('login', authErrorMessage(error));
      return;
    }
    currentUser = data.user;
    await afterSignIn();
  });
});

// Dopo l'accesso: se l'utente ha la verifica in due passaggi, chiede il codice.
async function afterSignIn() {
  if (await needsMfa(sb)) {
    showAuthView('mfa');
    return;
  }
  if (await needsConsent()) {
    showAuthView('consent');
    return;
  }
  await showApp();
}

// Termini o informativa cambiati (o accettazione mai registrata): si chiede di nuovo il consenso.
async function needsConsent() {
  if (!LEGAL.TERMS_VERSION || !LEGAL.PRIVACY_VERSION) return false;
  const { data, error } = await sb.from('profiles').select('terms_version, privacy_version').eq('id', currentUser.id).maybeSingle();
  if (error) return false; // schema non ancora aggiornato: non si blocca l'uso
  return !data || data.terms_version !== LEGAL.TERMS_VERSION || data.privacy_version !== LEGAL.PRIVACY_VERSION;
}

$('view-consent').addEventListener('submit', (e) => {
  e.preventDefault();
  withBusy($('btn-consent'), async () => {
    if (!$('consent-terms').checked || !$('consent-clauses').checked) {
      authMessage('consent', 'Per continuare spunta entrambe le caselle.');
      return;
    }
    const { error } = await sb.rpc('accept_terms', {
      p_terms_version: LEGAL.TERMS_VERSION, p_privacy_version: LEGAL.PRIVACY_VERSION, p_clauses: true, p_user_agent: navigator.userAgent,
    });
    if (error) { authMessage('consent', 'Accettazione non registrata: ' + error.message); return; }
    await showApp();
  });
});

$('btn-consent-cancel').onclick = async () => {
  try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* si esce comunque */ }
  window.location.replace(pageUrl('app.html'));
};

$('view-mfa').addEventListener('submit', (e) => {
  e.preventDefault();
  withBusy($('btn-mfa'), async () => {
    const code = $('mfa-code').value.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) { authMessage('mfa', 'Il codice è composto da 6 cifre.'); return; }
    const { data: factors, error: listError } = await sb.auth.mfa.listFactors();
    const factor = factors && factors.totp && factors.totp.find((f) => f.status === 'verified');
    if (listError || !factor) { authMessage('mfa', authErrorMessage(listError || { message: 'factor' })); return; }
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) { authMessage('mfa', authErrorMessage(error)); $('mfa-code').select(); return; }
    const { data: { session } } = await sb.auth.getSession();
    currentUser = session.user;
    await showApp();
  });
});

$('btn-mfa-cancel').onclick = async () => {
  try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* si esce comunque */ }
  window.location.replace(pageUrl('app.html'));
};

$('view-signup').addEventListener('submit', (e) => {
  e.preventDefault();
  withBusy($('btn-signup'), async () => {
    if (!sb) return;
    const email = $('signup-email').value.trim();
    const password = $('signup-password').value;
    const password2 = $('signup-password2').value;
    if (!email) { authMessage('signup', 'Inserisci la tua email.'); return; }
    const problem = passwordProblem(password, email);
    if (problem) { authMessage('signup', problem); return; }
    if (password !== password2) { authMessage('signup', 'Le due password non coincidono.'); return; }
    if (!$('signup-terms').checked || !$('signup-clauses').checked) {
      authMessage('signup', 'Per registrarti accetta i Termini e approva le clausole indicate.');
      return;
    }
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: pageUrl('app.html'),
        data: { terms_version: LEGAL.TERMS_VERSION, privacy_version: LEGAL.PRIVACY_VERSION, clauses_accepted: true },
      },
    });
    if (error) { authMessage('signup', authErrorMessage(error)); return; }
    if (isExistingUserSignup(data)) { authMessage('signup', authErrorMessage({ code: 'user_already_exists' })); return; }
    if (data.user && !data.session) {
      pendingEmail = email;
      showAuthView('check-email');
      return;
    }
    currentUser = data.user;
    await showApp();
  });
});

$('view-forgot').addEventListener('submit', (e) => {
  e.preventDefault();
  withBusy($('btn-forgot'), async () => {
    if (!sb) return;
    const email = $('forgot-email').value.trim();
    if (!email) { authMessage('forgot', 'Inserisci la tua email.'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: pageUrl('app.html') });
    if (error) { authMessage('forgot', authErrorMessage(error)); return; }
    authMessage('forgot', 'Se l\'indirizzo è registrato riceverai a breve un\'email con il link per impostare una nuova password.', true);
  });
});

$('view-recovery').addEventListener('submit', (e) => {
  e.preventDefault();
  withBusy($('btn-recovery'), async () => {
    const p1 = $('recovery-password').value;
    const p2 = $('recovery-password2').value;
    const problem = passwordProblem(p1);
    if (problem) { authMessage('recovery', problem); return; }
    if (p1 !== p2) { authMessage('recovery', 'Le due password non coincidono.'); return; }
    const { data, error } = await sb.auth.updateUser({ password: p1 });
    if (error) { authMessage('recovery', authErrorMessage(error)); return; }
    recoveryMode = false;
    cleanUrl();
    currentUser = data.user;
    await afterSignIn();
    flash('Password aggiornata', 2500);
  });
});

$('btn-resend').onclick = () => withBusy($('btn-resend'), async () => {
  if (!sb || !pendingEmail) { authMessage('check-email', 'Torna all\'accesso e inserisci di nuovo la tua email.'); return; }
  const { error } = await sb.auth.resend({ type: 'signup', email: pendingEmail, options: { emailRedirectTo: pageUrl('app.html') } });
  if (error) authMessage('check-email', authErrorMessage(error));
  else authMessage('check-email', 'Email inviata di nuovo a ' + pendingEmail + '.', true);
});

function showLogin(message, ok) {
  const params = new URLSearchParams(initialSearch);
  showAuthView(params.get('view') === 'signup' ? 'signup' : 'login', message, ok);
}

async function loadLibrary() {
  const store = new LibraryStore({ supabase: sb, userId: currentUser.id });
  const res = await store.load();
  if (res.status === 'error') {
    DATA = cloneDefaults();
    $('lib-banner').hidden = false;
  } else {
    DATA = res.data;
    $('lib-banner').hidden = true;
  }
}

$('btn-lib-retry').onclick = () => withBusy($('btn-lib-retry'), async () => {
  await loadLibrary();
  renderAll();
});

async function showApp() {
  // Invito a un team ricevuto prima di accedere: si riprende da dove si era rimasti.
  let pendingInvite = null;
  try { pendingInvite = sessionStorage.getItem('mr-pending-invite'); sessionStorage.removeItem('mr-pending-invite'); } catch (e) { /* ignora */ }
  if (pendingInvite) {
    window.location.replace(pageUrl('team.html?invite=' + encodeURIComponent(pendingInvite)));
    return;
  }
  startIdleLogout(sb, { beforeLogout: stopAllDictation });
  loginOverlay.classList.add('hidden');
  appRoot.classList.remove('hidden');
  const meta = currentUser.user_metadata || {};
  $('user-badge').textContent = (meta.nome || meta.cognome) ? [meta.nome, meta.cognome].filter(Boolean).join(' ') : (currentUser.email || '');
  await loadLibrary();
  workspaces = Array.from({ length: WORKSPACE_COUNT }, emptyWorkspace);
  loadWorkspace(0);
}

// "Esci": ferma la dettatura e ricarica la pagina, così nessun dato del referto resta in memoria
// per chi usa la postazione dopo (PC condivisi).
$('btn-logout').onclick = async () => {
  stopAllDictation();
  el.reportText.value = '';
  workspaces = [];
  try { if (sb) await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* si esce comunque */ }
  window.location.replace(pageUrl('app.html'));
};

(async function init() {
  if (!sb) {
    showLogin('Servizio non configurato: impossibile collegarsi al cloud.');
    return;
  }
  sb.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryMode = true;
      setTimeout(() => showAuthView('recovery'), 0);
    } else if (event === 'SIGNED_OUT' && currentUser) {
      // Uscita da un'altra scheda: azzera tutto.
      setTimeout(() => window.location.replace(pageUrl('app.html')), 0);
    }
  });

  const { data: { session } } = await sb.auth.getSession();
  if (recoveryMode) {
    showAuthView('recovery');
    return;
  }
  cleanUrl();
  if (urlAuthError && !session) {
    showLogin(urlAuthError);
    return;
  }
  if (session && session.user) {
    currentUser = session.user;
    await afterSignIn();
    if (isSignupConfirmation) flash('Email confermata: benvenuto in ModReport!', 3000);
  } else if (new URLSearchParams(initialSearch).get('timeout') === '1') {
    showLogin('Sei uscito automaticamente dopo un periodo di inattività sulla postazione condivisa.');
  } else {
    showLogin();
  }
  $('login-shared').checked = isSharedDevice();
})();
