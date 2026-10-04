// Dettatura vocale con la Web Speech API del browser (un solo microfono attivo alla volta).
// L'audio è elaborato dal servizio vocale del browser (Google, Microsoft o Apple): al primo uso
// lo si spiega all'utente, che può anche disattivare la dettatura su questo computer.
import { confirmDialog } from './dialog.js';

const ACK_KEY = 'mr-dictation-ack-v1';
const OFF_KEY = 'mr-dictation-off';
const NOTICE = 'La dettatura usa il servizio di riconoscimento vocale del tuo browser: l\'audio viene inviato ed elaborato dal fornitore del browser (Google per Chrome, Microsoft per Edge, Apple per Safari) secondo i suoi termini. ModReport non riceve né conserva l\'audio.\n\nNon dettare dati che identificano il paziente (nome, data di nascita, codici).\n\nPuoi disattivare la dettatura in "Il mio account".';

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

async function acknowledged() {
  if (store.get(ACK_KEY) === '1') return true;
  const ok = await confirmDialog('Dettatura vocale', NOTICE, { okText: 'Ho capito, attiva' });
  if (ok) store.set(ACK_KEY, '1');
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

export function stopAllDictation() {
  for (const stop of [...active]) stop();
}

// getTarget: funzione che restituisce il campo (input/textarea) in cui scrivere.
// onError: funzione per mostrare un messaggio all'utente (default: alert).
export function attachDictation(button, getTarget, { onError = (m) => alert(m), lang = 'it-IT' } = {}) {
  let recognition = null;
  let recording = false;

  const setRecording = (on) => {
    recording = on;
    button.classList.toggle('recording', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
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
    if (!await acknowledged()) return;
    stopAllDictation();

    recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      finalText = finalText.trim();
      if (!finalText) return;
      const needsSpace = target.value && !/\s$/.test(target.value);
      target.value = target.value + (needsSpace ? ' ' : '') + finalText + ' ';
      target.dispatchEvent(new Event('input', { bubbles: true }));
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
