// Il mio account (account.html): profilo, libreria personale, importazione referti, carte intestate.
import { getSupabase, pageUrl } from '../lib/supabase.js';
import { $, escapeHtml, setMessage } from '../lib/dom.js';
import { authErrorMessage } from '../lib/auth-messages.js';
import { LibraryStore, cloneDefaults } from '../lib/library.js';
import { DEFAULT_LIBRARY } from '../lib/default-library.js';
import { attachDictation, stopAllDictation, dictationDisabled, setDictationDisabled } from '../lib/dictation.js';
import { passwordProblem } from '../lib/auth-policy.js';
import { requireSession, needsMfa } from '../lib/session.js';
import { detectPII, splitIntoSentences, classifyFinding } from '../lib/import-analysis.js';
import { alertDialog, confirmDialog, promptDialog } from '../lib/dialog.js';
import { isLocalMode, setLocalMode, clearLocalData } from '../lib/local-backend.js';

const LETTERHEAD_MAX_BYTES = 5 * 1024 * 1024;
const sb = getSupabase();

let DATA = cloneDefaults();
let currentUser = null;
let store = null;
let libraryReady = false;

// ============================================================
// SALVATAGGIO DELLA LIBRERIA (stato visibile, conflitti, uscita dalla pagina)
// ============================================================
const statusEl = $('lib-status');

function renderStatus(status, error) {
  statusEl.hidden = false;
  statusEl.className = 'lib-status ' + status;
  statusEl.innerHTML = '';
  const text = document.createElement('span');
  const add = (label, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.onclick = fn;
    statusEl.appendChild(b);
  };
  statusEl.appendChild(text);
  if (status === 'pending' || status === 'saving') text.textContent = 'Salvataggio della libreria…';
  else if (status === 'saved') text.textContent = 'Libreria salvata ✓';
  else if (status === 'error') {
    text.textContent = 'Libreria NON salvata' + (error && error.message ? ' (' + error.message + ')' : '');
    add('Riprova', () => store.save());
  } else if (status === 'conflict') {
    text.textContent = 'La libreria è stata modificata in un\'altra finestra o postazione.';
    add('Ricarica', () => window.location.reload());
    add('Sovrascrivi con questa versione', () => store.save({ force: true }));
  }
}

function persist() {
  if (!libraryReady || !store) return;
  store.schedule(() => DATA);
}

window.addEventListener('beforeunload', (e) => {
  if (store && store.hasUnsavedChanges()) {
    store.flush();
    e.preventDefault();
    e.returnValue = '';
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && store) store.flush();
});
// Link interni: prima di lasciare la pagina completa il salvataggio in corso.
document.addEventListener('click', async (e) => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || a.target === '_blank' || !store || !store.hasUnsavedChanges()) return;
  e.preventDefault();
  await store.flush();
  if (store.hasUnsavedChanges()) {
    if (!confirm('Alcune modifiche alla libreria non sono state salvate. Uscire comunque?')) return;
  }
  window.location.href = a.href;
});

// Con la libreria non caricata, blocca tutte le modifiche (altrimenti si sovrascriverebbero i dati veri).
function setLibraryLocked(locked) {
  document.querySelectorAll('[data-lib-banner]').forEach((b) => { b.hidden = !locked; });
  ['tab-personalizza', 'tab-import'].forEach((id) => {
    const panel = $(id);
    panel.querySelectorAll('input, textarea, select, button').forEach((c) => {
      if (c.closest('[data-lib-banner]')) return;
      c.disabled = locked;
    });
  });
}

async function loadLibrary() {
  store = new LibraryStore({ supabase: sb, userId: currentUser.id, onStatus: renderStatus });
  const res = await store.load();
  if (res.status === 'error') {
    libraryReady = false;
    DATA = cloneDefaults();
    setLibraryLocked(true);
    return;
  }
  DATA = res.data;
  libraryReady = true;
  setLibraryLocked(false);
}

document.querySelectorAll('[data-lib-retry]').forEach((b) => {
  b.addEventListener('click', async () => {
    b.disabled = true;
    await loadLibrary();
    refreshAllSettingsSelects();
    b.disabled = false;
  });
});

// ============================================================
// LIBRERIA: SELECT E MODIFICHE
// ============================================================
function allEsami() {
  const out = [];
  DATA.metodiche.forEach((m) => (DATA.esamiByMetodica[m] || []).forEach((e) => out.push({ esame: e, metodica: m })));
  return out;
}

// Riempie una select mantenendo, se ancora valida, la scelta corrente.
function fillSelect(selectEl, items, placeholder) {
  const previous = selectEl.value;
  selectEl.innerHTML = '';
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    opt.disabled = true;
    opt.selected = true;
    selectEl.appendChild(opt);
  }
  items.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  });
  if (previous !== '' && items.some((i) => String(i.value) === previous)) selectEl.value = previous;
}

function refreshAllSettingsSelects() {
  fillSelect($('new-esame-metodica'), DATA.metodiche.map((m) => ({ value: m, label: m.toUpperCase() })));
  const esamiOptions = allEsami().map(({ esame, metodica }) => ({ value: esame, label: metodica.toUpperCase() + ' — ' + esame }));
  const none = esamiOptions.length ? null : 'Nessun esame disponibile';
  ['new-indicazione-esame', 'new-referto-esame', 'edit-referto-esame', 'edit-indicazione-esame', 'delete-esame-select']
    .forEach((id) => fillSelect($(id), esamiOptions, none));
  refreshEditRefertoGroups();
  refreshEditIndicazioneItems();
  refreshAiSelects();
}

function refreshEditRefertoGroups() {
  const esame = $('edit-referto-esame').value;
  const groups = DATA.refertoByEsame[esame] ? Object.keys(DATA.refertoByEsame[esame]) : [];
  fillSelect($('edit-referto-group'), groups.map((g) => ({ value: g, label: g })), groups.length ? null : 'Nessun gruppo');
  refreshEditRefertoButtons();
}

function refreshEditRefertoButtons() {
  const esame = $('edit-referto-esame').value;
  const group = $('edit-referto-group').value;
  const buttons = (DATA.refertoByEsame[esame] && DATA.refertoByEsame[esame][group]) || [];
  fillSelect($('edit-referto-button'), buttons.map((b, i) => ({ value: String(i), label: b.label })), buttons.length ? null : 'Nessun pulsante');
  loadEditRefertoFields();
}

function loadEditRefertoFields() {
  const esame = $('edit-referto-esame').value;
  const group = $('edit-referto-group').value;
  const idx = $('edit-referto-button').value;
  const btn = (DATA.refertoByEsame[esame] && DATA.refertoByEsame[esame][group] && DATA.refertoByEsame[esame][group][idx]) || null;
  $('edit-referto-label').value = btn ? btn.label : '';
  $('edit-referto-text').value = btn ? btn.text : '';
  $('edit-referto-neg').checked = btn ? !!btn.neg : false;
}

function refreshEditIndicazioneItems() {
  const esame = $('edit-indicazione-esame').value;
  const list = DATA.indicazioniByEsame[esame] || [];
  fillSelect($('edit-indicazione-item'), list.map((t, i) => ({ value: String(i), label: t })), list.length ? null : 'Nessuna indicazione');
  loadEditIndicazioneField();
}

function loadEditIndicazioneField() {
  const esame = $('edit-indicazione-esame').value;
  const idx = $('edit-indicazione-item').value;
  const list = DATA.indicazioniByEsame[esame] || [];
  $('edit-indicazione-text').value = (idx !== '' && list[idx] !== undefined) ? list[idx] : '';
}

$('add-metodica-btn').onclick = () => {
  const input = $('new-metodica-name');
  const name = input.value.trim();
  if (!name) return;
  if (!DATA.metodiche.includes(name)) {
    DATA.metodiche.push(name);
    DATA.esamiByMetodica[name] = DATA.esamiByMetodica[name] || [];
  }
  input.value = '';
  persist();
  refreshAllSettingsSelects();
};

$('add-esame-btn').onclick = () => {
  const metodica = $('new-esame-metodica').value;
  const input = $('new-esame-name');
  const name = input.value.trim();
  if (!metodica || !name) return;
  DATA.esamiByMetodica[metodica] = DATA.esamiByMetodica[metodica] || [];
  if (!DATA.esamiByMetodica[metodica].includes(name)) DATA.esamiByMetodica[metodica].push(name);
  input.value = '';
  persist();
  refreshAllSettingsSelects();
};

$('delete-esame-btn').onclick = () => {
  const esame = $('delete-esame-select').value;
  if (!esame) return;
  if (!confirm('Eliminare l\'esame "' + esame + '"? Verranno eliminate anche tutte le indicazioni e i pulsanti di referto associati a questo esame.')) return;
  DATA.metodiche.forEach((m) => {
    if (DATA.esamiByMetodica[m]) DATA.esamiByMetodica[m] = DATA.esamiByMetodica[m].filter((e) => e !== esame);
  });
  delete DATA.indicazioniByEsame[esame];
  delete DATA.refertoByEsame[esame];
  persist();
  refreshAllSettingsSelects();
};

$('add-indicazione-btn').onclick = () => {
  const esame = $('new-indicazione-esame').value;
  const input = $('new-indicazione-text');
  const text = input.value.trim();
  if (!esame || !text) return;
  DATA.indicazioniByEsame[esame] = DATA.indicazioniByEsame[esame] || [];
  DATA.indicazioniByEsame[esame].push(text);
  input.value = '';
  persist();
  refreshAllSettingsSelects();
};

$('add-referto-btn').onclick = () => {
  const esame = $('new-referto-esame').value;
  const group = $('new-referto-group').value.trim();
  const label = $('new-referto-label').value.trim();
  const text = $('new-referto-text').value.trim();
  const neg = $('new-referto-neg').checked;
  if (!esame || !group || !label || !text) return;
  DATA.refertoByEsame[esame] = DATA.refertoByEsame[esame] || {};
  DATA.refertoByEsame[esame][group] = DATA.refertoByEsame[esame][group] || [];
  DATA.refertoByEsame[esame][group].push({ label, text, neg });
  $('new-referto-group').value = '';
  $('new-referto-label').value = '';
  $('new-referto-text').value = '';
  $('new-referto-neg').checked = false;
  persist();
  refreshAllSettingsSelects();
};

$('edit-referto-esame').addEventListener('change', refreshEditRefertoGroups);
$('edit-referto-group').addEventListener('change', refreshEditRefertoButtons);
$('edit-referto-button').addEventListener('change', loadEditRefertoFields);

$('save-referto-btn').onclick = () => {
  const esame = $('edit-referto-esame').value;
  const group = $('edit-referto-group').value;
  const idx = $('edit-referto-button').value;
  if (!esame || !group || idx === '') return;
  const btn = DATA.refertoByEsame[esame] && DATA.refertoByEsame[esame][group] && DATA.refertoByEsame[esame][group][idx];
  if (!btn) return;
  btn.label = $('edit-referto-label').value.trim() || btn.label;
  btn.text = $('edit-referto-text').value.trim() || btn.text;
  btn.neg = $('edit-referto-neg').checked;
  persist();
  refreshEditRefertoButtons();
};

$('delete-referto-btn').onclick = () => {
  const esame = $('edit-referto-esame').value;
  const group = $('edit-referto-group').value;
  const idx = $('edit-referto-button').value;
  if (!esame || !group || idx === '') return;
  DATA.refertoByEsame[esame][group].splice(Number(idx), 1);
  if (DATA.refertoByEsame[esame][group].length === 0) delete DATA.refertoByEsame[esame][group];
  persist();
  refreshEditRefertoGroups();
};

$('edit-indicazione-esame').addEventListener('change', refreshEditIndicazioneItems);
$('edit-indicazione-item').addEventListener('change', loadEditIndicazioneField);

$('save-indicazione-btn').onclick = () => {
  const esame = $('edit-indicazione-esame').value;
  const idx = $('edit-indicazione-item').value;
  const newText = $('edit-indicazione-text').value.trim();
  if (!esame || idx === '' || !newText) return;
  DATA.indicazioniByEsame[esame][Number(idx)] = newText;
  persist();
  refreshEditIndicazioneItems();
};

$('delete-indicazione-btn').onclick = () => {
  const esame = $('edit-indicazione-esame').value;
  const idx = $('edit-indicazione-item').value;
  if (!esame || idx === '') return;
  DATA.indicazioniByEsame[esame].splice(Number(idx), 1);
  persist();
  refreshEditIndicazioneItems();
};

$('btn-reset-data').onclick = () => {
  if (!confirm('Ripristinare tutti i dati ai valori predefiniti? Le personalizzazioni aggiunte andranno perse.')) return;
  DATA = JSON.parse(JSON.stringify(DEFAULT_LIBRARY));
  persist();
  refreshAllSettingsSelects();
};

// ============================================================
// IMPORTAZIONE: SCOMPOSIZIONE DI UN REFERTO ESISTENTE
// ============================================================
function refreshAiSelects() {
  const metodicaSel = $('ai-metodica-riconosciuta');
  const prevMetodica = metodicaSel.value;
  fillSelect(metodicaSel, DATA.metodiche.map((m) => ({ value: m, label: m.toUpperCase() })), DATA.metodiche.length ? null : 'Nessuna metodica');
  if (DATA.metodiche.includes(prevMetodica)) metodicaSel.value = prevMetodica;
  refreshAiEsameOptions();
}

function refreshAiEsameOptions() {
  const metodica = $('ai-metodica-riconosciuta').value;
  const esameSel = $('ai-esame-riconosciuto');
  const esami = metodica ? (DATA.esamiByMetodica[metodica] || []) : [];
  fillSelect(esameSel, esami.map((e) => ({ value: e, label: e })), esami.length ? null : 'Nessun esame');
}

const normalizeForMatch = (s) => (s || '').toUpperCase().replace(/\s+/g, ' ').trim();

function findEsameInText(text) {
  const norm = normalizeForMatch(text);
  let best = null;
  allEsami().forEach(({ esame, metodica }) => {
    const enorm = normalizeForMatch(esame);
    if (enorm && norm.includes(enorm) && (!best || enorm.length > normalizeForMatch(best.esame).length)) best = { esame, metodica };
  });
  return best;
}

function findIndicazioneInText(text, esame) {
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*indicazion[ei]\s*(clinic[ah])?\s*[:\-]\s*(.+)$/i);
    if (m && m[2] && m[2].trim()) return m[2].trim();
  }
  if (esame && DATA.indicazioniByEsame[esame]) {
    const norm = normalizeForMatch(text);
    for (const ind of DATA.indicazioniByEsame[esame]) if (ind && norm.includes(normalizeForMatch(ind))) return ind;
  }
  return '';
}

function stripKnownLines(text, esameMatch, indicazioneText) {
  const skipPatterns = [
    /^indicazion[ei]\s*(clinic[ah])?\s*[:\-]/i,
    /^confronto con precedente/i,
    /^presa visione di precedente/i,
    /^non disponibili precedenti per confronto/i,
    /^dott\.?\s/i,
    /^refert[oi]\s*[:\-]?\s*$/i,
  ];
  const esameNorm = esameMatch ? normalizeForMatch(esameMatch.esame) : null;
  const metodicaNorm = esameMatch ? normalizeForMatch(esameMatch.metodica) : null;
  const indNorm = indicazioneText ? normalizeForMatch(indicazioneText) : null;
  return text.split('\n').filter((rawLine) => {
    const line = rawLine.trim();
    if (!line) return false;
    if (skipPatterns.some((re) => re.test(line))) return false;
    const lineNorm = normalizeForMatch(line);
    return !(lineNorm === esameNorm || lineNorm === metodicaNorm || lineNorm === indNorm);
  }).join('\n');
}

function guessGroup(sentence, esame) {
  if (!esame || !DATA.refertoByEsame[esame]) return '';
  const sentenceWords = sentence.toLowerCase().replace(/[.,;:]/g, '').split(/\s+/);
  for (const g of Object.keys(DATA.refertoByEsame[esame])) {
    const groupWords = g.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matched = groupWords.some((gw) => {
      const prefix = gw.slice(0, Math.min(5, gw.length));
      return sentenceWords.some((sw) => sw.startsWith(prefix));
    });
    if (matched) return g;
  }
  return '';
}

function guessLabel(sentence) {
  const clean = sentence.replace(/[.]+$/, '').trim();
  const words = clean.split(/\s+/);
  const short = words.slice(0, 6).join(' ');
  return short.length < clean.length ? short + '…' : short;
}

let aiProposedVoci = [];

const CLASS_HINT = {
  normale: 'Proposta automatica: reperto normale — verifica.',
  patologico: 'Proposta automatica: reperto patologico — verifica.',
  incerto: 'Classificazione incerta: scegli tu se è un reperto normale o patologico.',
};

function piiOf(voce) {
  return detectPII([voce.group, voce.label, voce.text].join(' \n '));
}

function renderAiVoci() {
  const list = $('ai-voci-list');
  const emptyRow = $('ai-voci-empty-row');
  list.innerHTML = '';
  if (!aiProposedVoci.length) { emptyRow.style.display = ''; return; }
  emptyRow.style.display = 'none';
  aiProposedVoci.forEach((voce, idx) => {
    const card = document.createElement('div');
    card.className = 'settings-section';
    card.innerHTML = `
      <div class="field-row">
        <div class="field">
          <label for="ai-voce-${idx}-group">Gruppo / distretto</label>
          <input type="text" id="ai-voce-${idx}-group" value="${escapeHtml(voce.group)}" placeholder="es. Parenchima">
        </div>
        <div class="field">
          <label for="ai-voce-${idx}-label">Etichetta pulsante</label>
          <input type="text" id="ai-voce-${idx}-label" value="${escapeHtml(voce.label)}">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="ai-voce-${idx}-text">Testo inserito nel referto</label>
          <textarea id="ai-voce-${idx}-text">${escapeHtml(voce.text)}</textarea>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="ai-voce-${idx}-class">Tipo di reperto</label>
          <select id="ai-voce-${idx}-class">
            <option value="">— scegli —</option>
            <option value="normale">Normale</option>
            <option value="patologico">Patologico / da approfondire</option>
          </select>
        </div>
      </div>
      <div class="muted" id="ai-voce-${idx}-hint"></div>
      <div class="field-message error" id="ai-voce-${idx}-pii"></div>
      <div class="field-row">
        <button class="btn-sm" id="ai-voce-${idx}-add-btn">+ Includi nella libreria</button>
      </div>`;
    list.appendChild(card);
    const q = (suffix) => card.querySelector('#ai-voce-' + idx + '-' + suffix);
    q('class').value = voce.cls;
    q('hint').textContent = CLASS_HINT[voce.suggestion] || '';
    const refresh = () => {
      const pii = piiOf(voce);
      q('pii').textContent = pii.length
        ? 'Contiene possibili dati del paziente (' + pii.map((p) => p.label).join(', ') + '): toglili prima di includere la voce.'
        : '';
      q('add-btn').disabled = !libraryReady || pii.length > 0 || !voce.cls;
    };
    q('group').addEventListener('input', (e) => { voce.group = e.target.value; refresh(); });
    q('label').addEventListener('input', (e) => { voce.label = e.target.value; refresh(); });
    q('text').addEventListener('input', (e) => { voce.text = e.target.value; refresh(); });
    q('class').addEventListener('change', (e) => { voce.cls = e.target.value; refresh(); });
    q('add-btn').addEventListener('click', () => addSingleVoceToLibrary(voce));
    refresh();
  });
}

function addSingleVoceToLibrary(voce) {
  const esame = $('ai-esame-riconosciuto').value;
  const msg = $('ai-add-message');
  if (!libraryReady) { setMessage(msg, 'Libreria non caricata: riprova prima di aggiungere voci.', 'error'); return; }
  if (!esame) { setMessage(msg, 'Seleziona prima l\'esame a cui aggiungere la voce.', 'error'); return; }
  const group = voce.group.trim();
  const label = voce.label.trim();
  const text = voce.text.trim();
  if (!group || !label || !text) { setMessage(msg, 'Compila gruppo, etichetta e testo prima di includere questa voce.', 'error'); return; }
  if (piiOf(voce).length) { setMessage(msg, 'La voce contiene possibili dati del paziente: toglili prima di includerla.', 'error'); return; }
  if (!voce.cls) { setMessage(msg, 'Scegli se la voce è un reperto normale o patologico.', 'error'); return; }
  DATA.refertoByEsame[esame] = DATA.refertoByEsame[esame] || {};
  DATA.refertoByEsame[esame][group] = DATA.refertoByEsame[esame][group] || [];
  DATA.refertoByEsame[esame][group].push({ label, text, neg: voce.cls === 'patologico' });
  persist();
  refreshAllSettingsSelects();
  aiProposedVoci = aiProposedVoci.filter((v) => v !== voce);
  renderAiVoci();
  setMessage(msg, 'Voce "' + label + '" aggiunta alla libreria per l\'esame "' + esame + '".', 'ok');
}

$('ai-metodica-riconosciuta').addEventListener('change', refreshAiEsameOptions);

$('ai-analyze-btn').onclick = () => {
  const rawText = $('ai-report-text').value;
  const msg = $('ai-message');
  if (!rawText || !rawText.trim()) { setMessage(msg, 'Incolla o detta prima il testo del referto da analizzare.', 'error'); return; }
  const esameMatch = findEsameInText(rawText);
  const indicazioneText = findIndicazioneInText(rawText, esameMatch ? esameMatch.esame : null);
  const sentences = splitIntoSentences(stripKnownLines(rawText, esameMatch, indicazioneText));
  aiProposedVoci = sentences.map((s) => {
    const suggestion = classifyFinding(s);
    return {
      group: guessGroup(s, esameMatch ? esameMatch.esame : null),
      label: guessLabel(s),
      text: s,
      suggestion,
      cls: suggestion === 'incerto' ? '' : suggestion,
    };
  });
  const pii = detectPII(rawText);
  setMessage($('ai-pii-warning'), pii.length
    ? 'Il testo incollato contiene possibili dati identificativi del paziente (' + pii.map((p) => p.label).join(', ') + '). Le voci che li contengono non possono essere incluse finché non li togli.'
    : '', 'warn');
  refreshAiSelects();
  if (esameMatch) {
    $('ai-metodica-riconosciuta').value = esameMatch.metodica;
    refreshAiEsameOptions();
    $('ai-esame-riconosciuto').value = esameMatch.esame;
  }
  const indRow = $('ai-indicazione-row');
  $('ai-indicazione-riconosciuta').value = indicazioneText || '';
  indRow.classList.toggle('hidden', !indicazioneText);
  renderAiVoci();
  $('ai-results').classList.remove('hidden');
  setMessage($('ai-add-message'), '');
  if (!esameMatch) setMessage(msg, 'Esame non riconosciuto automaticamente: selezionalo qui sotto per poter aggiungere le voci alla libreria.', 'error');
  else if (!sentences.length) setMessage(msg, 'Metodica ed esame riconosciuti, ma non è stata trovata nessuna frase da proporre come voce.', 'ok');
  else setMessage(msg, 'Analisi completata: rivedi i risultati qui sotto prima di aggiungerli alla libreria.', 'ok');
};

$('ai-add-indicazione-btn').onclick = () => {
  const esame = $('ai-esame-riconosciuto').value;
  const text = $('ai-indicazione-riconosciuta').value.trim();
  const msg = $('ai-add-message');
  if (!libraryReady) { setMessage(msg, 'Libreria non caricata: riprova prima di aggiungere voci.', 'error'); return; }
  if (!esame) { setMessage(msg, 'Seleziona prima un esame.', 'error'); return; }
  if (!text) return;
  if (detectPII(text).length) { setMessage(msg, 'L\'indicazione contiene possibili dati del paziente: toglili prima di aggiungerla.', 'error'); return; }
  DATA.indicazioniByEsame[esame] = DATA.indicazioniByEsame[esame] || [];
  if (!DATA.indicazioniByEsame[esame].includes(text)) {
    DATA.indicazioniByEsame[esame].push(text);
    persist();
    refreshAllSettingsSelects();
    setMessage(msg, 'Indicazione aggiunta alla libreria per l\'esame "' + esame + '".', 'ok');
  } else {
    setMessage(msg, 'Questa indicazione è già presente in libreria per questo esame.');
  }
};

$('pref-dictation-off').checked = dictationDisabled();
$('pref-dictation-off').addEventListener('change', (e) => {
  setDictationDisabled(e.target.checked);
  window.location.reload();
});

const dictationOpts = { onError: (m) => alert(m) };
[
  ['mic-ai-report-text', 'ai-report-text'],
  ['mic-new-indicazione-text', 'new-indicazione-text'],
  ['mic-new-referto-text', 'new-referto-text'],
  ['mic-edit-referto-text', 'edit-referto-text'],
  ['mic-edit-indicazione-text', 'edit-indicazione-text'],
].forEach(([btn, target]) => attachDictation($(btn), () => $(target), dictationOpts));

// ============================================================
// CARTE INTESTATE
// ============================================================
let letterheads = [];

async function loadLetterheads() {
  const { data, error } = await sb
    .from('letterheads')
    .select('id, nome, storage_path, margine_top, margine_left, margine_right, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) {
    setMessage($('lh-message'), 'Impossibile caricare le carte intestate: ' + error.message, 'error');
    return;
  }
  letterheads = data || [];
  renderLetterheads();
}

function renderLetterheads() {
  const list = $('lh-list');
  const empty = $('lh-empty');
  list.innerHTML = '';
  empty.classList.toggle('hidden', letterheads.length > 0);
  letterheads.forEach((lh) => {
    const item = document.createElement('div');
    item.className = 'lh-item';
    item.innerHTML = `
      <div class="lh-item-head"><span class="lh-item-name">${escapeHtml(lh.nome)}</span></div>
      <div class="lh-item-margins">Margini — superiore: ${escapeHtml(lh.margine_top)}mm · sinistro: ${escapeHtml(lh.margine_left)}mm · destro: ${escapeHtml(lh.margine_right)}mm</div>
      <div class="lh-item-actions">
        <button class="btn-sm" data-action="modifica">Modifica margini</button>
        <button class="btn-sm danger" data-action="elimina">Elimina</button>
      </div>`;
    item.querySelector('[data-action="elimina"]').onclick = async () => {
      if (!confirm('Eliminare la carta intestata "' + lh.nome + '"?')) return;
      await sb.storage.from('letterheads').remove([lh.storage_path]);
      const { error } = await sb.from('letterheads').delete().eq('id', lh.id);
      if (error) setMessage($('lh-message'), 'Errore durante l\'eliminazione: ' + error.message, 'error');
      loadLetterheads();
    };
    item.querySelector('[data-action="modifica"]').onclick = async () => {
      const ask = (label, current) => {
        const v = prompt(label, current);
        if (v === null) return null;
        const n = parseFloat(String(v).replace(',', '.'));
        return Number.isFinite(n) && n >= 0 ? n : Number(current);
      };
      const top = ask('Margine superiore (mm):', lh.margine_top); if (top === null) return;
      const left = ask('Margine sinistro (mm):', lh.margine_left); if (left === null) return;
      const right = ask('Margine destro (mm):', lh.margine_right); if (right === null) return;
      const { error } = await sb.from('letterheads').update({ margine_top: top, margine_left: left, margine_right: right }).eq('id', lh.id);
      if (error) setMessage($('lh-message'), 'Errore nel salvataggio dei margini: ' + error.message, 'error');
      loadLetterheads();
    };
    list.appendChild(item);
  });
}

const readMm = (id, fallback) => {
  const n = parseFloat(String($(id).value).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

$('lh-save-btn').onclick = async () => {
  const msg = $('lh-message');
  const nome = $('lh-nome').value.trim();
  const file = $('lh-file').files[0];
  if (!nome || !file) { setMessage(msg, 'Inserisci un nome e scegli un file PDF.', 'error'); return; }
  if (nome.length > 120) { setMessage(msg, 'Il nome può avere al massimo 120 caratteri.', 'error'); return; }
  if (file.size > LETTERHEAD_MAX_BYTES) { setMessage(msg, 'Il PDF supera 5 MB: riducilo (es. "Riduci dimensione file") e riprova.', 'error'); return; }
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...head) !== '%PDF-') { setMessage(msg, 'Il file scelto non è un PDF valido.', 'error'); return; }
  const btn = $('lh-save-btn');
  btn.disabled = true;
  setMessage(msg, 'Caricamento in corso…');
  try {
    const path = currentUser.id + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const { error: uploadError } = await sb.storage.from('letterheads').upload(path, file, { contentType: 'application/pdf' });
    if (uploadError) throw uploadError;
    const { error: insertError } = await sb.from('letterheads').insert({
      user_id: currentUser.id, nome, storage_path: path,
      margine_top: readMm('lh-margin-top', 40), margine_left: readMm('lh-margin-left', 20), margine_right: readMm('lh-margin-right', 20),
    });
    if (insertError) {
      await sb.storage.from('letterheads').remove([path]);
      throw insertError;
    }
    $('lh-nome').value = '';
    $('lh-file').value = '';
    setMessage(msg, 'Carta intestata salvata.', 'ok');
    loadLetterheads();
  } catch (e) {
    setMessage(msg, 'Errore: ' + e.message, 'error');
  }
  btn.disabled = false;
};

// ============================================================
// PROFILO, PASSWORD, ELIMINAZIONE ACCOUNT
// ============================================================
$('update-name-btn').onclick = async () => {
  const nome = $('profile-nome').value.trim();
  const cognome = $('profile-cognome').value.trim();
  const msg = $('name-message');
  if (!nome || !cognome) { setMessage(msg, 'Inserisci sia nome che cognome.', 'error'); return; }
  const btn = $('update-name-btn');
  btn.disabled = true;
  setMessage(msg, 'Salvataggio in corso…');
  try {
    if (nome.length > 80 || cognome.length > 80) throw new Error('Nome e cognome possono avere al massimo 80 caratteri.');
    const { error: authError } = await sb.auth.updateUser({ data: { nome, cognome } });
    if (authError) throw authError;
    currentUser.user_metadata = Object.assign({}, currentUser.user_metadata, { nome, cognome });
    await sb.from('profiles').upsert({ id: currentUser.id, nome, cognome });
    const { error: rpcError } = await sb.rpc('update_my_display_name', { new_nome: nome + ' ' + cognome });
    if (rpcError) setMessage(msg, 'Nome salvato, ma non aggiornato nella chat di team (' + rpcError.message + ').', 'warn');
    else setMessage(msg, 'Nome e cognome salvati.', 'ok');
  } catch (e) {
    setMessage(msg, authErrorMessage(e), 'error');
  }
  btn.disabled = false;
};

// Per le azioni sensibili chiede di nuovo la password (e il codice, se c'è la verifica in due passaggi).
async function confirmIdentity(reason) {
  const pwd = await promptDialog('Conferma la tua identità', {
    message: reason, label: 'Password attuale', type: 'password', autocomplete: 'current-password', okText: 'Conferma',
  });
  if (pwd === null) return false;
  const { error } = await sb.auth.signInWithPassword({ email: currentUser.email, password: pwd });
  if (error) { await alertDialog('Password non corretta', authErrorMessage(error)); return false; }
  if (await needsMfa(sb)) {
    const code = await promptDialog('Verifica in due passaggi', {
      label: 'Codice a 6 cifre dell\'app', inputmode: 'numeric', autocomplete: 'one-time-code',
      validate: (v) => (/^\d{6}$/.test(v.trim()) ? null : 'Inserisci le 6 cifre del codice.'),
    });
    if (code === null) return false;
    const { data: factors } = await sb.auth.mfa.listFactors();
    const factor = factors && factors.totp.find((f) => f.status === 'verified');
    const { error: mfaError } = await sb.auth.mfa.challengeAndVerify({ factorId: factor && factor.id, code: code.trim() });
    if (mfaError) { await alertDialog('Codice non valido', authErrorMessage(mfaError)); return false; }
  }
  return true;
}

$('update-password-btn').onclick = async () => {
  const pw1 = $('new-password').value;
  const pw2 = $('confirm-password').value;
  const msg = $('password-message');
  const problem = passwordProblem(pw1, currentUser.email);
  if (problem) { setMessage(msg, problem, 'error'); return; }
  if (pw1 !== pw2) { setMessage(msg, 'Le due password non coincidono.', 'error'); return; }
  if (!await confirmIdentity('Per cambiare la password inserisci quella attuale.')) return;
  const { error } = await sb.auth.updateUser({ password: pw1 });
  if (error) { setMessage(msg, authErrorMessage(error), 'error'); return; }
  setMessage(msg, 'Password aggiornata correttamente.', 'ok');
  $('new-password').value = '';
  $('confirm-password').value = '';
};

// ============================================================
// VERIFICA IN DUE PASSAGGI (TOTP)
// ============================================================
let enrollingFactorId = null;

async function refreshMfa() {
  const { data, error } = await sb.auth.mfa.listFactors();
  const msg = $('mfa-message');
  if (error) { setMessage(msg, authErrorMessage(error), 'error'); return; }
  // Elimina iscrizioni lasciate a metà.
  for (const f of (data.all || []).filter((x) => x.status !== 'verified' && x.id !== enrollingFactorId)) {
    await sb.auth.mfa.unenroll({ factorId: f.id });
  }
  const active = (data.totp || []).find((f) => f.status === 'verified');
  $('mfa-status').textContent = active
    ? 'Attiva: a ogni accesso ti chiederemo anche il codice dell\'app di autenticazione.'
    : 'Protegge l\'account con un codice generato da un\'app di autenticazione sul telefono.';
  $('mfa-enable-btn').hidden = !!active;
  $('mfa-disable-btn').hidden = !active;
  $('mfa-disable-btn').dataset.factorId = active ? active.id : '';
}

$('mfa-enable-btn').onclick = async () => {
  const msg = $('mfa-message');
  const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ModReport ' + new Date().toISOString().slice(0, 10) });
  if (error) { setMessage(msg, authErrorMessage(error), 'error'); return; }
  enrollingFactorId = data.id;
  $('mfa-qr').src = data.totp.qr_code;
  $('mfa-secret').textContent = data.totp.secret;
  $('mfa-enroll').hidden = false;
  $('mfa-enable-btn').hidden = true;
  $('mfa-enroll-code').focus();
  setMessage(msg, '');
};

$('mfa-verify-btn').onclick = async () => {
  const msg = $('mfa-message');
  const code = $('mfa-enroll-code').value.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) { setMessage(msg, 'Inserisci le 6 cifre del codice.', 'error'); return; }
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enrollingFactorId, code });
  if (error) { setMessage(msg, authErrorMessage(error), 'error'); return; }
  enrollingFactorId = null;
  $('mfa-enroll').hidden = true;
  $('mfa-enroll-code').value = '';
  setMessage(msg, 'Verifica in due passaggi attivata.', 'ok');
  refreshMfa();
};

$('mfa-disable-btn').onclick = async () => {
  if (!await confirmIdentity('Per disattivare la verifica in due passaggi conferma la tua identità.')) return;
  const { error } = await sb.auth.mfa.unenroll({ factorId: $('mfa-disable-btn').dataset.factorId });
  if (error) { setMessage($('mfa-message'), authErrorMessage(error), 'error'); return; }
  setMessage($('mfa-message'), 'Verifica in due passaggi disattivata.', 'ok');
  refreshMfa();
};

// ============================================================
// ELIMINAZIONE DELL'ACCOUNT
// ============================================================
async function removeAllMyFiles() {
  for (const bucket of ['letterheads', 'verifiche']) {
    for (;;) {
      const { data, error } = await sb.storage.from(bucket).list(currentUser.id, { limit: 100 });
      if (error) throw new Error('impossibile leggere i file (' + error.message + ')');
      if (!data || !data.length) break;
      const { error: rmError } = await sb.storage.from(bucket).remove(data.map((f) => currentUser.id + '/' + f.name));
      if (rmError) throw new Error('impossibile eliminare i file (' + rmError.message + ')');
      if (data.length < 100) break;
    }
  }
}

$('delete-account-btn').onclick = async () => {
  const msg = $('delete-account-message');
  const ok = await confirmDialog('Eliminare l\'account?',
    'Verranno cancellati in modo permanente: la libreria, l\'archivio, le carte intestate, i documenti caricati, i messaggi e l\'appartenenza ai team (i team di cui sei proprietario passano a un altro membro). L\'operazione non è reversibile.',
    { okText: 'Continua', danger: true });
  if (!ok) return;
  const typed = await promptDialog('Conferma definitiva', { label: 'Scrivi ELIMINA in maiuscolo', okText: 'Elimina l\'account' });
  if (typed !== 'ELIMINA') { setMessage(msg, 'Eliminazione annullata.', 'error'); return; }
  if (!await confirmIdentity('Per eliminare l\'account inserisci la password.')) return;
  const btn = $('delete-account-btn');
  btn.disabled = true;
  setMessage(msg, 'Eliminazione in corso…');
  try {
    await removeAllMyFiles();
    const { error } = await sb.rpc('delete_my_account');
    if (error) throw error;
    stopAllDictation();
    await sb.auth.signOut({ scope: 'local' });
    window.location.replace(pageUrl('index.html'));
  } catch (e) {
    btn.disabled = false;
    setMessage(msg, 'Errore durante l\'eliminazione: ' + e.message, 'error');
  }
};

$('clear-local-btn').onclick = async () => {
  if (!await confirmDialog('Cancellare i dati locali?', 'Libreria, carte intestate e impostazioni salvate in questo browser verranno eliminate. Se ti servono, esporta prima la libreria.', { okText: 'Cancella', danger: true })) return;
  await clearLocalData();
  setLocalMode(false);
  window.location.replace(pageUrl('app.html'));
};

$('btn-logout').onclick = async () => {
  stopAllDictation();
  if (isLocalMode()) setLocalMode(false);
  if (store) await store.flush();
  try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* si esce comunque */ }
  window.location.replace(pageUrl('app.html'));
};

document.querySelectorAll('.nav-item[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item[data-tab]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    $(btn.dataset.tab).classList.add('active');
  });
});

(async function init() {
  if (!sb) {
    $('gate').textContent = 'Configurazione cloud mancante.';
    return;
  }
  currentUser = await requireSession(sb);
  if (!currentUser) return;
  $('profile-email').value = currentUser.email || '';
  $('profile-nome').value = (currentUser.user_metadata && currentUser.user_metadata.nome) || '';
  $('profile-cognome').value = (currentUser.user_metadata && currentUser.user_metadata.cognome) || '';
  await loadLibrary();
  refreshAllSettingsSelects();
  await loadLetterheads();
  if (isLocalMode()) {
    document.querySelectorAll('[data-cloud-only]').forEach((n) => { n.hidden = true; });
    $('credentials-card').hidden = true;
    $('local-card').hidden = false;
  } else {
    await refreshMfa();
  }
  $('gate').classList.add('hidden');
  $('page-root').classList.remove('hidden');
})();
