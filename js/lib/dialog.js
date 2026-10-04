// Finestre di dialogo accessibili (<dialog> nativo: Esc, focus bloccato, sfondo inerte).
// Sostituiscono alert/confirm/prompt del browser.
import { escapeHtml } from './dom.js';

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  const css = document.createElement('style');
  css.textContent = `
    dialog.mr-dialog{ border:1px solid var(--line, #334155); border-radius:12px; padding:0; width:min(440px, 92vw);
      background: var(--panel, #1e293b); color: var(--ink, #f8fafc); font-family: var(--font, sans-serif); }
    dialog.mr-dialog::backdrop{ background: rgba(4,9,14,.72); }
    .mr-dialog form{ padding:22px 24px; display:flex; flex-direction:column; gap:12px; }
    .mr-dialog h2{ margin:0; font-size:16px; }
    .mr-dialog p{ margin:0; font-size:13.5px; line-height:1.55; color: var(--ink-soft, #94a3b8); white-space:pre-line; }
    .mr-dialog label{ font-size:12px; color: var(--ink-soft, #94a3b8); }
    .mr-dialog input{ width:100%; font:inherit; font-size:14px; padding:9px 11px; border:1px solid var(--line, #334155);
      border-radius:6px; background: var(--bg, #0f172a); color: var(--ink, #f8fafc); }
    .mr-dialog input:focus-visible{ outline:2px solid #7dd3fc; outline-offset:1px; }
    .mr-dialog .mr-actions{ display:flex; justify-content:flex-end; gap:8px; margin-top:6px; }
    .mr-dialog button{ font:inherit; font-size:13px; font-weight:600; padding:8px 16px; border-radius:6px; cursor:pointer;
      border:1px solid var(--line, #334155); background:transparent; color: var(--ink, #f8fafc); }
    .mr-dialog button.primary{ background:#0369a1; border-color:#0369a1; color:#fff; }
    .mr-dialog button.danger{ background:#b91c1c; border-color:#b91c1c; color:#fff; }
    .mr-dialog .mr-error{ color:#f87171; font-size:12.5px; min-height:16px; }`;
  document.head.appendChild(css);
}

function open({ title, message = '', input = null, okText = 'OK', cancelText = 'Annulla', danger = false, validate = null }) {
  ensureStyle();
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'mr-dialog';
    const inputHtml = input
      ? `<label for="mr-dialog-input">${escapeHtml(input.label || '')}</label>
         <input id="mr-dialog-input" type="${escapeHtml(input.type || 'text')}" value="${escapeHtml(input.value || '')}"
           ${input.autocomplete ? `autocomplete="${escapeHtml(input.autocomplete)}"` : ''} ${input.inputmode ? `inputmode="${escapeHtml(input.inputmode)}"` : ''}>`
      : '';
    dlg.innerHTML = `<form method="dialog">
      <h2>${escapeHtml(title)}</h2>
      ${message ? `<p>${escapeHtml(message)}</p>` : ''}
      ${inputHtml}
      <div class="mr-error" role="alert"></div>
      <div class="mr-actions">
        ${cancelText ? `<button type="button" value="cancel" data-cancel>${escapeHtml(cancelText)}</button>` : ''}
        <button type="submit" value="ok" class="${danger ? 'danger' : 'primary'}">${escapeHtml(okText)}</button>
      </div>
    </form>`;
    document.body.appendChild(dlg);
    const field = dlg.querySelector('input');
    const errorBox = dlg.querySelector('.mr-error');
    let result = null;
    const finish = (value) => { result = value; dlg.close(); };
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    const cancel = dlg.querySelector('[data-cancel]');
    if (cancel) cancel.addEventListener('click', () => finish(null));
    dlg.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const value = field ? field.value : true;
      const problem = validate ? validate(value) : null;
      if (problem) { errorBox.textContent = problem; return; }
      finish(value);
    });
    dlg.showModal();
    (field || dlg.querySelector('button[type=submit]')).focus();
  });
}

export const alertDialog = (title, message) => open({ title, message, cancelText: null });
export const confirmDialog = (title, message, { okText = 'Conferma', danger = false } = {}) =>
  open({ title, message, okText, danger }).then((v) => v === true);
export const promptDialog = (title, { message = '', label = '', value = '', type = 'text', okText = 'OK', validate, autocomplete, inputmode } = {}) =>
  open({ title, message, okText, validate, input: { label, value, type, autocomplete, inputmode } });
