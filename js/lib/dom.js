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

// Mostra un messaggio in un elemento .msg con stato ok/error/warn.
export function setMessage(el, text, kind) {
  if (!el) return;
  el.className = 'msg' + (kind ? ' msg--' + kind : '');
  el.textContent = text || '';
}

// Icona dello sprite Lucide (assets/icons.svg) come elemento SVG.
export function icon(name, extraClass = '') {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'icon' + (extraClass ? ' ' + extraClass : ''));
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', 'assets/icons.svg#' + name);
  svg.appendChild(use);
  return svg;
}

// Stessa icona come stringa HTML (per i template).
export const iconHtml = (name, extraClass = '') =>
  '<svg class="icon' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true"><use href="assets/icons.svg#' + name + '"></use></svg>';
