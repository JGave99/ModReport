// Editor dei referti (app.html).
import { getSupabase, pageUrl } from '../lib/supabase.js';
import { $, icon } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { confirmDialog } from '../lib/dialog.js';
import { authErrorMessage, isExistingUserSignup, readAuthErrorFromHash } from '../lib/auth-messages.js';
import { LibraryStore, cloneDefaults } from '../lib/library.js';
import { attachDictation, stopAllDictation, setDictationDisabled, setLocalDictationPreferred } from '../lib/dictation.js';
import { buildReportPdf } from '../lib/pdf.js';
import { passwordProblem } from '../lib/auth-policy.js';
import { isSharedDevice, setSharedDevice, needsMfa, startIdleLogout } from '../lib/session.js';
import { addEntry } from '../lib/local-archive.js';
import { appendText, replaceRange, insertAtCursor, clearField } from '../lib/text-insert.js';
import { isLocalMode, setLocalMode } from '../lib/local-backend.js';
import {
  HEADER_RE, findPhrase, planToggle, negativeReport, negativePhrases, isConclusionGroup, isTechniqueGroup, nextField, fieldAt, prepareMeasure,
  findFields, splitSections, checkReport,
} from '../lib/report-text.js';
import { abbreviationEdit } from '../lib/voice-text.js';
import { createPalette } from '../lib/palette.js';
import { tomb } from '../lib/library-merge.js';

// Il fragment dell'URL va letto prima che supabase-js lo consumi.
const initialHash = window.location.hash;
const initialSearch = window.location.search;
const isRecoveryLink = /(^|[#&])type=recovery(&|$)/.test(initialHash);
const isSignupConfirmation = /(^|[#&])type=signup(&|$)/.test(initialHash);
const urlAuthError = readAuthErrorFromHash(initialHash) || readAuthErrorFromHash(initialSearch.replace(/^\?/, '#'));

// "Prova senza account" dalla landing (app.html?local=1): va attivata prima di creare il client.
if (new URLSearchParams(initialSearch).get('local') === '1') setLocalMode(true);

const sb = getSupabase();

let DATA = cloneDefaults();
// Frasi del referto negativo scelte per ogni esame: stanno nella libreria personale (negativoByEsame),
// valgono anche quando nell'editor si usa la libreria di un team.
let negativoByEsame = {};
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
  context: $('report-context'),
  stats: $('report-stats'),
  tabs: $('workspace-tabs'),
  libSourceEditorBox: $('lib-source-editor-box'),
  libSourceEditor: $('lib-source-editor'),
};

function flash(text, ms = 2500, action = null) {
  toast(text, { duration: ms, action });
}

// ---- Bozza: le schede sopravvivono a ricaricamenti e cambi di pagina (solo in questa scheda del browser).
const draftKey = () => 'mr-draft-' + (currentUser ? currentUser.id : 'anon');
function saveDraft() {
  if (!currentUser) return;
  clearTimeout(saveDraft.t);
  saveDraft.t = setTimeout(() => {
    try {
      saveActiveWorkspace();
      const hasContent = workspaces.some((w) => w.reportText.trim() || w.esame);
      if (hasContent) sessionStorage.setItem(draftKey(), JSON.stringify({ workspaces, activeWorkspace }));
      else sessionStorage.removeItem(draftKey());
    } catch (e) { /* spazio non disponibile: si continua senza bozza */ }
  }, 300);
}
function readDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(draftKey()));
    if (d && Array.isArray(d.workspaces) && d.workspaces.length === WORKSPACE_COUNT) return d;
  } catch (e) { /* bozza illeggibile */ }
  return null;
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
  caret = null;
  setUrgenzaButton();
  renderAll();
}

function switchWorkspace(i) {
  if (i === activeWorkspace) return;
  saveActiveWorkspace();
  loadWorkspace(i);
  saveDraft();
}

function renderWorkspaceTabs() {
  el.tabs.innerHTML = '';
  workspaces.forEach((w, i) => {
    const isActive = i === activeWorkspace;
    const hasContent = isActive
      ? !!(el.reportText.value.trim() || state.metodica || state.esame)
      : !!(w.reportText.trim() || w.metodica || w.esame);
    const b = document.createElement('button');
    b.className = 'wtab' + (hasContent ? ' has-content' : '');
    b.textContent = String(i + 1);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    b.setAttribute('aria-label', 'Referto ' + (i + 1) + (hasContent ? '' : ' (vuoto)'));
    b.onclick = () => switchWorkspace(i);
    el.tabs.appendChild(b);
  });
  updateStats();
}

function updateStats() {
  const v = el.reportText.value;
  const lines = v ? v.split('\n').filter((l) => l.trim()).length : 0;
  const fields = findFields(v).length;
  el.stats.textContent = lines + (lines === 1 ? ' riga' : ' righe') + ' · ' + v.length + ' caratteri' +
    (fields ? ' · ' + fields + (fields === 1 ? ' campo da compilare (Tab)' : ' campi da compilare (Tab)') : '');
  el.stats.classList.toggle('has-fields', fields > 0);
}

// ============================================================
// RENDER DEI BLOCCHI
// ============================================================
function renderMetodica() {
  el.metodicaRow.innerHTML = '';
  DATA.metodiche.forEach((m) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.setAttribute('aria-pressed', state.metodica === m ? 'true' : 'false');
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
    el.esameBody.innerHTML = '<p class="empty-hint">Seleziona prima una metodica.</p>';
    return;
  }
  const row = document.createElement('div');
  row.className = 'chip-row';
  (DATA.esamiByMetodica[state.metodica] || []).forEach((e) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.setAttribute('aria-pressed', state.esame === e ? 'true' : 'false');
    b.textContent = e;
    b.onclick = () => selectExam(state.metodica, e);
    row.appendChild(b);
  });
  el.esameBody.appendChild(row);
}

function selectExam(metodica, esame) {
  if (state.esame === esame && state.metodica === metodica) return;
  const previous = state.esame;
  state.metodica = metodica;
  state.esame = esame;
  renderAll();
  insertEsameLine(esame, previous);
}

function renderIndicazione() {
  el.indicazioneBody.innerHTML = '';
  if (!state.esame) {
    el.indicazioneBody.innerHTML = '<p class="empty-hint">Seleziona prima un esame.</p>';
    return;
  }
  const row = document.createElement('div');
  row.className = 'chip-row';
  (DATA.indicazioniByEsame[state.esame] || []).forEach((txt) => {
    const b = document.createElement('button');
    b.className = 'chip';
    const on = indicazioneLines.includes(txt);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) b.appendChild(icon('check'));
    b.append(txt);
    b.onclick = () => toggleIndicazione(txt);
    row.appendChild(b);
  });
  el.indicazioneBody.appendChild(row);

  const freeWrap = document.createElement('div');
  freeWrap.className = 'stack';
  freeWrap.style.gap = '8px';
  freeWrap.innerHTML = `
    <label class="visually-hidden" for="indicazione-free">Indicazione libera</label>
    <textarea class="input" id="indicazione-free" rows="2" placeholder="…oppure scrivi o detta un'indicazione libera"></textarea>
    <div class="row">
      <button class="btn btn--sm" id="mic-indicazione-free" aria-pressed="false" title="Detta"><svg class="icon" aria-hidden="true"><use href="assets/icons.svg#mic"></use></svg><span class="visually-hidden">Detta un'indicazione libera</span></button>
      <button class="btn btn--sm" id="add-indicazione-free"><svg class="icon" aria-hidden="true"><use href="assets/icons.svg#plus"></use></svg>Aggiungi</button>
    </div>`;
  el.indicazioneBody.appendChild(freeWrap);
  const ta = $('indicazione-free');
  $('add-indicazione-free').onclick = () => {
    if (ta.value.trim()) {
      insertIndicazione(ta.value.trim());
      ta.value = '';
    }
  };
  attachDictation($('mic-indicazione-free'), () => ta, { onError: (m) => toast(m, { type: 'error', duration: 7000 }) });
}

function toggleIndicazione(txt) {
  if (indicazioneLines.includes(txt)) {
    indicazioneLines = indicazioneLines.filter((x) => x !== txt);
    rebuildHeader();
  } else {
    insertIndicazione(txt);
  }
  renderIndicazione();
}

// Gruppi dell'esame corrente nel formato di report-text.js.
function currentGroups() {
  const groups = (state.esame && DATA.refertoByEsame[state.esame]) || {};
  return Object.entries(groups).map(([name, phrases]) => ({ name, phrases: Array.isArray(phrases) ? phrases : [] }));
}

function renderReferto() {
  el.refertoBody.innerHTML = '';
  $('negativo-actions').hidden = true;
  if (!state.esame) {
    el.refertoBody.innerHTML = '<p class="empty-hint">Seleziona prima un esame.</p>';
    return;
  }
  const groups = currentGroups();
  if (!groups.length) {
    el.refertoBody.innerHTML = '<p class="empty-hint">Nessuna frase per questo esame. Aggiungine dalla <a href="account.html#libreria">libreria delle frasi</a>.</p>';
    return;
  }
  $('negativo-actions').hidden = !groups.some((g) => g.phrases.some((p) => !p.neg));
  const note = document.createElement('p');
  note.className = 'sample-note';
  note.textContent = 'Frasi di esempio da verificare. Ogni frase si aggiunge in fondo al referto; una patologica sostituisce la normale dello stesso distretto; un secondo clic la toglie.';
  el.refertoBody.appendChild(note);

  groups.forEach((group, gi) => {
    const g = document.createElement('div');
    g.className = 'group' + (isTechniqueGroup(group.name) || isConclusionGroup(group.name) ? ' group--section' : '');
    const label = document.createElement('div');
    label.className = 'group__label';
    label.textContent = group.name;
    g.appendChild(label);
    const row = document.createElement('div');
    row.className = 'chip-row';
    group.phrases.forEach((btnData, pi) => {
      const b = document.createElement('button');
      b.className = 'chip phrase' + (btnData.neg ? ' phrase--abnormal' : '') + (btnData.opz ? ' phrase--optional' : '');
      b.dataset.gi = gi;
      b.dataset.pi = pi;
      b.title = btnData.text;
      b.appendChild(icon(btnData.opz ? 'plus' : btnData.neg ? 'circle-alert' : 'circle-check'));
      b.append(btnData.label);
      const kind = document.createElement('span');
      kind.className = 'visually-hidden';
      kind.textContent = btnData.opz ? ' (frase aggiuntiva)' : btnData.neg ? ' (reperto patologico)' : ' (reperto normale)';
      b.appendChild(kind);
      b.onclick = () => togglePhrase(gi, pi);
      row.appendChild(b);
    });
    g.appendChild(row);
    el.refertoBody.appendChild(g);
  });
  refreshPressed();
}

// Frasi già presenti nel testo (anche con i campi compilati): evidenziate e rimovibili con un secondo clic.
function refreshPressed() {
  const text = el.reportText.value;
  const groups = currentGroups();
  el.refertoBody.querySelectorAll('.phrase').forEach((b) => {
    const p = groups[b.dataset.gi] && groups[b.dataset.gi].phrases[b.dataset.pi];
    b.setAttribute('aria-pressed', p && findPhrase(text, p.text) ? 'true' : 'false');
  });
}

// Applica al testo una serie di modifiche (dall'ultima alla prima), ognuna annullabile con Ctrl+Z.
function applyEditsToReport(edits) {
  const ta = el.reportText;
  [...edits].sort((a, b) => b.start - a.start).forEach((e) => replaceRange(ta, e.start, e.end, e.insert));
  caret = null;
  renderWorkspaceTabs();
  saveDraft();
  refreshPressed();
}

// Sostituisce tutto il testo con newText toccando solo la parte cambiata (un solo passo di annullamento).
function replaceWhole(newText) {
  const ta = el.reportText;
  const old = ta.value;
  let a = 0;
  while (a < old.length && a < newText.length && old[a] === newText[a]) a += 1;
  let b = 0;
  while (b < old.length - a && b < newText.length - a && old[old.length - 1 - b] === newText[newText.length - 1 - b]) b += 1;
  replaceRange(ta, a, old.length - b, newText.slice(a, newText.length - b));
  return { start: a, end: newText.length - b };
}

// Con mouse e tastiera, dopo un inserimento il primo campo da compilare viene selezionato.
const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
function selectFirstFieldIn(start, end) {
  if (!finePointer) return;
  const ta = el.reportText;
  const f = findFields(ta.value).find((x) => x.start >= start && x.end <= end);
  if (f) selectField(f);
}

function togglePhrase(gi, pi) {
  const groups = currentGroups();
  const group = groups[gi];
  const phrase = group && group.phrases[pi];
  if (!phrase) return;
  const ta = el.reportText;
  // Le frasi nuove entrano sempre in fondo al referto, nell'ordine dei clic (issue #2), anche se il cursore è nel testo.
  const plan = planToggle(ta.value, groups, gi, pi, { blankBefore: pendingEsameOpen });
  const first = plan.edits.reduce((m, e) => Math.min(m, e.start), Infinity);
  applyEditsToReport(plan.edits);
  if (plan.action === 'insert') pendingEsameOpen = false;
  if (plan.action === 'replace') flash('Sostituita: «' + plan.replaced.map((p) => p.label).join('», «') + '»', 2500);
  if (plan.action !== 'remove') selectFirstFieldIn(first, first + phrase.text.length + 2);
}

function insertNegativeReport() {
  const groups = currentGroups();
  if (!groups.length) { flash('Scegli prima un esame con frasi in libreria.', 2500); return; }
  const { text, added } = negativeReport(el.reportText.value, groups, { ids: negativoIds(), blankBefore: pendingEsameOpen });
  if (!added.length) { flash('Le parti del referto negativo hanno già una frase.', 2500); return; }
  const range = replaceWhole(text);
  pendingEsameOpen = false;
  caret = null;
  renderWorkspaceTabs();
  saveDraft();
  refreshPressed();
  flash('Referto negativo: ' + added.length + (added.length === 1 ? ' frase inserita' : ' frasi inserite') + '. Una variante patologica sostituisce la frase del suo distretto.', 4000);
  selectFirstFieldIn(range.start, range.end);
}

function renderContext() {
  el.context.innerHTML = '';
  if (!state.metodica) { el.context.textContent = 'Nessun esame selezionato'; return; }
  const m = document.createElement('strong');
  m.textContent = state.metodica.toUpperCase();
  el.context.append(m);
  if (state.esame) {
    el.context.append(' › ');
    const e = document.createElement('strong');
    e.textContent = state.esame;
    el.context.append(e);
  }
}

function renderAll() {
  renderMetodica();
  renderEsame();
  renderIndicazione();
  renderReferto();
  renderContext();
  renderWorkspaceTabs();
}

el.reportText.addEventListener('input', () => { renderWorkspaceTabs(); saveDraft(); clearTimeout(refreshPressed.t); refreshPressed.t = setTimeout(refreshPressed, 250); });

// Posizione del cursore: se l'utente l'ha messo nel testo (non in fondo), l'esame e il confronto entrano lì;
// altrimenti in coda. Le frasi della libreria invece vanno sempre in fondo (togglePhrase).
let caret = null;
function rememberCaret() {
  const ta = el.reportText;
  caret = ta.selectionStart < ta.value.length ? { start: ta.selectionStart, end: ta.selectionEnd } : null;
}
el.reportText.addEventListener('click', rememberCaret);
el.reportText.addEventListener('keyup', rememberCaret);

// ============================================================
// COMPOSIZIONE DEL TESTO
// ============================================================
function computeHeader() {
  if (!indicazioneLines.length) return '';
  const label = urgenzaMode ? "Esame eseguito in regime d'urgenza con indicazione clinica: " : 'Indicazione: ';
  return label + indicazioneLines.join('; ') + '\n\n';
}

// L'intestazione (HEADER_RE) è la prima riga se inizia con "Indicazione" o con la formula d'urgenza,
// anche se l'utente l'ha modificata a mano: così non si duplica mai.

function rebuildHeader() {
  const ta = el.reportText;
  const m = ta.value.match(HEADER_RE);
  const oldLength = m ? m[0].length : 0;
  const newHeader = computeHeader();
  if (m || newHeader) replaceRange(ta, 0, oldLength, newHeader);
  lastHeaderText = newHeader;
  caret = null;
  renderWorkspaceTabs();
  saveDraft();
}

function appendToReport(text, trailingNewlines) {
  const ta = el.reportText;
  const tail = text + (trailingNewlines !== undefined ? trailingNewlines : '\n');
  if (caret && caret.start <= ta.value.length) {
    const before = ta.value.slice(0, caret.start);
    const after = ta.value.slice(caret.end);
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    const suffix = after && !after.startsWith('\n') && !tail.endsWith('\n') ? '\n' : '';
    insertAtCursor(ta, prefix + tail + suffix, caret.start, caret.end);
    caret = { start: ta.selectionStart, end: ta.selectionStart };
    if (caret.start >= ta.value.length) caret = null;
  } else {
    const prefix = ta.value.length && !ta.value.endsWith('\n') ? '\n' : '';
    appendText(ta, prefix + tail);
  }
  renderWorkspaceTabs();
  saveDraft();
}

function insertIndicazione(txt) {
  if (!indicazioneLines.includes(txt)) indicazioneLines.push(txt);
  rebuildHeader();
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cambiando esame prima di scrivere il referto, la riga dell'esame precedente viene sostituita.
function insertEsameLine(esameName, previous = null) {
  const ta = el.reportText;
  if (previous) {
    const m = ta.value.match(new RegExp('(^|\\n)' + escapeRe(previous) + '\\n*$'));
    if (m) {
      replaceRange(ta, m.index + m[1].length, ta.value.length, esameName + '\n');
      pendingEsameOpen = true;
      renderWorkspaceTabs();
      saveDraft();
      return;
    }
  }
  if (ta.value.length && !ta.value.endsWith('\n\n')) appendToReport('', '\n');
  appendToReport(esameName, '\n');
  pendingEsameOpen = true;
}

function insertConfronto(txt) {
  appendToReport(txt, '\n\n');
  pendingEsameOpen = false;
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
  saveActiveWorkspace();
  const snapshot = JSON.parse(JSON.stringify(workspaces[activeWorkspace]));
  urgenzaMode = false;
  indicazioneLines = [];
  lastHeaderText = '';
  pendingEsameOpen = false;
  caret = null;
  setUrgenzaButton();
  clearField(el.reportText);
  if (state.esame) insertEsameLine(state.esame);
  renderWorkspaceTabs();
  saveDraft();
  flash('Referto svuotato', 8000, {
    label: 'Annulla',
    run: () => { workspaces[activeWorkspace] = snapshot; loadWorkspace(activeWorkspace); saveDraft(); },
  });
};

// ============================================================
// CAMPI DA COMPILARE ([___], [a/b]): Tab per spostarsi, numeri o pulsanti per scegliere
// ============================================================
let currentChoice = null;

function selectField(f) {
  const ta = el.reportText;
  ta.focus({ preventScroll: true });
  const prep = prepareMeasure(f);
  if (prep) {
    replaceRange(ta, prep.edit.start, prep.edit.end, prep.edit.insert);
    ta.setSelectionRange(prep.select[0], prep.select[1]);
  } else {
    ta.setSelectionRange(f.start, f.end);
  }
  // Porta il campo in vista: il textarea scorre fino alla selezione.
  ta.blur();
  ta.focus({ preventScroll: false });
  updateFieldBar();
}

function updateFieldBar() {
  const ta = el.reportText;
  const bar = $('field-bar');
  const f = document.activeElement === ta ? fieldAt(ta.value, ta.selectionStart, ta.selectionEnd) : null;
  if (!f || f.kind !== 'scelta') { bar.hidden = true; currentChoice = null; return; }
  if (currentChoice && currentChoice.start === f.start && currentChoice.raw === f.raw && !bar.hidden) return;
  currentChoice = f;
  const box = $('field-options');
  box.innerHTML = '';
  f.options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    if (i < 9) { const k = document.createElement('kbd'); k.textContent = String(i + 1); b.appendChild(k); }
    b.append(opt);
    b.addEventListener('mousedown', (e) => e.preventDefault()); // il cursore resta nel testo
    b.onclick = () => chooseOption(i);
    box.appendChild(b);
  });
  bar.hidden = false;
}

function chooseOption(i) {
  const ta = el.reportText;
  const f = currentChoice && fieldAt(ta.value, ta.selectionStart, ta.selectionEnd);
  if (!f || !f.options || !f.options[i]) return;
  replaceRange(ta, f.start, f.end, f.options[i]);
  const after = f.start + f.options[i].length;
  // Campo successivo sulla stessa riga: si passa direttamente a quello.
  const next = findFields(ta.value).find((x) => x.start >= after && !ta.value.slice(after, x.start).includes('\n'));
  if (next) selectField(next); else { ta.setSelectionRange(after, after); updateFieldBar(); }
  saveDraft();
  refreshPressed();
}

el.reportText.addEventListener('keydown', (e) => {
  const ta = el.reportText;
  if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const f = nextField(ta.value, ta.selectionStart, ta.selectionEnd, { backwards: e.shiftKey });
    if (!f) return; // nessun campo: Tab esce dal testo come di consueto
    e.preventDefault();
    selectField(f);
    return;
  }
  if (currentChoice && /^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const f = fieldAt(ta.value, ta.selectionStart, ta.selectionEnd);
    if (f && f.kind === 'scelta' && f.options[Number(e.key) - 1]) {
      e.preventDefault();
      chooseOption(Number(e.key) - 1);
    }
  }
});
['select', 'keyup', 'mouseup', 'focus'].forEach((ev) => el.reportText.addEventListener(ev, () => setTimeout(updateFieldBar, 0)));
el.reportText.addEventListener('blur', () => setTimeout(updateFieldBar, 0));

// Abbreviazioni personali (Account → Preferenze): "/nn" + spazio → "nei limiti della norma".
function expandAbbreviation(field, e) {
  if (e.inputType !== 'insertText' || !e.data || e.data.length !== 1) return;
  const edit = abbreviationEdit(field.value, field.selectionStart, DATA.abbreviazioni);
  if (!edit) return;
  replaceRange(field, edit.start, edit.end, edit.insert);
  const caretAt = edit.start + edit.insert.length + 1;
  field.setSelectionRange(caretAt, caretAt);
}
el.reportText.addEventListener('input', (e) => expandAbbreviation(el.reportText, e));

// ============================================================
// CONTROLLI PRIMA DI COPIARE, STAMPARE O SALVARE
// ============================================================
function reportIssues() {
  return checkReport(el.reportText.value, { groups: currentGroups(), esame: state.esame || '' });
}

// true = si procede. Con avvisi chiede conferma; se si sceglie di correggere, seleziona il primo campo vuoto.
async function confirmChecks(verb, okText) {
  const issues = reportIssues();
  if (!issues.length) return true;
  const ok = await confirmDialog('Prima di ' + verb + ', controlla', '• ' + issues.map((i) => i.message).join('\n• '), { okText });
  if (!ok) {
    const first = findFields(el.reportText.value)[0];
    if (first) selectField(first); else el.reportText.focus();
  }
  return ok;
}

// ============================================================
// COPIA (tutto o per sezione), ARCHIVIO
// ============================================================
const SECTION_LABEL = { indicazione: 'indicazione', referto: 'referto senza indicazione', conclusioni: 'conclusioni' };

async function copyText(which = 'all') {
  const text = el.reportText.value;
  if (!text.trim()) { flash('Il referto è vuoto: niente da copiare', 1800); return; }
  let out = text;
  if (which !== 'all') {
    out = splitSections(text)[which];
    if (!out) { flash('Nel referto non c\'è la sezione "' + SECTION_LABEL[which] + '".', 2500); return; }
  }
  if (which !== 'indicazione' && !(await confirmChecks('copiare', 'Copia comunque'))) return;
  try {
    await navigator.clipboard.writeText(out);
  } catch (e) {
    const tmp = document.createElement('textarea');
    tmp.value = out;
    tmp.setAttribute('readonly', '');
    tmp.className = 'visually-hidden';
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    tmp.remove();
  }
  flash(which === 'all' ? 'Copiato negli appunti' : 'Copiato: ' + SECTION_LABEL[which], 1600);
}

$('btn-copy').onclick = () => copyText('all');

const copyMenuBtn = $('btn-copy-more');
const copyMenu = $('copy-menu');
function setCopyMenu(open) {
  copyMenu.hidden = !open;
  copyMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) copyMenu.querySelector('button').focus();
}
copyMenuBtn.onclick = () => setCopyMenu(copyMenu.hidden);
copyMenu.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => { setCopyMenu(false); copyText(b.dataset.copy); }));
copyMenu.addEventListener('keydown', (e) => {
  const items = [...copyMenu.querySelectorAll('button')];
  const i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { setCopyMenu(false); copyMenuBtn.focus(); }
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
});
document.addEventListener('click', (e) => { if (!copyMenu.hidden && !e.target.closest('#copy-split')) setCopyMenu(false); });

$('btn-archive').onclick = async () => {
  const testo = el.reportText.value.trim();
  if (!testo) { toast('Non c\'è nulla da salvare: il referto è vuoto.'); return; }
  if (testo.length > 20000) { toast('Il referto è troppo lungo per l\'archivio (massimo 20.000 caratteri).', { type: 'error' }); return; }
  if (isSharedDevice()) {
    toast('Su una postazione condivisa l\'archivio non è disponibile: copia o stampa il referto.', { duration: 6000 });
    return;
  }
  if (!(await confirmChecks('salvare', 'Salva comunque'))) return;
  if (!await confirmDialog('Salvare nell\'archivio di questo computer?', 'Il referto resta solo in questo browser e non viene inviato al cloud. Togli comunque i dati che identificano il paziente.', { okText: 'Salva' })) return;
  const btn = $('btn-archive');
  btn.disabled = true;
  try {
    await addEntry(currentUser.id, { esame: state.esame || null, testo });
    flash('Salvato nell\'archivio di questo computer', 1800);
  } catch (e) {
    toast('Errore durante il salvataggio: ' + e.message, { type: 'error', duration: 7000 });
  }
  btn.disabled = false;
};

attachDictation($('btn-mic-report'), () => el.reportText, {
  onError: (m) => toast(m, { type: 'error', duration: 8000 }),
  onStateChange: (on) => { $('rec-pill').hidden = !on; },
});

// ============================================================
// CONFRONTO E REFERTO NEGATIVO
// ============================================================
function insertComparison(txt) {
  const before = el.reportText.value.length;
  insertConfronto(txt);
  selectFirstFieldIn(before, el.reportText.value.length);
}
$('btn-confronto').onclick = () => insertComparison('Confronto con precedente analogo del [data].');
$('btn-presa-visione').onclick = () => insertComparison('Presa visione di precedente analogo del [data].');
$('btn-non-precedenti').onclick = () => insertConfronto('Non disponibili precedenti per confronto.');
$('btn-negativo').onclick = insertNegativeReport;

const negativoIds = () => (state.esame && negativoByEsame[state.esame]) || null;
const librarySource = () => (el.libSourceEditorBox.hidden ? 'personale' : el.libSourceEditor.value || 'personale');

function openNegativoDialog() {
  const groups = currentGroups();
  const chosen = new Set(negativePhrases(groups, negativoIds()).map((x) => x.phrase.id));
  const list = $('negativo-list');
  list.innerHTML = '';
  $('negativo-esame').textContent = state.esame;
  groups.forEach((g) => {
    const options = g.phrases.filter((p) => !p.neg && p.id);
    if (!options.length) return;
    const box = document.createElement('fieldset');
    box.className = 'negativo-group';
    const legend = document.createElement('legend');
    legend.textContent = g.name;
    box.appendChild(legend);
    options.forEach((p) => {
      const label = document.createElement('label');
      label.className = 'check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = p.id;
      input.checked = chosen.has(p.id);
      const text = document.createElement('span');
      text.textContent = p.text + (p.opz ? ' (aggiuntiva)' : '');
      label.append(input, text);
      box.appendChild(label);
    });
    list.appendChild(box);
  });
  $('negativo-dialog').showModal();
}

async function saveNegativo(ids) {
  const esame = state.esame;
  let status = null;
  const store = new LibraryStore({ supabase: sb, userId: currentUser.id, onStatus: (st) => { status = st; } });
  const res = await store.load();
  if (res.status === 'error') throw new Error('libreria non raggiungibile');
  const data = res.data;
  data.negativoByEsame = { ...(data.negativoByEsame || {}) };
  if (ids) data.negativoByEsame[esame] = ids; else delete data.negativoByEsame[esame];
  store.schedule(() => data);
  await store.flush();
  if (status !== 'saved') throw new Error(status === 'conflict' ? 'la libreria è stata modificata altrove, riprova' : 'salvataggio non riuscito');
  negativoByEsame = data.negativoByEsame;
  if (librarySource() === 'personale') { DATA = data; try { libCacheStore().setItem(libCacheKey(), JSON.stringify(DATA)); } catch (e) { /* ignora */ } }
}

$('btn-negativo-config').onclick = openNegativoDialog;
$('negativo-cancel').onclick = () => $('negativo-dialog').close();
$('negativo-default').onclick = () => withBusy($('negativo-default'), async () => {
  try { await saveNegativo(null); } catch (e) { toast('Non salvato: ' + e.message, { type: 'error' }); return; }
  $('negativo-dialog').close();
  toast('Referto negativo: tornano le frasi predefinite per ' + state.esame);
});
$('negativo-save').onclick = () => withBusy($('negativo-save'), async () => {
  const ids = [...$('negativo-list').querySelectorAll('input:checked')].map((i) => i.value);
  if (!ids.length) { toast('Scegli almeno una frase.', { type: 'error' }); return; }
  try { await saveNegativo(ids); } catch (e) { toast('Non salvato: ' + e.message, { type: 'error' }); return; }
  $('negativo-dialog').close();
  toast('Referto negativo salvato per ' + state.esame);
});

// ============================================================
// SCORCIATOIE DA TASTIERA
// ============================================================
document.addEventListener('keydown', (e) => {
  if (appRoot.classList.contains('hidden') || document.querySelector('dialog[open]')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 'Enter') { e.preventDefault(); copyText('all'); return; }
  if (mod && !e.shiftKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openPalette(); return; }
  if (mod && !e.shiftKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); $('btn-archive').click(); return; }
  if (mod && !e.shiftKey && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); $('btn-open-print').click(); return; }
  if (mod && e.key === '/') { e.preventDefault(); $('shortcuts-dialog').showModal(); return; }
  if (e.altKey && !mod && e.code === 'KeyN') { e.preventDefault(); insertNegativeReport(); return; }
  if (e.altKey && !mod && /^Digit[1-5]$/.test(e.code)) { e.preventDefault(); switchWorkspace(Number(e.code.slice(5)) - 1); }
});
// ============================================================
// RICERCA RAPIDA (Ctrl+K)
// ============================================================
function paletteItems() {
  const items = [
    { group: 'Comandi', icon: 'copy', label: 'Copia il referto', hint: 'Ctrl+Invio', run: () => copyText('all') },
    { group: 'Comandi', icon: 'copy', label: 'Copia solo il referto', hint: 'senza indicazione', run: () => copyText('referto') },
    { group: 'Comandi', icon: 'copy', label: 'Copia solo l\'indicazione', run: () => copyText('indicazione') },
    { group: 'Comandi', icon: 'circle-check', label: 'Referto negativo', hint: 'Alt+N', run: insertNegativeReport },
    { group: 'Comandi', icon: 'circle-check', label: 'Scegli le frasi del referto negativo', run: () => { if (state.esame) openNegativoDialog(); } },
    { group: 'Comandi', icon: 'printer', label: 'Stampa', hint: 'Ctrl+P', run: () => $('btn-open-print').click() },
    { group: 'Comandi', icon: 'save', label: 'Salva nell\'archivio', hint: 'Ctrl+S', run: () => $('btn-archive').click() },
    { group: 'Comandi', icon: 'mic', label: 'Detta nel referto', run: () => $('btn-mic-report').click() },
    { group: 'Comandi', icon: 'eraser', label: 'Svuota il referto', run: () => $('btn-reset').click() },
    { group: 'Comandi', icon: 'library-big', label: 'Libreria delle frasi', keywords: 'modifica account', run: () => { window.location.href = 'account.html#libreria'; } },
    { group: 'Comandi', icon: 'keyboard', label: 'Scorciatoie da tastiera', hint: 'Ctrl+/', run: () => $('shortcuts-dialog').showModal() },
  ];
  for (let i = 0; i < WORKSPACE_COUNT; i++) items.push({ group: 'Comandi', icon: 'file-text', label: 'Vai al referto ' + (i + 1), hint: 'Alt+' + (i + 1), keywords: 'scheda', run: () => switchWorkspace(i) });
  if (state.esame) {
    currentGroups().forEach((g, gi) => g.phrases.forEach((p, pi) => items.push({
      group: 'Frasi · ' + state.esame, icon: p.opz ? 'plus' : p.neg ? 'circle-alert' : 'circle-check',
      label: p.label, hint: g.name, keywords: p.text, rank: -1, run: () => togglePhrase(gi, pi),
    })));
    (DATA.indicazioniByEsame[state.esame] || []).forEach((txt) => items.push({ group: 'Indicazioni', icon: 'info', label: txt, run: () => toggleIndicazione(txt) }));
  }
  DATA.metodiche.forEach((m) => (DATA.esamiByMetodica[m] || []).forEach((e) => items.push({
    group: 'Esami', icon: 'chevron-right', label: e, hint: m, run: () => selectExam(m, e),
  })));
  return items;
}

const palette = createPalette({ dialog: $('palette'), input: $('palette-input'), list: $('palette-list'), getItems: paletteItems });
function openPalette() { palette.open(); }
$('btn-palette').onclick = openPalette;

$('btn-shortcuts').onclick = () => $('shortcuts-dialog').showModal();
$('shortcuts-close').onclick = () => $('shortcuts-dialog').close();

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
  node.className = 'msg' + (kind ? ' msg--' + kind : '');
  node.textContent = text || '';
}

// Firma: titolo scelto in Account → Profilo (Dott., Dott.ssa, Prof., Prof.ssa o nessuno) + nome e cognome.
function doctorSignature() {
  const meta = (currentUser && currentUser.user_metadata) || {};
  const nome = (meta.nome || '').trim();
  const cognome = (meta.cognome || '').trim();
  if (!nome && !cognome) return null;
  const titolo = typeof meta.titolo === 'string' ? meta.titolo.trim() : 'Dott.';
  return [titolo, nome, cognome].filter(Boolean).join(' ');
}

const PATIENT_FIELDS = [['print-patient-name', 'Paziente'], ['print-patient-birth', 'Data di nascita'], ['print-patient-id', 'N. accettazione']];
function clearPatientFields() { PATIENT_FIELDS.forEach(([id]) => { $(id).value = ''; }); }
const todayIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
function dateLineValue() {
  const place = $('print-place').value.trim();
  const iso = $('print-date').value;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '';
  return [place, date].filter(Boolean).join(', ') || null;
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
// I dati del paziente servono solo per il PDF corrente: chiudendo la finestra si cancellano.
print.overlay.addEventListener('close', clearPatientFields);

function closePrint() {
  if (print.overlay.open) print.overlay.close();
}
print.overlay.addEventListener('close', showPrintSetup);

function updateMarginsVisibility() {
  print.margins.hidden = !!print.select.value;
}

$('btn-open-print').onclick = async () => {
  if (!el.reportText.value.trim()) {
    toast('Il referto è vuoto: componi o scrivi del testo prima di stampare.');
    return;
  }
  if (!(await confirmChecks('stampare', 'Stampa comunque'))) return;
  showPrintSetup();
  clearPatientFields();
  $('print-date').value = todayIso();
  try { $('print-place').value = localStorage.getItem('mr-print-place') || ''; } catch (e) { /* ignora */ }
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
    : 'Nessuna carta intestata salvata: puoi aggiungerne una da Account → Stampa e firma.';
  updateMarginsVisibility();
  const sign = doctorSignature();
  setMsg(print.signatureInfo, sign
    ? 'Firma in calce: ' + sign
    : 'Nome e cognome non impostati: la firma non verrà stampata. Puoi aggiungerli in Account → Profilo.', sign ? '' : 'warn');
  print.overlay.showModal();
};

print.select.onchange = updateMarginsVisibility;
$('print-close').onclick = closePrint;
$('print-back').onclick = showPrintSetup;
print.overlay.addEventListener('click', (e) => { if (e.target === print.overlay) closePrint(); });

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
    const header = PATIENT_FIELDS.map(([id, label]) => ({ label, value: $(id).value }));
    try { localStorage.setItem('mr-print-place', $('print-place').value.trim()); } catch (e) { /* ignora */ }
    const result = await buildReportPdf({ text: el.reportText.value, template, margins, signature: doctorSignature(), header, dateLine: dateLineValue() });
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
// MENU UTENTE, TEMA, VISTA SU SCHERMI PICCOLI
// ============================================================
const menuBtn = $('user-menu-btn');
const menu = $('user-menu');
function setMenu(open) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    const theme = window.MR_THEME ? window.MR_THEME.get() : 'dark';
    menu.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-checked', b.dataset.themeSet === theme ? 'true' : 'false'));
    const first = menu.querySelector('a, button');
    if (first) first.focus();
  }
}
menuBtn.onclick = () => setMenu(menu.hidden);
document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.menu')) setMenu(false); });
menu.addEventListener('keydown', (e) => {
  const items = [...menu.querySelectorAll('a, button')];
  const i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { setMenu(false); menuBtn.focus(); }
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
});
menu.querySelectorAll('[data-theme-set]').forEach((b) => {
  b.addEventListener('click', () => {
    if (window.MR_THEME) window.MR_THEME.set(b.dataset.themeSet);
    setMenu(false);
  });
});

document.querySelectorAll('.mobile-switch [data-pane]').forEach((b) => {
  b.addEventListener('click', () => {
    $('workspace').dataset.pane = b.dataset.pane;
    document.querySelectorAll('.mobile-switch [data-pane]').forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
  });
});

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

/**
 * Carica le librerie dei team dell'utente
 */
async function loadTeamSources() {
  if (isLocalMode()) return;
  
  const { data: teamMembers, error: teamMembersError } = await sb.from('team_members').select('team_id').eq('user_id', currentUser.id);
  if (teamMembersError) return;
  
  // Se l'utente non è in nessun team, nascondi il selettore
  if (!teamMembers || teamMembers.length === 0) {
    el.libSourceEditorBox.hidden = true;
    return;
  }
  
  const teamIds = teamMembers.map(m => m.team_id);
  
  // Trova i team che hanno una libreria
  const { data: teamLibraries, error: teamLibrariesError } = await sb.from('team_libraries').select('team_id').in('team_id', teamIds);
  if (teamLibrariesError) return;
  
  if (!teamLibraries || teamLibraries.length === 0) {
    el.libSourceEditorBox.hidden = true;
    return;
  }
  
  const libraryTeamIds = teamLibraries.map(l => l.team_id);
  
  // Carica i nomi dei team
  const { data: teams, error: teamsError } = await sb.from('teams').select('id, nome').in('id', libraryTeamIds);
  if (teamsError) return;
  
  if (!teams || teams.length === 0) {
    el.libSourceEditorBox.hidden = true;
    return;
  }
  
  // Aggiungi le opzioni per i team
  const select = el.libSourceEditor;
  teams.forEach(team => {
    const option = document.createElement('option');
    option.value = team.id;
    option.textContent = team.nome;
    select.appendChild(option);
  });
  
  // Mostra il selettore
  el.libSourceEditorBox.hidden = false;
  
  // Al cambio si carica la libreria scelta (nell'editor è solo in lettura: non si salva mai).
  select.addEventListener('change', async () => {
    const selectedValue = select.value;
    try { localStorage.setItem('mr-lib-source-' + currentUser.id, selectedValue); } catch (e) { /* ignora */ }
    if (selectedValue === 'personale') {
      await loadLibrary();
    } else {
      const res = await new LibraryStore({ supabase: sb, userId: currentUser.id, table: 'team_libraries', keyColumn: 'team_id', keyValue: selectedValue }).load();
      if (res.status === 'ok') {
        DATA = res.data;
      } else {
        toast('Libreria del team non disponibile', { type: 'error' });
        select.value = 'personale';
        await loadLibrary();
      }
    }
    renderAll();
  });

  // Ripristina la scelta precedente (se il team ha ancora una libreria).
  let saved = null;
  try { saved = localStorage.getItem('mr-lib-source-' + currentUser.id); } catch (e) { saved = null; }
  if (saved && saved !== 'personale' && [...select.options].some((o) => o.value === saved)) {
    select.value = saved;
    select.dispatchEvent(new Event('change'));
  }
}

// Termini o informativa cambiati (o accettazione mai registrata): si chiede di nuovo il consenso.
async function needsConsent() {
  if (isLocalMode() || !LEGAL.TERMS_VERSION || !LEGAL.PRIVACY_VERSION) return false;
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

// La libreria caricata resta anche in una copia locale, usata se il server non risponde (offline).
const libCacheKey = () => 'mr-lib-cache-' + currentUser.id;
const libCacheStore = () => (isSharedDevice() ? sessionStorage : localStorage);
let libraryWasEmpty = false;

async function loadLibrary() {
  const store = new LibraryStore({ supabase: sb, userId: currentUser.id });
  const res = await store.load();
  libraryWasEmpty = res.status === 'empty';
  const banner = $('lib-banner');
  const bannerText = banner.querySelector('.banner__text');
  if (res.status === 'error') {
    let cached = null;
    try { cached = JSON.parse(libCacheStore().getItem(libCacheKey())); } catch (e) { cached = null; }
    DATA = cached || cloneDefaults();
    negativoByEsame = DATA.negativoByEsame || {};
    bannerText.textContent = cached
      ? 'Sei offline o il server non risponde: stai usando la copia della tua libreria salvata su questo computer.'
      : 'La tua libreria personale non è stata caricata (problema di connessione): stai vedendo le frasi predefinite.';
    banner.hidden = false;
    return;
  }
  DATA = res.data;
  negativoByEsame = DATA.negativoByEsame || {};
  banner.hidden = true;
  try { libCacheStore().setItem(libCacheKey(), JSON.stringify(DATA)); } catch (e) { /* spazio esaurito: si continua senza copia */ }
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
  if (isLocalMode()) {
    $('local-badge').hidden = false;
    $('link-team').hidden = true;
    $('logout-label').textContent = 'Esci dalla modalità locale';
  }
  loginOverlay.classList.add('hidden');
  appRoot.classList.remove('hidden');
  const meta = currentUser.user_metadata || {};
  const displayName = (meta.nome || meta.cognome) ? [meta.nome, meta.cognome].filter(Boolean).join(' ') : (isLocalMode() ? 'Utente locale' : (currentUser.email || ''));
  $('user-badge').textContent = displayName;
  $('user-avatar').textContent = displayName.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  await loadLibrary();
  await loadTeamSources();
  const draft = readDraft();
  workspaces = draft ? draft.workspaces : Array.from({ length: WORKSPACE_COUNT }, emptyWorkspace);
  loadWorkspace(draft ? draft.activeWorkspace : 0);
  if (draft) flash('Bozza ripristinata', 2500);
  if (needsOnboarding()) openOnboarding();
  document.body.dataset.ready = '1';
}

// "Esci": ferma la dettatura e ricarica la pagina, così nessun dato del referto resta in memoria
// per chi usa la postazione dopo (PC condivisi).
$('btn-local-mode').onclick = () => {
  setLocalMode(true);
  window.location.replace(pageUrl('app.html'));
};

$('btn-logout').onclick = async () => {
  stopAllDictation();
  if (isLocalMode()) setLocalMode(false);
  
  // Cancella la cache della libreria
  const cacheKey = 'mr-lib-cache-' + currentUser.id;
  try {
    sessionStorage.removeItem(cacheKey);
    localStorage.removeItem(cacheKey);
  } catch (e) { /* ignora */ }
  
  try { sessionStorage.removeItem(draftKey()); } catch (e) { /* ignora */ }
  el.reportText.value = '';
  workspaces = [];
  try { if (sb) await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* si esce comunque */ }
  window.location.replace(pageUrl('app.html'));
};

(async function init() {
  if (!sb) {
    showLogin(window.MR_ENV === 'prova'
      ? 'Versione di prova: gli account non sono ancora attivi. Usa "Prova senza account" qui sotto.'
      : 'Servizio non configurato: impossibile collegarsi al cloud.');
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

// ============================================================
// CONFIGURAZIONE GUIDATA AL PRIMO ACCESSO
// ============================================================
let onbStep = 1;
const onbFirstStep = () => (isLocalMode() ? 2 : 1);

function needsOnboarding() {
  if (!libraryWasEmpty || isSharedDevice()) return false;
  if (isLocalMode()) { try { return localStorage.getItem('mr-onboarded-local') !== '1'; } catch (e) { return false; } }
  return !(currentUser.user_metadata || {}).onboarded_at;
}

function showOnbStep(step) {
  onbStep = step;
  document.querySelectorAll('#onboarding .onb-step').forEach((sec) => { sec.hidden = Number(sec.dataset.step) !== step; });
  const first = onbFirstStep();
  $('onb-step-label').textContent = 'Passo ' + (step - first + 1) + ' di ' + (4 - first);
  $('onb-back').hidden = step === first;
  $('onb-next').textContent = step === 3 ? 'Inizia' : 'Avanti';
  $('onb-msg').textContent = '';
}

function openOnboarding() {
  const meta = currentUser.user_metadata || {};
  $('onb-titolo').value = typeof meta.titolo === 'string' ? meta.titolo : 'Dott.';
  $('onb-nome').value = meta.nome || '';
  $('onb-cognome').value = meta.cognome || '';
  const box = $('onb-metodiche');
  box.innerHTML = '';
  DATA.metodiche.forEach((m) => {
    const label = document.createElement('label');
    label.className = 'check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = m;
    input.checked = true;
    label.append(input, ' ' + m);
    box.appendChild(label);
  });
  showOnbStep(onbFirstStep());
  $('onboarding').showModal();
}

async function markOnboarded(extra = {}) {
  if (isLocalMode()) {
    try { localStorage.setItem('mr-onboarded-local', '1'); } catch (e) { /* ignora */ }
    return;
  }
  const data = { ...extra, onboarded_at: new Date().toISOString() };
  const { error } = await sb.auth.updateUser({ data });
  if (!error) currentUser.user_metadata = { ...(currentUser.user_metadata || {}), ...data };
}

async function finishOnboarding() {
  const chosen = [...$('onb-metodiche').querySelectorAll('input:checked')].map((i) => i.value);
  const profile = isLocalMode() ? {} : { titolo: $('onb-titolo').value, nome: $('onb-nome').value.trim(), cognome: $('onb-cognome').value.trim() };
  await markOnboarded(profile);
  const removed = DATA.metodiche.filter((m) => !chosen.includes(m));
  if (removed.length) {
    DATA.metodiche = DATA.metodiche.filter((m) => chosen.includes(m));
    DATA.removedBase = Array.isArray(DATA.removedBase) ? DATA.removedBase : [];
    removed.forEach((m) => { delete DATA.esamiByMetodica[m]; DATA.removedBase.push(tomb.metodica(m)); });
  }
  const store = new LibraryStore({ supabase: sb, userId: currentUser.id });
  const res = await store.load();
  if (res.status !== 'error') { store.schedule(() => DATA); await store.flush(); }
  const dettatura = (document.querySelector('input[name="onb-dettatura"]:checked') || {}).value;
  if (dettatura === 'off') setDictationDisabled(true);
  if (dettatura === 'locale') setLocalDictationPreferred(true);
  $('onboarding').close();
  if (state.metodica && !DATA.metodiche.includes(state.metodica)) { state.metodica = null; state.esame = null; }
  renderAll();
  toast('Tutto pronto: buon lavoro!');
  if (dettatura === 'off') window.location.reload();
}

$('onb-next').onclick = () => {
  if (onbStep === 2 && !$('onb-metodiche').querySelector('input:checked')) {
    $('onb-msg').textContent = 'Lascia almeno una metodica.';
    $('onb-msg').className = 'msg msg--error';
    return;
  }
  if (onbStep < 3) showOnbStep(onbStep + 1);
  else withBusy($('onb-next'), finishOnboarding);
};
$('onb-back').onclick = () => showOnbStep(Math.max(onbFirstStep(), onbStep - 1));
$('onb-skip').onclick = async () => { $('onboarding').close(); await markOnboarded(); };
$('onboarding').addEventListener('cancel', () => { markOnboarded(); });
