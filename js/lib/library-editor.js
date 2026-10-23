// Editor della libreria: albero metodiche → esami a sinistra, dettaglio dell'esame a destra
// (indicazioni e gruppi di frasi) con modifica in linea, riordino e annullamento delle eliminazioni.
import { icon } from './dom.js';
import { confirmDialog, promptDialog } from './dialog.js';
import { toast } from './toast.js';
import { newPhraseId, isBaseId, tomb } from './library-merge.js';

const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

function btn(label, iconName, onClick, { cls = 'btn btn--ghost btn--icon btn--sm', title = label } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.title = title;
  b.setAttribute('aria-label', label);
  if (iconName) b.appendChild(icon(iconName));
  if (!cls.includes('btn--icon')) b.append(label);
  b.onclick = onClick;
  return b;
}

export function createLibraryEditor(root, { getData, onChange }) {
  let selected = null; // { metodica, esame }
  let filter = '';

  const D = () => getData();
  const changed = () => { onChange(); render(); };

  function examExists(name) {
    return Object.values(D().esamiByMetodica).some((list) => (list || []).includes(name));
  }

  // Ciò che l'utente elimina dalla libreria predefinita non deve tornare con gli aggiornamenti.
  function markRemoved(keys) {
    const d = D();
    d.removedBase = Array.isArray(d.removedBase) ? d.removedBase : [];
    keys.filter(Boolean).forEach((k) => { if (!d.removedBase.includes(k)) d.removedBase.push(k); });
  }
  function unmarkRemoved(keys) {
    const d = D();
    if (Array.isArray(d.removedBase)) d.removedBase = d.removedBase.filter((k) => !keys.includes(k));
  }
  const baseIdsIn = (groups) => Object.values(groups || {}).flat().map((p) => p && p.id).filter(isBaseId);
  const newPhrase = () => ({ id: newPhraseId(), label: 'Nuova frase', text: '', neg: false });

  // ---------- Operazioni ----------
  async function addMetodica() {
    const nome = await promptDialog('Nuova metodica', { label: 'Nome', validate: (v) => (!v.trim() ? 'Scrivi un nome.' : D().metodiche.includes(v.trim()) ? 'Esiste già.' : null) });
    if (nome === null) return;
    D().metodiche.push(nome.trim());
    D().esamiByMetodica[nome.trim()] = [];
    changed();
  }

  async function renameMetodica(m) {
    const nome = await promptDialog('Rinomina metodica', { label: 'Nuovo nome', value: m, validate: (v) => (!v.trim() ? 'Scrivi un nome.' : v.trim() !== m && D().metodiche.includes(v.trim()) ? 'Esiste già.' : null) });
    if (nome === null || nome.trim() === m) return;
    const d = D();
    d.metodiche[d.metodiche.indexOf(m)] = nome.trim();
    d.esamiByMetodica[nome.trim()] = d.esamiByMetodica[m] || [];
    delete d.esamiByMetodica[m];
    markRemoved([tomb.metodica(m)]);
    if (selected && selected.metodica === m) selected.metodica = nome.trim();
    changed();
  }

  async function deleteMetodica(m) {
    const exams = D().esamiByMetodica[m] || [];
    if (exams.length) { toast('Elimina o sposta prima gli esami di questa metodica.'); return; }
    if (!await confirmDialog('Eliminare la metodica "' + m + '"?', 'La metodica è vuota.', { okText: 'Elimina', danger: true })) return;
    const d = D();
    d.metodiche = d.metodiche.filter((x) => x !== m);
    delete d.esamiByMetodica[m];
    markRemoved([tomb.metodica(m)]);
    changed();
  }

  async function addEsame(m) {
    const nome = await promptDialog('Nuovo esame in ' + m, { label: 'Nome dell\'esame', validate: (v) => (!v.trim() ? 'Scrivi un nome.' : examExists(v.trim()) ? 'Esiste già un esame con questo nome.' : null) });
    if (nome === null) return;
    const d = D();
    (d.esamiByMetodica[m] = d.esamiByMetodica[m] || []).push(nome.trim());
    d.indicazioniByEsame[nome.trim()] = [];
    d.refertoByEsame[nome.trim()] = {};
    selected = { metodica: m, esame: nome.trim() };
    changed();
  }

  async function renameEsame() {
    const { metodica, esame } = selected;
    const nome = await promptDialog('Rinomina esame', { label: 'Nuovo nome', value: esame, validate: (v) => (!v.trim() ? 'Scrivi un nome.' : v.trim() !== esame && examExists(v.trim()) ? 'Esiste già.' : null) });
    if (nome === null || nome.trim() === esame) return;
    const d = D();
    const list = d.esamiByMetodica[metodica];
    list[list.indexOf(esame)] = nome.trim();
    if (d.indicazioniByEsame[esame]) { d.indicazioniByEsame[nome.trim()] = d.indicazioniByEsame[esame]; delete d.indicazioniByEsame[esame]; }
    if (d.refertoByEsame[esame]) { d.refertoByEsame[nome.trim()] = d.refertoByEsame[esame]; delete d.refertoByEsame[esame]; }
    markRemoved([tomb.esame(esame)]);
    selected.esame = nome.trim();
    changed();
  }

  async function deleteEsame() {
    const { metodica, esame } = selected;
    if (!await confirmDialog('Eliminare l\'esame "' + esame + '"?', 'Verranno eliminate anche le sue indicazioni e frasi.', { okText: 'Elimina', danger: true })) return;
    const d = D();
    markRemoved([tomb.esame(esame), ...baseIdsIn(d.refertoByEsame[esame]), ...(d.indicazioniByEsame[esame] || []).map((t) => tomb.ind(esame, t))]);
    d.esamiByMetodica[metodica] = d.esamiByMetodica[metodica].filter((e) => e !== esame);
    delete d.indicazioniByEsame[esame];
    delete d.refertoByEsame[esame];
    selected = null;
    changed();
  }

  function moveEsame(delta) {
    const list = D().esamiByMetodica[selected.metodica];
    move(list, list.indexOf(selected.esame), delta);
    changed();
  }

  // Elimina con possibilità di annullare (toast). keys: voci della base da non riproporre.
  function removeWithUndo(arr, index, what, keys = []) {
    const [item] = arr.splice(index, 1);
    markRemoved(keys);
    changed();
    toast(what + ' eliminata', { duration: 7000, action: { label: 'Annulla', run: () => { arr.splice(index, 0, item); unmarkRemoved(keys); changed(); } } });
  }

  async function renameGroup(name) {
    const groups = D().refertoByEsame[selected.esame];
    const nome = await promptDialog('Rinomina gruppo', { label: 'Nome del gruppo / distretto', value: name, validate: (v) => (!v.trim() ? 'Scrivi un nome.' : v.trim() !== name && groups[v.trim()] ? 'Esiste già.' : null) });
    if (nome === null || nome.trim() === name) return;
    const rebuilt = {};
    Object.keys(groups).forEach((k) => { rebuilt[k === name ? nome.trim() : k] = groups[k]; });
    D().refertoByEsame[selected.esame] = rebuilt;
    changed();
  }

  async function deleteGroup(name) {
    if (!await confirmDialog('Eliminare il gruppo "' + name + '"?', 'Verranno eliminate tutte le sue frasi.', { okText: 'Elimina', danger: true })) return;
    markRemoved(baseIdsIn({ [name]: D().refertoByEsame[selected.esame][name] }));
    delete D().refertoByEsame[selected.esame][name];
    changed();
  }

  // Nuovo ordine dei gruppi (sezioni) dell'esame: decide l'ordine dei pulsanti nell'editor e del referto negativo.
  function setGroupOrder(names) {
    const groups = D().refertoByEsame[selected.esame];
    const rebuilt = {};
    names.forEach((k) => { if (groups[k]) rebuilt[k] = groups[k]; });
    Object.keys(groups).forEach((k) => { if (!rebuilt[k]) rebuilt[k] = groups[k]; });
    if (Object.keys(rebuilt).join('\u0001') === Object.keys(groups).join('\u0001')) return false;
    D().refertoByEsame[selected.esame] = rebuilt;
    return true;
  }

  // Elenco compatto delle sezioni, separato dalle frasi (issue #2): si trascina con mouse o dito,
  // oppure da tastiera con Alt + freccia su/giù sulla sezione selezionata. Un clic porta alla sezione.
  let focusGroup = null;
  function renderGroupOrder(container, esame, keys) {
    const sec = document.createElement('section');
    sec.className = 'lib-section lib-order';
    const h = document.createElement('h4');
    h.id = 'lib-order-title';
    h.textContent = 'Ordine delle sezioni del referto';
    const hint = document.createElement('p');
    hint.className = 'subtle';
    hint.textContent = keys.length > 1
      ? 'Trascina le sezioni per ordinare i pulsanti nell\'editor e le frasi del referto negativo. Da tastiera: Alt + ↑ / ↓.'
      : 'Con più sezioni potrai ordinarle qui.';
    const list = document.createElement('ol');
    list.className = 'order-list';
    list.setAttribute('aria-labelledby', 'lib-order-title');
    keys.forEach((g, i) => {
      const li = document.createElement('li');
      li.className = 'order-item';
      li.tabIndex = 0;
      li.dataset.name = g;
      li.setAttribute('aria-label', (i + 1) + '. ' + g + ', ' + D().refertoByEsame[esame][g].length + ' frasi');
      li.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
      const grip = icon('grip-vertical');
      grip.classList.add('order-item__grip');
      const name = document.createElement('span');
      name.className = 'order-item__name';
      name.textContent = g;
      const count = document.createElement('span');
      count.className = 'subtle';
      count.textContent = D().refertoByEsame[esame][g].length + ' frasi';
      li.append(grip, name, count);
      li.addEventListener('keydown', (e) => {
        if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        const names = [...keys];
        move(names, i, e.key === 'ArrowUp' ? -1 : 1);
        focusGroup = g;
        if (setGroupOrder(names)) changed();
      });
      li.addEventListener('pointerdown', (e) => startDrag(e, li, list));
      list.appendChild(li);
    });
    sec.append(h, hint, list);
    container.appendChild(sec);
  }

  function startDrag(e, li, list) {
    if (e.button !== 0) return;
    // Col dito si trascina solo dalla maniglia, così sul resto dell'elenco la pagina scorre.
    if (e.pointerType !== 'mouse' && !e.target.closest('.order-item__grip')) return;
    const startY = e.clientY;
    let moved = false;
    const onMove = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!moved && Math.abs(ev.clientY - startY) < 4) return;
      if (!moved) { moved = true; li.classList.add('is-dragging'); list.classList.add('is-sorting'); }
      ev.preventDefault();
      const others = [...list.children].filter((x) => x !== li);
      const before = others.find((x) => { const r = x.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
      if (before) { if (li.nextSibling !== before) list.insertBefore(li, before); } else if (list.lastChild !== li) list.appendChild(li);
    };
    const onUp = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      li.classList.remove('is-dragging');
      list.classList.remove('is-sorting');
      if (!moved) {
        const target = root.querySelector('[data-group-section="' + CSS.escape(li.dataset.name) + '"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      focusGroup = li.dataset.name;
      if (setGroupOrder([...list.children].map((x) => x.dataset.name))) changed(); else render();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  async function addGroup() {
    const groups = (D().refertoByEsame[selected.esame] = D().refertoByEsame[selected.esame] || {});
    const nome = await promptDialog('Nuovo gruppo / distretto', { label: 'Nome (es. Parenchima, Tecnica, Conclusioni)', validate: (v) => (!v.trim() ? 'Scrivi un nome.' : groups[v.trim()] ? 'Esiste già.' : null) });
    if (nome === null) return;
    groups[nome.trim()] = [newPhrase()];
    changed();
  }

  // ---------- Disegno ----------
  function renderTree(container) {
    container.innerHTML = '';
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'input';
    search.placeholder = 'Cerca esame…';
    search.setAttribute('aria-label', 'Cerca esame');
    search.value = filter;
    search.oninput = () => { filter = search.value; renderTreeList(list); };
    const list = document.createElement('div');
    list.className = 'lib-tree__list';
    container.append(search, list, btn('Nuova metodica', 'plus', addMetodica, { cls: 'btn btn--sm' }));
    renderTreeList(list);
  }

  function renderTreeList(list) {
    list.innerHTML = '';
    const q = filter.trim().toLowerCase();
    D().metodiche.forEach((m) => {
      const exams = (D().esamiByMetodica[m] || []).filter((e) => !q || e.toLowerCase().includes(q));
      if (q && !exams.length) return;
      const box = document.createElement('div');
      box.className = 'lib-tree__group';
      const head = document.createElement('div');
      head.className = 'lib-tree__head';
      const title = document.createElement('span');
      title.textContent = m;
      head.append(title,
        btn('Aggiungi un esame a ' + m, 'plus', () => addEsame(m)),
        btn('Rinomina ' + m, 'pencil', () => renameMetodica(m)),
        btn('Elimina ' + m, 'trash-2', () => deleteMetodica(m)));
      box.appendChild(head);
      exams.forEach((e) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lib-tree__item';
        b.textContent = e;
        const count = Object.values(D().refertoByEsame[e] || {}).flat().length;
        const badge = document.createElement('span');
        badge.className = 'subtle';
        badge.textContent = count;
        badge.setAttribute('aria-label', count + ' frasi');
        b.appendChild(badge);
        b.setAttribute('aria-current', selected && selected.esame === e ? 'true' : 'false');
        b.onclick = () => { selected = { metodica: m, esame: e }; render(); };
        box.appendChild(b);
      });
      list.appendChild(box);
    });
  }

  function renderDetail(container) {
    container.innerHTML = '';
    if (!selected || !examExists(selected.esame)) {
      selected = null;
      container.innerHTML = '<div class="empty">Scegli un esame a sinistra per modificarne indicazioni e frasi.</div>';
      return;
    }
    const d = D();
    const { esame } = selected;

    const head = document.createElement('div');
    head.className = 'lib-detail__head';
    const h = document.createElement('h3');
    h.textContent = esame;
    head.append(h,
      btn('Sposta su', 'arrow-up', () => moveEsame(-1)),
      btn('Sposta giù', 'arrow-down', () => moveEsame(1)),
      btn('Rinomina esame', 'pencil', renameEsame),
      btn('Elimina esame', 'trash-2', deleteEsame));
    container.appendChild(head);

    // Indicazioni
    const ind = (d.indicazioniByEsame[esame] = d.indicazioniByEsame[esame] || []);
    const indSec = document.createElement('section');
    indSec.className = 'lib-section';
    indSec.innerHTML = '<h4>Indicazioni</h4>';
    ind.forEach((txt, i) => {
      const row = document.createElement('div');
      row.className = 'lib-row';
      const input = document.createElement('input');
      input.className = 'input';
      input.value = txt;
      input.setAttribute('aria-label', 'Indicazione ' + (i + 1));
      input.oninput = () => { ind[i] = input.value; onChange(); };
      input.onchange = () => {
        if (!input.value.trim()) removeWithUndo(ind, i, 'Indicazione', [tomb.ind(esame, txt)]);
        else if (input.value !== txt) markRemoved([tomb.ind(esame, txt)]); // indicazione predefinita riscritta
      };
      row.append(input,
        btn('Sposta su', 'arrow-up', () => { move(ind, i, -1); changed(); }),
        btn('Sposta giù', 'arrow-down', () => { move(ind, i, 1); changed(); }),
        btn('Elimina indicazione', 'trash-2', () => removeWithUndo(ind, i, 'Indicazione', [tomb.ind(esame, txt)])));
      indSec.appendChild(row);
    });
    indSec.appendChild(btn('Aggiungi indicazione', 'plus', () => { ind.push(''); changed(); setTimeout(() => { const inputs = indSec.querySelectorAll('input'); if (inputs.length) inputs[inputs.length - 1].focus(); }, 0); }, { cls: 'btn btn--sm' }));
    container.appendChild(indSec);

    // Gruppi di frasi: prima l'ordine delle sezioni, poi le frasi di ciascuna
    const groups = (d.refertoByEsame[esame] = d.refertoByEsame[esame] || {});
    const keys = Object.keys(groups);
    renderGroupOrder(container, esame, keys);
    keys.forEach((g) => {
      const sec = document.createElement('section');
      sec.className = 'lib-section';
      sec.dataset.groupSection = g;
      const gh = document.createElement('div');
      gh.className = 'lib-section__head';
      const title = document.createElement('h4');
      title.textContent = g;
      gh.append(title,
        btn('Rinomina il gruppo', 'pencil', () => renameGroup(g)),
        btn('Elimina il gruppo', 'trash-2', () => deleteGroup(g)));
      sec.appendChild(gh);
      const phrases = groups[g];
      phrases.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'lib-phrase' + (p.neg ? ' lib-phrase--abnormal' : '') + (p.opz ? ' lib-phrase--optional' : '');
        const label = document.createElement('input');
        label.className = 'input';
        label.value = p.label;
        label.setAttribute('aria-label', 'Etichetta del pulsante');
        label.placeholder = 'Etichetta del pulsante';
        label.oninput = () => { p.label = label.value; onChange(); };
        const kind = document.createElement('select');
        kind.className = 'input';
        kind.setAttribute('aria-label', 'Tipo di frase');
        kind.innerHTML = '<option value="normale">Normale</option>'
          + '<option value="patologico">Patologica (sostituisce la normale)</option>'
          + '<option value="aggiuntiva">Aggiuntiva (fuori dal referto negativo predefinito)</option>'
          + '<option value="aggiuntiva-patologica">Aggiuntiva patologica</option>';
        kind.value = (p.opz ? 'aggiuntiva' : '') + (p.opz && p.neg ? '-patologica' : '') || (p.neg ? 'patologico' : 'normale');
        kind.onchange = () => {
          p.neg = kind.value === 'patologico' || kind.value === 'aggiuntiva-patologica';
          if (kind.value.startsWith('aggiuntiva')) p.opz = true; else delete p.opz;
          card.classList.toggle('lib-phrase--abnormal', p.neg);
          card.classList.toggle('lib-phrase--optional', !!p.opz);
          onChange();
        };
        const text = document.createElement('textarea');
        text.className = 'input';
        text.rows = 2;
        text.value = p.text;
        text.placeholder = 'Testo inserito nel referto. Campi da compilare: [___ mm], [destro/sinistro]';
        text.setAttribute('aria-label', 'Testo inserito nel referto');
        text.oninput = () => { p.text = text.value; onChange(); };
        const top = document.createElement('div');
        top.className = 'lib-phrase__top';
        top.append(label, kind,
          btn('Sposta su', 'arrow-up', () => { move(phrases, i, -1); changed(); }),
          btn('Sposta giù', 'arrow-down', () => { move(phrases, i, 1); changed(); }),
          btn('Elimina frase', 'trash-2', () => removeWithUndo(phrases, i, 'Frase', isBaseId(p.id) ? [p.id] : [])));
        card.append(top, text);
        sec.appendChild(card);
      });
      sec.appendChild(btn('Aggiungi frase', 'plus', () => { phrases.push(newPhrase()); changed(); }, { cls: 'btn btn--sm' }));
      container.appendChild(sec);
    });
    container.appendChild(btn('Aggiungi gruppo / distretto', 'plus', addGroup, { cls: 'btn btn--sm' }));
  }

  function render() {
    root.innerHTML = '';
    root.className = 'lib-editor';
    const tree = document.createElement('div');
    tree.className = 'lib-tree';
    const detail = document.createElement('div');
    detail.className = 'lib-detail';
    root.append(tree, detail);
    renderTree(tree);
    renderDetail(detail);
    if (focusGroup) {
      const item = root.querySelector('.order-item[data-name="' + CSS.escape(focusGroup) + '"]');
      focusGroup = null;
      if (item) item.focus();
    }
  }

  return { render, select(metodica, esame) { selected = { metodica, esame }; render(); } };
}

// Frasi del punto 04 "Confronto con precedenti" (uguali per tutti gli esami): etichetta del pulsante e testo.
// Si modificano nella libreria corrente (personale o del team); senza modifiche valgono i predefiniti.
export function renderConfronti(root, { getData, onChange, defaults }) {
  const D = () => getData();
  const list = () => {
    if (!Array.isArray(D().confronti)) D().confronti = defaults.map((c) => ({ ...c }));
    return D().confronti;
  };
  const changed = () => { onChange(); draw(); };
  function draw() {
    root.innerHTML = '';
    const items = Array.isArray(D().confronti) ? D().confronti : defaults;
    items.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'lib-phrase';
      const label = document.createElement('input');
      label.className = 'input';
      label.value = c.label;
      label.maxLength = 40;
      label.placeholder = 'Etichetta del pulsante';
      label.setAttribute('aria-label', 'Etichetta del pulsante ' + (i + 1));
      label.oninput = () => { list()[i].label = label.value; onChange(); };
      const text = document.createElement('textarea');
      text.className = 'input';
      text.rows = 2;
      text.value = c.text;
      text.placeholder = 'Testo inserito nel referto. Campi da compilare: [data], [___]';
      text.setAttribute('aria-label', 'Testo inserito nel referto ' + (i + 1));
      text.oninput = () => { list()[i].text = text.value; onChange(); };
      const top = document.createElement('div');
      top.className = 'lib-phrase__top';
      top.append(label,
        btn('Sposta su', 'arrow-up', () => { move(list(), i, -1); changed(); }),
        btn('Sposta giù', 'arrow-down', () => { move(list(), i, 1); changed(); }),
        btn('Elimina il pulsante', 'trash-2', () => { list().splice(i, 1); changed(); }));
      card.append(top, text);
      root.appendChild(card);
    });
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'subtle';
      empty.textContent = 'Nessun pulsante: il punto 04 nell\'editor resterà vuoto.';
      root.appendChild(empty);
    }
    const actions = document.createElement('div');
    actions.className = 'row';
    actions.append(
      btn('Aggiungi pulsante', 'plus', () => {
        if (list().length >= 20) { toast('Massimo 20 pulsanti.'); return; }
        list().push({ id: newPhraseId(), label: 'Nuovo', text: '' });
        changed();
        setTimeout(() => { const inputs = root.querySelectorAll('textarea'); if (inputs.length) inputs[inputs.length - 1].focus(); }, 0);
      }, { cls: 'btn btn--sm' }),
      btn('Ripristina i predefiniti', 'rotate-ccw', async () => {
        if (!await confirmDialog('Ripristinare i pulsanti predefiniti del confronto?', 'Confronto, Presa visione e Non precedenti, con i testi originali.', { okText: 'Ripristina' })) return;
        delete D().confronti;
        changed();
      }, { cls: 'btn btn--sm btn--ghost' }));
    root.appendChild(actions);
  }
  draw();
  return { render: draw };
}
