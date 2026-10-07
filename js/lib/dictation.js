// Dettatura vocale con la Web Speech API del browser (un solo microfono attivo alla volta).
// Di norma l'audio è elaborato dal servizio vocale del browser (Google, Microsoft o Apple): al primo uso
// lo si spiega all'utente, che può disattivare la dettatura o chiedere l'elaborazione sul dispositivo
// (Chrome recenti: l'audio non lascia il computer). I comandi vocali ("punto", "a capo"…) diventano punteggiatura.
import { confirmDialog } from './dialog.js';
import { toast } from './toast.js';
import { appendText, insertAtCursor } from './text-insert.js';
import { applyVoiceCommands } from './voice-text.js';

const ACK_KEY = 'mr-dictation-ack-v1';
const ACK_LOCAL_KEY = 'mr-dictation-ack-local-v1';
const OFF_KEY = 'mr-dictation-off';
const LOCAL_KEY = 'mr-dictation-local';
const COMMANDS_KEY = 'mr-voice-commands';
const NOTICE_LOCAL = 'La dettatura è elaborata da questo browser sul tuo computer: l\'audio non viene inviato a nessuno, nemmeno a ModReport.\n\nNon dettare comunque dati che identificano il paziente (nome, data di nascita, codici).';
const NOTICE = 'La dettatura usa il servizio di riconoscimento vocale del tuo browser: l\'audio viene inviato ed elaborato dal fornitore del browser (Google per Chrome, Microsoft per Edge, Apple per Safari) secondo i suoi termini. ModReport non riceve né conserva l\'audio.\n\nNon dettare dati che identificano il paziente (nome, data di nascita, codici).\n\nIn Account → Preferenze puoi disattivarla o chiedere che la voce sia elaborata solo su questo computer (se il browser lo consente).';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignora */ } },
};

export function dictationDisabled() {
  return store.get(OFF_KEY) === '1';
}

export function setDictationDisabled(off) {
  store.set(OFF_KEY, off ? '1' : null);
}

// Elaborazione solo sul dispositivo (se il browser la supporta).
export const localDictationPreferred = () => store.get(LOCAL_KEY) === '1';
export const setLocalDictationPreferred = (on) => store.set(LOCAL_KEY, on ? '1' : null);
// Comandi vocali di punteggiatura (attivi salvo scelta contraria).
export const voiceCommandsEnabled = () => store.get(COMMANDS_KEY) !== 'off';
export const setVoiceCommandsEnabled = (on) => store.set(COMMANDS_KEY, on ? null : 'off');

async function acknowledged(local) {
  const key = local ? ACK_LOCAL_KEY : ACK_KEY;
  if (store.get(key) === '1') return true;
  const ok = await confirmDialog('Dettatura vocale', local ? NOTICE_LOCAL : NOTICE, { okText: 'Ho capito, attiva' });
  if (ok) store.set(key, '1');
  return ok;
}

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

const ERROR_MESSAGES = {
  'not-allowed': 'Permesso al microfono negato. Consenti l\'accesso al microfono per questo sito (icona del lucchetto nella barra degli indirizzi) e riprova.',
  'service-not-allowed': 'Il browser ha bloccato il servizio di riconoscimento vocale. Controlla le impostazioni del microfono del browser e del sistema operativo.',
  'no-speech': 'Non ho sentito nessuna voce. Riprova parlando subito dopo aver premuto il microfono.',
  'audio-capture': 'Nessun microfono disponibile. Controlla che sia collegato e non in uso da un\'altra app.',
  'network': 'Problema di rete con il servizio di riconoscimento vocale. Controlla la connessione.',
  'aborted': null,
};

const active = new Set();

export const dictationSupported = !!SpeechRecognitionCtor;

// Stato del riconoscimento sul dispositivo: 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported'.
// Supporta sia l'interfaccia attuale (available/install con processLocally) sia quella precedente (…OnDevice).
export async function localDictationStatus(lang = 'it-IT') {
  const C = SpeechRecognitionCtor;
  if (!C) return 'unsupported';
  try {
    if (typeof C.available === 'function') return await C.available({ langs: [lang], processLocally: true });
    if (typeof C.availableOnDevice === 'function') return await C.availableOnDevice(lang);
  } catch (e) { return 'unavailable'; }
  return 'unsupported';
}

export async function installLocalDictation(lang = 'it-IT') {
  const C = SpeechRecognitionCtor;
  try {
    if (typeof C.install === 'function') return !!(await C.install({ langs: [lang], processLocally: true }));
    if (typeof C.installOnDevice === 'function') return !!(await C.installOnDevice(lang));
  } catch (e) { return false; }
  return false;
}

// Prepara l'elaborazione locale: true se si può partire, altrimenti spiega il motivo.
async function ensureLocal(lang, onError) {
  const status = await localDictationStatus(lang);
  if (status === 'available') return true;
  if (status === 'downloadable') {
    const ok = await confirmDialog('Riconoscimento vocale sul dispositivo',
      'Il browser deve scaricare una sola volta il modello per l\'italiano. Dopo, l\'audio della dettatura resta su questo computer.', { okText: 'Scarica' });
    if (!ok) return false;
    toast('Download del riconoscimento vocale in corso…', { duration: 4000 });
    if (await installLocalDictation(lang)) return true;
    onError('Il download del riconoscimento vocale non è riuscito. Riprova più tardi.');
    return false;
  }
  if (status === 'downloading') { onError('Il browser sta ancora scaricando il riconoscimento vocale: riprova tra poco.'); return false; }
  onError('Questo browser non può elaborare la voce sul dispositivo. Usa un Chrome aggiornato oppure togli l\'opzione in Account → Preferenze.');
  return false;
}

export function stopAllDictation() {
  for (const stop of [...active]) stop();
}

// getTarget: funzione che restituisce il campo (input/textarea) in cui scrivere.
// onError: funzione per mostrare un messaggio all'utente (default: alert).
export function attachDictation(button, getTarget, { onError = (m) => toast(m, { type: 'error', duration: 8000 }), onStateChange = null, lang = 'it-IT' } = {}) {
  let recognition = null;
  let recording = false;

  const setRecording = (on) => {
    recording = on;
    button.classList.toggle('recording', on);
    button.classList.toggle('is-recording', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (onStateChange) onStateChange(on);
  };
  const stop = () => { if (recognition) { try { recognition.stop(); } catch { /* già fermo */ } } };

  if (dictationDisabled()) {
    button.hidden = true;
    return { stop };
  }

  button.addEventListener('click', async () => {
    const target = getTarget();
    if (!target) return;
    if (!SpeechRecognitionCtor) {
      onError('La dettatura vocale non è supportata da questo browser. Usa Chrome, Edge o Safari aggiornati.');
      return;
    }
    if (!window.isSecureContext) {
      onError('La dettatura funziona solo su una pagina aperta in HTTPS.');
      return;
    }
    if (recording) { stop(); return; }
    const local = localDictationPreferred();
    if (!await acknowledged(local)) return;
    if (local && !await ensureLocal(lang, onError)) return;
    stopAllDictation();

    recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = false;
    if (local) {
      if ('processLocally' in recognition) recognition.processLocally = true;
      else recognition.mode = 'ondevice-only';
    }
    recognition.onresult = (e) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      finalText = finalText.trim();
      if (!finalText) return;
      // Inserimento annullabile (Ctrl+Z), alla posizione del cursore se non è in fondo.
      const atEnd = typeof target.selectionStart !== 'number' || target.selectionStart >= target.value.length;
      const before = atEnd ? target.value : target.value.slice(0, target.selectionStart);
      if (voiceCommandsEnabled()) finalText = applyVoiceCommands(finalText);
      // Maiuscola a inizio frase (testo vuoto, dopo un punto o un a capo).
      if (!before.trim() || /[.?!]\s*$|\n\s*$/.test(before)) finalText = finalText.charAt(0).toUpperCase() + finalText.slice(1);
      const lead = before && !/\s$/.test(before) && !/^[\s.,;:?)]/.test(finalText) ? ' ' : '';
      const text = lead + finalText + (/\n$/.test(finalText) ? '' : ' ');
      if (atEnd) appendText(target, text); else insertAtCursor(target, text);
    };
    recognition.onerror = (e) => {
      setRecording(false);
      const msg = Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, e.error) ? ERROR_MESSAGES[e.error] : 'Errore del microfono: ' + e.error;
      if (msg) onError(msg);
    };
    recognition.onend = () => {
      setRecording(false);
      active.delete(stop);
    };
    try {
      recognition.start();
      setRecording(true);
      active.add(stop);
    } catch (err) {
      setRecording(false);
      onError('Non sono riuscito ad avviare la dettatura: ' + err.message);
    }
  });

  return { stop };
}
