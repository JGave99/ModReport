// Utilità DOM condivise.

// Escape completo per testo inserito in HTML, anche dentro attributi tra virgolette.
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function $(id) {
  return document.getElementById(id);
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// Mostra un messaggio in un elemento .field-message con stato ok/error.
export function setMessage(el, text, kind) {
  if (!el) return;
  el.className = 'field-message' + (kind ? ' ' + kind : '');
  el.textContent = text || '';
}
