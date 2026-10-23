// Account → Turni (issue #4): calendario mensile dei propri turni, condivisione con i team,
// file .ics e link per Google Calendar (funzione del server turni-ics).
import { $, icon } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { confirmDialog } from '../lib/dialog.js';
import { buildIcs } from '../lib/ics.js';
import {
  mergeTipi, colorFor, shiftTimes, monthGrid, shiftsByDay, repeatWeekly, copyWeek, weekStart, addDays,
  dayKey, timeOf, formatRange,
} from '../lib/shifts.js';

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const COLS = 'id, starts_at, ends_at, tipo, sede, note, colore, updated_at';

export function initTurni({ sb, user, local = false }) {
  let view = new Date();
  view = new Date(view.getFullYear(), view.getMonth(), 1);
  let shifts = [];
  let tipi = mergeTipi();
  let sedi = [];
  let teams = [];
  let editing = null; // turno in modifica (null = nuovo)
  let loaded = false;

  const msg = (id, text, ok) => { const el = $(id); el.textContent = text || ''; el.className = 'msg' + (text ? (ok ? ' msg--ok' : ' msg--error') : ''); };

  // ---------- Dati ----------
  async function loadTeams() {
    if (local) return;
    const { data: rows } = await sb.from('team_members').select('team_id, stato').eq('user_id', user.id);
    const ids = (rows || []).filter((r) => (r.stato || 'attivo') === 'attivo').map((r) => r.team_id);
    if (!ids.length) { teams = []; return; }
    const { data } = await sb.from('teams').select('id, nome, turni_config').in('id', ids);
    teams = (data || []).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    const cfgs = teams.map((t) => (t.turni_config && t.turni_config.tipi) || []);
    tipi = mergeTipi(...cfgs);
    sedi = [...new Set(teams.flatMap((t) => (t.turni_config && t.turni_config.sedi) || []))];
  }

  async function loadShifts() {
    const weeks = monthGrid(view.getFullYear(), view.getMonth());
    const from = weeks[0][0];
    const to = addDays(weeks[weeks.length - 1][6], 1);
    const { data, error } = await sb.from('shifts').select(COLS)
      .gte('ends_at', from.toISOString()).lt('starts_at', to.toISOString()).order('starts_at', { ascending: true });
    if (error) { msg('cal-message', 'Turni non caricati: ' + error.message); shifts = []; return; }
    msg('cal-message', '');
    shifts = data || [];
  }

  // ---------- Calendario ----------
  function render() {
    $('cal-title').textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
    const grid = $('cal-grid');
    grid.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'cal__row cal__row--head';
    head.setAttribute('role', 'row');
    head.appendChild(document.createElement('span'));
    WEEKDAYS.forEach((w) => { const c = document.createElement('span'); c.setAttribute('role', 'columnheader'); c.textContent = w; head.appendChild(c); });
    grid.appendChild(head);
    const byDay = shiftsByDay(shifts);
    const today = dayKey(new Date());
    for (const week of monthGrid(view.getFullYear(), view.getMonth())) {
      const row = document.createElement('div');
      row.className = 'cal__row';
      row.setAttribute('role', 'row');
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'cal__copy';
      copy.title = 'Copia i turni di questa settimana nella successiva';
      copy.setAttribute('aria-label', 'Copia i turni della settimana dal ' + week[0].getDate() + ' ' + MONTHS[week[0].getMonth()] + ' nella successiva');
      copy.appendChild(icon('copy'));
      copy.onclick = () => copyWeekFrom(week[0]);
      row.appendChild(copy);
      for (const d of week) {
        const key = dayKey(d);
        const cell = document.createElement('div');
        cell.className = 'cal__day' + (d.getMonth() !== view.getMonth() ? ' is-out' : '') + (key === today ? ' is-today' : '');
        cell.setAttribute('role', 'gridcell');
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'cal__date';
        add.textContent = d.getDate();
        add.setAttribute('aria-label', 'Aggiungi un turno il ' + d.getDate() + ' ' + MONTHS[d.getMonth()]);
        add.onclick = () => openDialog(null, key);
        cell.appendChild(add);
        for (const s of byDay.get(key) || []) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'shift-chip';
          chip.style.setProperty('--c', s.colore || colorFor(s.tipo, tipi));
          chip.title = s.tipo + ' ' + formatRange(s) + (s.sede ? ' · ' + s.sede : '') + (s.note ? '\n' + s.note : '');
          const name = document.createElement('span');
          name.className = 'shift-chip__name';
          name.textContent = s.tipo;
          const time = document.createElement('span');
          time.className = 'shift-chip__time';
          time.textContent = formatRange(s) === 'tutto il giorno' ? '' : timeOf(new Date(s.starts_at));
          chip.append(name, time);
          chip.onclick = (e) => { e.stopPropagation(); openDialog(s); };
          cell.appendChild(chip);
        }
        cell.onclick = (e) => { if (e.target === cell) openDialog(null, key); };
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
  }

  async function refresh() {
    await loadShifts();
    render();
  }

  // ---------- Inserimento e modifica ----------
  function fillLists() {
    $('shift-tipi').innerHTML = '';
    tipi.forEach((t) => { const o = document.createElement('option'); o.value = t.nome; $('shift-tipi').appendChild(o); });
    $('shift-sedi').innerHTML = '';
    sedi.forEach((s) => { const o = document.createElement('option'); o.value = s; $('shift-sedi').appendChild(o); });
  }

  function openDialog(shift, day) {
    editing = shift;
    fillLists();
    $('shift-title').textContent = shift ? 'Modifica turno' : 'Nuovo turno';
    $('shift-error').textContent = '';
    $('shift-delete').hidden = !shift;
    $('shift-repeat-field').hidden = !!shift;
    $('shift-repeat').value = '0';
    if (shift) {
      const a = new Date(shift.starts_at);
      $('shift-day').value = dayKey(a);
      $('shift-tipo').value = shift.tipo;
      $('shift-start').value = timeOf(a);
      $('shift-end').value = timeOf(new Date(shift.ends_at));
      $('shift-sede').value = shift.sede || '';
      $('shift-note').value = shift.note || '';
    } else {
      const t = tipi[0];
      $('shift-day').value = day || dayKey(new Date());
      $('shift-tipo').value = t.nome;
      $('shift-start').value = t.inizio;
      $('shift-end').value = t.fine;
      $('shift-sede').value = '';
      $('shift-note').value = '';
    }
    $('shift-dialog').showModal();
    $('shift-tipo').focus();
  }

  $('shift-tipo').addEventListener('change', () => {
    const t = tipi.find((x) => x.nome.toLowerCase() === $('shift-tipo').value.trim().toLowerCase());
    if (t && !editing) { $('shift-start').value = t.inizio; $('shift-end').value = t.fine; }
  });
  $('shift-cancel').onclick = () => $('shift-dialog').close();

  $('shift-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = $('shift-tipo').value.trim();
    if (!$('shift-day').value || !tipo) { $('shift-error').textContent = 'Indica giorno e tipo di turno.'; return; }
    let times;
    try { times = shiftTimes($('shift-day').value, $('shift-start').value, $('shift-end').value); } catch (err) {
      $('shift-error').textContent = 'Indica orari validi.';
      return;
    }
    const row = { ...times, tipo, sede: $('shift-sede').value.trim() || null, note: $('shift-note').value.trim() || null, colore: colorFor(tipo, tipi) };
    $('shift-save').disabled = true;
    let error;
    if (editing) {
      ({ error } = await sb.from('shifts').update(row).eq('id', editing.id));
    } else {
      const all = [row, ...repeatWeekly(row, Number($('shift-repeat').value))].map((r) => ({ ...r, user_id: user.id }));
      ({ error } = await sb.from('shifts').insert(all));
    }
    $('shift-save').disabled = false;
    if (error) { $('shift-error').textContent = 'Non salvato: ' + error.message; return; }
    $('shift-dialog').close();
    await refresh();
  });

  $('shift-delete').onclick = async () => {
    if (!editing || !await confirmDialog('Eliminare questo turno?', editing.tipo + ' · ' + formatRange(editing), { okText: 'Elimina', danger: true })) return;
    const { error } = await sb.from('shifts').delete().eq('id', editing.id);
    if (error) { $('shift-error').textContent = 'Non eliminato: ' + error.message; return; }
    $('shift-dialog').close();
    await refresh();
  };

  async function copyWeekFrom(monday) {
    const start = weekStart(monday);
    const { data: week } = await sb.from('shifts').select(COLS)
      .gte('starts_at', start.toISOString()).lt('starts_at', addDays(start, 7).toISOString());
    const copies = copyWeek(week || [], start);
    if (!copies.length) { toast('Nessun turno in questa settimana.'); return; }
    const next = addDays(start, 7);
    const { data: existing } = await sb.from('shifts').select('starts_at, tipo')
      .gte('starts_at', next.toISOString()).lt('starts_at', addDays(next, 7).toISOString());
    const has = new Set((existing || []).map((s) => new Date(s.starts_at).getTime() + '|' + s.tipo));
    const rows = copies.filter((s) => !has.has(new Date(s.starts_at).getTime() + '|' + s.tipo))
      .map(({ starts_at, ends_at, tipo, sede, note, colore }) => ({ user_id: user.id, starts_at, ends_at, tipo, sede, note, colore }));
    if (!rows.length) { toast('La settimana successiva ha già questi turni.'); return; }
    const label = start.getDate() + ' ' + MONTHS[start.getMonth()];
    if (!await confirmDialog('Copiare ' + rows.length + (rows.length === 1 ? ' turno' : ' turni') + '?', 'I turni della settimana dal ' + label + ' vengono copiati nella settimana successiva, con gli stessi orari.', { okText: 'Copia' })) return;
    const { error } = await sb.from('shifts').insert(rows);
    if (error) { toast('Non copiati: ' + error.message, { type: 'error' }); return; }
    toast(rows.length + (rows.length === 1 ? ' turno copiato' : ' turni copiati') + ' nella settimana successiva');
    await refresh();
  }

  $('cal-prev').onclick = () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); refresh(); };
  $('cal-next').onclick = () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); refresh(); };
  $('cal-today').onclick = () => { const n = new Date(); view = new Date(n.getFullYear(), n.getMonth(), 1); refresh(); };
  $('cal-add').onclick = () => openDialog(null);

  // ---------- Condivisione con i team ----------
  async function renderShares() {
    const box = $('share-list');
    box.innerHTML = '';
    if (!teams.length) {
      box.innerHTML = '<p class="subtle">Non fai parte di nessun team. <a href="team.html">Crea un team o entra con un invito</a>.</p>';
      return;
    }
    const { data } = await sb.from('shift_shares').select('team_id, dettaglio').eq('user_id', user.id);
    const shares = new Map((data || []).map((r) => [r.team_id, r.dettaglio]));
    for (const t of teams) {
      const row = document.createElement('div');
      row.className = 'share-row';
      const label = document.createElement('label');
      label.className = 'check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = shares.has(t.id);
      const name = document.createElement('span');
      name.textContent = t.nome;
      label.append(cb, name);
      const sel = document.createElement('select');
      sel.className = 'input';
      sel.setAttribute('aria-label', 'Cosa vede il team ' + t.nome);
      sel.innerHTML = '<option value="completo">Completo</option><option value="occupato">Solo di turno</option>';
      sel.value = shares.get(t.id) || 'completo';
      sel.disabled = !cb.checked;
      cb.onchange = async () => {
        const { error } = cb.checked
          ? await sb.from('shift_shares').insert({ user_id: user.id, team_id: t.id, dettaglio: sel.value })
          : await sb.from('shift_shares').delete().eq('user_id', user.id).eq('team_id', t.id);
        if (error) { cb.checked = !cb.checked; toast('Non salvato: ' + error.message, { type: 'error' }); return; }
        sel.disabled = !cb.checked;
        toast(cb.checked ? 'Turni condivisi con ' + t.nome : 'Turni non più condivisi con ' + t.nome);
      };
      sel.onchange = async () => {
        const { error } = await sb.from('shift_shares').update({ dettaglio: sel.value }).eq('user_id', user.id).eq('team_id', t.id);
        if (error) toast('Non salvato: ' + error.message, { type: 'error' });
      };
      row.append(label, sel);
      box.appendChild(row);
    }
  }

  // ---------- .ics e link per Google ----------
  $('ics-download').onclick = async () => {
    const from = addDays(new Date(), -90);
    const { data, error } = await sb.from('shifts').select(COLS).gte('ends_at', from.toISOString()).order('starts_at', { ascending: true });
    if (error) { msg('feed-message', 'Turni non caricati: ' + error.message); return; }
    if (!data || !data.length) { msg('feed-message', 'Non ci sono turni da esportare.'); return; }
    const url = URL.createObjectURL(new Blob([buildIcs(data)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'turni-modreport.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    msg('feed-message', data.length + (data.length === 1 ? ' turno esportato.' : ' turni esportati.'), true);
  };

  const feedUrl = (token) => window.MR_CONFIG.SUPABASE_URL + '/functions/v1/turni-ics?token=' + token;

  async function renderFeed(newToken) {
    const box = $('feed-box');
    box.innerHTML = '';
    if (local) return;
    const { data: feed } = await sb.from('calendar_feeds').select('created_at').eq('user_id', user.id).maybeSingle();
    const intro = document.createElement('p');
    intro.className = 'muted';
    intro.textContent = 'Oppure collega i turni a Google Calendar: copia il tuo link personale e in Google Calendar scegli "Altri calendari" → "+" → "Da URL". Google lo aggiorna da solo, di solito entro qualche ora. Il link è segreto: chi lo ha vede i tuoi turni.';
    box.appendChild(intro);
    if (newToken) {
      const link = document.createElement('div');
      link.className = 'invite-link';
      link.id = 'feed-link';
      link.textContent = feedUrl(newToken);
      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn btn--sm';
      copyBtn.append(icon('copy'), 'Copia il link');
      copyBtn.onclick = async () => {
        try { await navigator.clipboard.writeText(feedUrl(newToken)); toast('Link copiato'); } catch (e) { toast('Copia non riuscita: seleziona il link e copialo a mano.', { type: 'error' }); }
      };
      const note = document.createElement('p');
      note.className = 'subtle';
      note.textContent = 'Il link si vede solo adesso: copialo. Se lo perdi, generane uno nuovo (il vecchio smette di funzionare).';
      box.append(link, copyBtn, note);
    }
    const actions = document.createElement('div');
    actions.className = 'row';
    if (feed) {
      const since = document.createElement('span');
      since.className = 'subtle';
      since.textContent = 'Link attivo dal ' + new Date(feed.created_at).toLocaleDateString('it-IT') + '.';
      const regen = document.createElement('button');
      regen.className = 'btn btn--sm';
      regen.append(icon('refresh-cw'), 'Genera un nuovo link');
      regen.onclick = () => createFeed(true);
      const off = document.createElement('button');
      off.className = 'btn btn--sm btn--danger';
      off.textContent = 'Disattiva il link';
      off.onclick = async () => {
        if (!await confirmDialog('Disattivare il link?', 'Il calendario collegato a Google smette di aggiornarsi.', { okText: 'Disattiva', danger: true })) return;
        const { error } = await sb.rpc('delete_calendar_feed');
        if (error) { msg('feed-message', error.message); return; }
        msg('feed-message', 'Link disattivato.', true);
        renderFeed();
      };
      actions.append(since, regen, off);
    } else {
      const create = document.createElement('button');
      create.className = 'btn btn--primary btn--sm';
      create.id = 'feed-create';
      create.append(icon('link'), 'Crea il link per Google Calendar');
      create.onclick = () => createFeed(false);
      actions.append(create);
    }
    box.appendChild(actions);
  }

  async function createFeed(replace) {
    if (replace && !await confirmDialog('Generare un nuovo link?', 'Il link attuale smette di funzionare: dovrai aggiornarlo in Google Calendar.', { okText: 'Genera' })) return;
    const { data, error } = await sb.rpc('create_calendar_feed');
    if (error) { msg('feed-message', error.message); return; }
    msg('feed-message', '');
    renderFeed(data);
  }

  return {
    async show() {
      if (!loaded) {
        loaded = true;
        if (local) { $('share-card').hidden = true; }
        await loadTeams();
        if (!local) { renderShares(); renderFeed(); }
      }
      await refresh();
    },
  };
}
