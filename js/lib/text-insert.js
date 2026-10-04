// Inserimento di testo in un campo mantenendo l'annulla nativo del browser (Ctrl+Z).
// Assegnare field.value cancella la cronologia di annullamento; execCommand('insertText') no.

function nativeInsert(field, start, end, text) {
  if (text === '' && start === end) return;
  const previouslyFocused = document.activeElement;
  field.focus({ preventScroll: true });
  field.setSelectionRange(start, end);
  let ok = false;
  try { ok = text === '' ? document.execCommand('delete', false) : document.execCommand('insertText', false, text); } catch { ok = false; }
  if (!ok) {
    // Ripiego (browser senza execCommand): il testo entra comunque, senza annulla nativo.
    field.setRangeText(text, start, end, 'end');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (previouslyFocused && previouslyFocused !== field && previouslyFocused.focus && document.contains(previouslyFocused)) {
    previouslyFocused.focus({ preventScroll: true });
  }
}

// Sostituisce l'intervallo [start, end) con text.
export function replaceRange(field, start, end, text) {
  nativeInsert(field, start, end, text);
}

// Inserisce text alla fine del campo.
export function appendText(field, text) {
  const end = field.value.length;
  nativeInsert(field, end, end, text);
  field.scrollTop = field.scrollHeight;
}

// Inserisce text alla posizione del cursore (o al posto della selezione).
export function insertAtCursor(field, text, start = field.selectionStart, end = field.selectionEnd) {
  nativeInsert(field, start, end, text);
}

// Svuota il campo in modo annullabile con Ctrl+Z.
export function clearField(field) {
  if (field.value) nativeInsert(field, 0, field.value.length, '');
}
