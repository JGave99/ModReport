// Finestre di dialogo accessibili (<dialog> nativo: Esc, focus bloccato, sfondo inerte).
// Sostituiscono alert/confirm/prompt del browser. Stili in css/components.css (.dialog).
import { escapeHtml } from './dom.js';

function open({ title, message = '', input = null, okText = 'OK', cancelText = 'Annulla', danger = false, validate = null }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.setAttribute('aria-labelledby', 'mr-dialog-title');
    const inputHtml = input
      ? `<div class="field">
           <label for="mr-dialog-input">${escapeHtml(input.label || '')}</label>
           <input id="mr-dialog-input" type="${escapeHtml(input.type || 'text')}" value="${escapeHtml(input.value || '')}"
             ${input.autocomplete ? `autocomplete="${escapeHtml(input.autocomplete)}"` : ''} ${input.inputmode ? `inputmode="${escapeHtml(input.inputmode)}"` : ''}>
         </div>`
      : '';
    dlg.innerHTML = `<form method="dialog" novalidate>
      <div class="dialog__head"><h2 id="mr-dialog-title">${escapeHtml(title)}</h2></div>
      <div class="dialog__body">
        ${message ? `<p>${escapeHtml(message)}</p>` : ''}
        ${inputHtml}
        <div class="msg msg--error" role="alert"></div>
      </div>
      <div class="dialog__actions">
        ${cancelText ? `<button type="button" class="btn" data-cancel>${escapeHtml(cancelText)}</button>` : ''}
        <button type="submit" class="btn ${danger ? 'btn--danger-solid' : 'btn--primary'}">${escapeHtml(okText)}</button>
      </div>
    </form>`;
    document.body.appendChild(dlg);
    const field = dlg.querySelector('input');
    const errorBox = dlg.querySelector('.msg');
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
