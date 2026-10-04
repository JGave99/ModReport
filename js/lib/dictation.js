// Dettatura vocale con la Web Speech API del browser (un solo microfono attivo alla volta).
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

  button.addEventListener('click', () => {
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
