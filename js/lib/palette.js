// Ricerca rapida (Ctrl+K): elenco filtrabile di comandi, esami, frasi e indicazioni, tutto da tastiera.
import { icon } from './dom.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Ogni parola cercata deve comparire (senza accenti né maiuscole); prima chi inizia con la prima parola.
export function filterItems(items, query, limit = 60) {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return items.slice(0, limit);
  const scored = [];
  items.forEach((it, order) => {
    const hay = norm([it.label, it.hint, it.group, it.keywords].filter(Boolean).join(' '));
    if (!tokens.every((t) => hay.includes(t))) return;
    const label = norm(it.label);
    const pos = label.indexOf(tokens[0]);
    const score = (label.startsWith(tokens[0]) ? 0 : pos === -1 ? 2 : 1) * 1000 + (it.rank || 0) * 100 + order / 1000;
    scored.push({ it, score });
  });
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.it);
}

// dialog: <dialog> con input e lista; getItems(): [{ label, hint, group, icon, keywords, run }]
export function createPalette({ dialog, input, list, getItems }) {
  let items = [];
  let shown = [];
  let active = 0;

  function render() {
    shown = filterItems(items, input.value);
    list.innerHTML = '';
    if (!shown.length) {
      const li = document.createElement('li');
      li.className = 'palette__empty';
      li.textContent = 'Nessun risultato';
      list.appendChild(li);
      input.removeAttribute('aria-activedescendant');
      return;
    }
    let group = null;
    shown.forEach((it, i) => {
      if (it.group !== group) {
        group = it.group;
        const h = document.createElement('li');
        h.className = 'palette__group';
        h.setAttribute('role', 'presentation');
        h.textContent = group || '';
        list.appendChild(h);
      }
      const li = document.createElement('li');
      li.id = 'palette-opt-' + i;
      li.className = 'palette__item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === active ? 'true' : 'false');
      if (it.icon) li.appendChild(icon(it.icon));
      const text = document.createElement('span');
      text.className = 'palette__label';
      text.textContent = it.label;
      li.appendChild(text);
      if (it.hint) {
        const hint = document.createElement('span');
        hint.className = 'palette__hint';
        hint.textContent = it.hint;
        li.appendChild(hint);
      }
      li.addEventListener('mousedown', (e) => e.preventDefault());
      li.addEventListener('click', () => pick(i));
      li.addEventListener('mousemove', () => { if (active !== i) { active = i; mark(); } });
      list.appendChild(li);
    });
    mark();
  }

  function mark() {
    list.querySelectorAll('[role=option]').forEach((li) => {
      const on = li.id === 'palette-opt-' + active;
      li.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) li.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', 'palette-opt-' + active);
  }

  function pick(i) {
    const it = shown[i];
    if (!it) return;
    dialog.close();
    setTimeout(() => it.run(), 0);
  }

  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (shown.length) { active = (active + 1) % shown.length; mark(); } }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (shown.length) { active = (active - 1 + shown.length) % shown.length; mark(); } }
    if (e.key === 'Enter') { e.preventDefault(); pick(active); }
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  return {
    open(query = '') {
      items = getItems();
      input.value = query;
      active = 0;
      render();
      dialog.showModal();
      input.focus();
    },
  };
}
