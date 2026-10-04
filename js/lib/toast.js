// Notifiche brevi accessibili (annunciate dagli screen reader), con azione opzionale (es. "Annulla").
let region = null;

function ensureRegion() {
  if (region && document.body.contains(region)) return region;
  region = document.createElement('div');
  region.className = 'toast-region';
  document.body.appendChild(region);
  return region;
}

export function toast(message, { type = 'info', duration = 4000, action = null } = {}) {
  const box = document.createElement('div');
  box.className = 'toast' + (type === 'error' ? ' toast--error' : '');
  box.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const text = document.createElement('span');
  text.textContent = message;
  box.appendChild(text);
  let timer = null;
  const close = () => { clearTimeout(timer); box.remove(); };
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.onclick = () => { close(); action.run(); };
    box.appendChild(b);
  }
  ensureRegion().appendChild(box);
  while (region.children.length > 3) region.firstChild.remove();
  timer = setTimeout(close, duration);
  return close;
}

export const toastError = (message, opts = {}) => toast(message, { type: 'error', duration: 7000, ...opts });
