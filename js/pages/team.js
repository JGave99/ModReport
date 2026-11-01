// Team (team.html): team per organizzazione, canali, chat in tempo reale, inviti e membri.
// I permessi veri sono sul server (RLS + funzioni): qui si mostrano solo le azioni consentite.
import { getSupabase, pageUrl } from '../lib/supabase.js';
import { $, icon } from '../lib/dom.js';
import { requireSession } from '../lib/session.js';
import { confirmDialog, promptDialog, alertDialog } from '../lib/dialog.js';
import { isLocalMode } from '../lib/local-backend.js';
import { toast } from '../lib/toast.js';
import { QUALIFICHE, colorFor as shiftColor, mergeTipi, weekStart, addDays, dayKey, formatRange } from '../lib/shifts.js';

const sb = getSupabase();
const ROLE_LABEL = { owner: 'Proprietario', admin: 'Amministratore', member: 'Membro' };
const AVATAR_COLORS = ['#0369a1', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#4d7c0f', '#1d4ed8', '#a21caf'];

let me = null;
let memberships = [];         // team attivi: [{ team_id, role, nome, qualifica, team_nome, team }]
let pendingTeams = [];        // richieste in attesa di approvazione: [{ team_id, team_nome }]
let currentTeam = null;       // membership corrente
let channels = [];
let currentChannelId = null;
let selectToken = 0;
const lastMessageAt = {};     // channel_id -> ISO
const lastReadAt = {};        // channel_id -> ISO
const renderedIds = new Set();
let realtime = null;
let readTimer = null;

const isAdmin = () => currentTeam && ['owner', 'admin'].includes(currentTeam.role);

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => (w[0] || '').toUpperCase()).join('') || '?';
}
function colorFor(id) {
  let h = 0;
  for (const ch of String(id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
function setFormMsg(id, text, ok) {
  const el = $(id);
  el.textContent = text || '';
  el.classList.toggle('ok', !!ok);
}

// ============================================================
// TEAM: elenco, scelta, creazione, ingresso con codice
// ============================================================
async function loadMemberships() {
  const { data: rows, error } = await sb.from('team_members').select('team_id, role, nome, stato, qualifica').eq('user_id', me.id);
  if (error) throw error;
  const ids = (rows || []).map((r) => r.team_id);
  let teams = [];
  if (ids.length) {
    const res = await sb.from('teams').select('id, nome, tipo, sede, richiede_approvazione, turni_config').in('id', ids);
    if (res.error) throw res.error;
    teams = res.data || [];
  }
  const all = (rows || []).map((r) => {
    const team = teams.find((t) => t.id === r.team_id) || {};
    return { ...r, team, team_nome: team.nome || 'Team' };
  }).sort((a, b) => a.team_nome.localeCompare(b.team_nome, 'it'));
  memberships = all.filter((m) => (m.stato || 'attivo') === 'attivo');
  pendingTeams = all.filter((m) => m.stato === 'in_attesa');
}

// Richieste di ingresso in attesa di approvazione (si possono ritirare).
function renderPendingBox() {
  const box = $('pending-box');
  box.innerHTML = '';
  box.hidden = !pendingTeams.length;
  if (!pendingTeams.length) return;
  const title = document.createElement('p');
  title.className = 'field__label';
  title.textContent = 'In attesa di approvazione';
  box.appendChild(title);
  pendingTeams.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    const name = document.createElement('div');
    name.className = 'grow';
    name.textContent = p.team_nome + ' — un amministratore deve accettare la richiesta';
    const btn = document.createElement('button');
    btn.className = 'btn btn--sm';
    btn.textContent = 'Ritira';
    btn.onclick = async () => {
      const { error } = await sb.rpc('leave_team', { p_team: p.team_id });
      if (error) { setFormMsg('join-msg', error.message); return; }
      await loadMemberships();
      renderPendingBox();
    };
    row.append(name, btn);
    box.appendChild(row);
  });
}

function renderTeamSelect() {
  const sel = $('team-select');
  sel.innerHTML = '';
  memberships.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.team_id;
    opt.textContent = m.team_nome;
    sel.appendChild(opt);
  });
  if (currentTeam) sel.value = currentTeam.team_id;
}

function showSetup({ title = 'Team', text, code = '' } = {}) {
  $('gate').hidden = true;
  $('page-root').hidden = true;
  $('setup-gate').hidden = false;
  $('setup-title').textContent = title;
  $('setup-text').textContent = text || 'Non fai ancora parte di nessun team. Creane uno per il tuo studio o reparto, oppure entra con un codice di invito.';
  $('join-code-input').value = code;
  $('btn-setup-back').hidden = memberships.length === 0;
  renderPendingBox();
  setFormMsg('join-msg', '');
  setFormMsg('create-msg', '');
}

async function openTeam(teamId) {
  currentTeam = memberships.find((m) => m.team_id === teamId) || memberships[0];
  try { localStorage.setItem('mr-team', currentTeam.team_id); } catch (e) { /* ignora */ }
  $('setup-gate').hidden = true;
  $('gate').hidden = true;
  $('page-root').hidden = false;
  renderTeamSelect();
  $('btn-invite').hidden = !isAdmin();
  $('btn-settings').hidden = !isAdmin();
  $('btn-new-channel').hidden = !isAdmin();
  currentChannelId = null;
  await loadChannels();
  await loadMembersMini();
  if (!$('turni-view').hidden) renderTurni();
}

$('team-select').onchange = (e) => openTeam(e.target.value);
$('btn-other-team').onclick = () => showSetup({ title: 'Altro team', text: 'Entra in un altro team con un codice di invito, oppure creane uno nuovo.' });
$('btn-setup-back').onclick = () => openTeam(currentTeam ? currentTeam.team_id : memberships[0].team_id);

$('join-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = $('join-code-input').value.trim();
  if (!code) return;
  $('btn-join-code').disabled = true;
  const { data, error } = await sb.rpc('join_team_with_code', { invite_code: code });
  $('btn-join-code').disabled = false;
  if (error) { setFormMsg('join-msg', 'Errore: ' + error.message); return; }
  if (data === 'invalid') { setFormMsg('join-msg', 'Codice non valido o revocato. Chiedi un nuovo invito.'); return; }
  if (data === 'expired') { setFormMsg('join-msg', 'Invito scaduto o già usato da tutti i posti disponibili. Chiedi un nuovo invito.'); return; }
  history.replaceState(null, '', window.location.pathname);
  await loadMemberships();
  if (data === 'pending') {
    $('join-code-input').value = '';
    renderPendingBox();
    setFormMsg('join-msg', 'Richiesta inviata: entrerai nel team quando un amministratore la accetta.', true);
    return;
  }
  await openTeam(data);
});

$('create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = $('create-team-name').value.trim();
  if (!nome) { setFormMsg('create-msg', 'Scrivi il nome del team.'); return; }
  $('btn-create-team').disabled = true;
  const { data, error } = await sb.rpc('create_team', { p_nome: nome, p_tipo: $('create-team-tipo').value, p_sede: $('create-team-sede').value.trim() });
  $('btn-create-team').disabled = false;
  if (error) { setFormMsg('create-msg', error.message); return; }
  $('create-team-name').value = '';
  $('create-team-sede').value = '';
  await loadMemberships();
  await openTeam(data);
});

// ============================================================
// CANALI E NON LETTI
// ============================================================
async function loadChannels() {
  const { data, error } = await sb.from('channels').select('id, nome, created_at, solo_admin').eq('team_id', currentTeam.team_id).order('created_at', { ascending: true });
  if (error) {
    $('channel-list').innerHTML = '<div style="padding:8px; font-size:12px; color:var(--ink-soft);">Errore nel caricamento dei canali.</div>';
    return;
  }
  // Il canale Avvisi in cima.
  channels = (data || []).sort((a, b) => (b.solo_admin ? 1 : 0) - (a.solo_admin ? 1 : 0));
  const [last, reads] = await Promise.all([
    sb.rpc('my_channels_last_message'),
    sb.from('channel_reads').select('channel_id, last_read_at').eq('user_id', me.id),
  ]);
  (last.data || []).forEach((r) => { lastMessageAt[r.channel_id] = r.last_at; });
  (reads.data || []).forEach((r) => { lastReadAt[r.channel_id] = r.last_read_at; });
  renderChannelList();
  if (channels.length) {
    selectChannel(channels[0].id);
  } else {
    $('messages-wrap').innerHTML = '<div class="empty-chat">Nessun canale ancora. Creane uno con il "+".</div>';
    $('chat-head').innerHTML = '<span class="empty-chat">Nessun canale</span>';
    $('composer').hidden = true;
  }
}

const hasUnread = (ch) => {
  const last = lastMessageAt[ch.id];
  if (!last || ch.id === currentChannelId) return false;
  const read = lastReadAt[ch.id];
  return !read || new Date(last) > new Date(read);
};

function renderChannelList() {
  const list = $('channel-list');
  list.innerHTML = '';
  channels.forEach((ch) => {
    const row = document.createElement('div');
    row.className = 'channel-row';
    const b = document.createElement('button');
    b.className = 'channel-item';
    b.setAttribute('aria-current', ch.id === currentChannelId ? 'true' : 'false');
    const hash = ch.solo_admin ? icon('megaphone') : document.createElement('span');
    if (!ch.solo_admin) { hash.textContent = '#'; hash.style.opacity = '.6'; } else hash.setAttribute('aria-label', 'Avvisi');
    const name = document.createElement('span'); name.className = 'chname'; name.textContent = ch.nome;
    b.append(hash, name);
    if (ch.solo_admin) b.title = 'Avvisi: scrivono solo proprietario e amministratori';
    if (hasUnread(ch)) {
      const dot = document.createElement('span'); dot.className = 'unread-dot'; dot.title = 'Messaggi non letti';
      b.appendChild(dot);
    }
    b.onclick = () => selectChannel(ch.id);
    row.appendChild(b);
    if (isAdmin()) {
      const actions = document.createElement('span');
      actions.className = 'row-actions';
      const ren = document.createElement('button'); ren.appendChild(icon('pencil')); ren.title = 'Rinomina'; ren.setAttribute('aria-label', 'Rinomina il canale ' + ch.nome);
      const del = document.createElement('button'); del.appendChild(icon('trash-2')); del.title = 'Elimina'; del.setAttribute('aria-label', 'Elimina il canale ' + ch.nome);
      ren.onclick = () => renameChannel(ch);
      del.onclick = () => deleteChannel(ch);
      actions.append(ren, del);
      row.appendChild(actions);
    }
    list.appendChild(row);
  });
}

$('btn-new-channel').onclick = async () => {
  const nome = await promptDialog('Nuovo canale', { label: 'Nome del canale', okText: 'Crea', validate: (v) => (v.trim() && v.trim().length <= 60 ? null : 'Da 1 a 60 caratteri.') });
  if (nome === null) return;
  const { error } = await sb.from('channels').insert({ nome: nome.trim(), team_id: currentTeam.team_id, created_by: me.id });
  if (error) { await alertDialog('Canale non creato', error.message); return; }
  await loadChannels();
};

async function renameChannel(ch) {
  const nome = await promptDialog('Rinomina canale', { label: 'Nuovo nome', value: ch.nome, okText: 'Salva', validate: (v) => (v.trim() && v.trim().length <= 60 ? null : 'Da 1 a 60 caratteri.') });
  if (nome === null || nome.trim() === ch.nome) return;
  const { error } = await sb.from('channels').update({ nome: nome.trim() }).eq('id', ch.id);
  if (error) { await alertDialog('Canale non rinominato', error.message); return; }
  await loadChannels();
}

async function deleteChannel(ch) {
  if (!await confirmDialog('Eliminare il canale #' + ch.nome + '?', 'Verranno eliminati anche tutti i suoi messaggi, in modo permanente.', { okText: 'Elimina', danger: true })) return;
  const { error } = await sb.from('channels').delete().eq('id', ch.id);
  if (error) { await alertDialog('Canale non eliminato', error.message); return; }
  if (ch.id === currentChannelId) currentChannelId = null;
  await loadChannels();
}

// ============================================================
// MESSAGGI
// ============================================================
async function selectChannel(channelId) {
  const token = ++selectToken;
  currentChannelId = channelId;
  renderedIds.clear();
  renderChannelList();
  const ch = channels.find((c) => c.id === channelId);
  $('chat-head').innerHTML = '';
  const hash = ch && ch.solo_admin ? icon('megaphone') : document.createElement('span');
  if (!(ch && ch.solo_admin)) { hash.className = 'hash'; hash.textContent = '#'; }
  const name = document.createElement('span'); name.textContent = ch ? ch.nome : '';
  $('chat-head').append(hash, name);
  const readOnly = !!(ch && ch.solo_admin && !isAdmin());
  $('composer').hidden = readOnly;
  $('composer-note').hidden = !(ch && ch.solo_admin);
  $('send-error').hidden = true;
  const wrap = $('messages-wrap');
  wrap.innerHTML = '<div class="empty-chat">Caricamento…</div>';

  // Gli ultimi 200 messaggi (dal più recente), poi in ordine cronologico.
  const { data, error } = await sb.from('messages')
    .select('id, user_id, nome_mittente, testo, created_at')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (token !== selectToken) return; // nel frattempo è stato scelto un altro canale
  if (error) { wrap.innerHTML = '<div class="empty-chat">Errore nel caricamento dei messaggi.</div>'; return; }
  wrap.innerHTML = '';
  const rows = (data || []).reverse();
  if (!rows.length) wrap.innerHTML = '<div class="empty-chat">Nessun messaggio in questo canale. Scrivi il primo!</div>';
  rows.forEach((m) => appendMessage(m, false));
  wrap.scrollTop = wrap.scrollHeight;
  markRead(channelId);
}

function appendMessage(m, scroll = true) {
  if (renderedIds.has(m.id)) return;
  renderedIds.add(m.id);
  const wrap = $('messages-wrap');
  const empty = wrap.querySelector('.empty-chat');
  if (empty) empty.remove();
  const row = document.createElement('div');
  row.className = 'chat-msg';
  row.dataset.id = m.id;
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.style.background = colorFor(m.user_id);
  avatar.textContent = initials(m.nome_mittente);
  avatar.setAttribute('aria-hidden', 'true');
  const body = document.createElement('div');
  body.className = 'msg-body';
  const head = document.createElement('div');
  head.className = 'msg-head';
  const name = document.createElement('span'); name.className = 'msg-name'; name.textContent = m.nome_mittente || 'Utente';
  const time = document.createElement('span'); time.className = 'msg-time'; time.textContent = formatTime(m.created_at);
  head.append(name, time);
  if (m.user_id === me.id || isAdmin()) {
    const del = document.createElement('button');
    del.className = 'msg-delete';
    del.textContent = 'Elimina';
    del.setAttribute('aria-label', 'Elimina il messaggio');
    del.onclick = async () => {
      if (!await confirmDialog('Eliminare il messaggio?', 'Il messaggio sarà rimosso per tutti i membri del canale.', { okText: 'Elimina', danger: true })) return;
      const { error } = await sb.from('messages').delete().eq('id', m.id);
      if (error) { await alertDialog('Messaggio non eliminato', error.message); return; }
      row.remove();
    };
    head.appendChild(del);
  }
  const text = document.createElement('div'); text.className = 'msg-text'; text.textContent = m.testo;
  body.append(head, text);
  row.append(avatar, body);
  wrap.appendChild(row);
  if (scroll) wrap.scrollTop = wrap.scrollHeight;
}

function markRead(channelId) {
  lastReadAt[channelId] = new Date().toISOString();
  clearTimeout(readTimer);
  readTimer = setTimeout(() => {
    sb.from('channel_reads').upsert({ user_id: me.id, channel_id: channelId, last_read_at: new Date().toISOString() });
  }, 1500);
}

function startRealtime() {
  if (realtime) sb.removeChannel(realtime);
  // Un solo abbonamento: il server (RLS) consegna solo i messaggi dei canali dei miei team.
  realtime = sb.channel('messages-' + me.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const m = payload.new;
      lastMessageAt[m.channel_id] = m.created_at;
      if (m.channel_id === currentChannelId) {
        appendMessage(m);
        markRead(m.channel_id);
      } else {
        renderChannelList();
      }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
      const id = payload.old && payload.old.id;
      const node = id && document.querySelector('.chat-msg[data-id="' + CSS.escape(id) + '"]');
      if (node) node.remove();
    })
    .subscribe();
}

$('composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('msg-input');
  const testo = input.value.trim();
  if (!testo || !currentChannelId) return;
  const btn = $('btn-send');
  btn.disabled = true;
  $('send-error').hidden = true;
  const { data, error } = await sb.from('messages').insert({ channel_id: currentChannelId, testo }).select('id, user_id, nome_mittente, testo, created_at').maybeSingle();
  btn.disabled = false;
  if (error) {
    // Il testo resta nel campo: niente messaggi persi.
    $('send-error').textContent = 'Messaggio non inviato: ' + error.message;
    $('send-error').hidden = false;
    return;
  }
  input.value = '';
  if (data) appendMessage(data);
  input.focus();
});

$('msg-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('composer').requestSubmit();
  }
});

// ============================================================
// MEMBRI
// ============================================================
// Membri attivi (chi è in attesa di approvazione è a parte).
async function loadMembers({ withPending = false } = {}) {
  const { data, error } = await sb.from('team_members').select('user_id, nome, role, joined_at, stato, qualifica').eq('team_id', currentTeam.team_id).order('joined_at', { ascending: true });
  if (error) throw error;
  return (data || []).filter((m) => withPending || (m.stato || 'attivo') === 'attivo');
}

function qualificaSelect(value, label) {
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', label);
  sel.innerHTML = '<option value="">Qualifica…</option>' + Object.entries(QUALIFICHE).map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('');
  sel.value = value || '';
  return sel;
}

async function renderPendingRequests(all) {
  const box = $('pending-requests');
  box.innerHTML = '';
  const pending = all.filter((m) => m.stato === 'in_attesa');
  if (!isAdmin() || !pending.length) return;
  const title = document.createElement('h3');
  title.className = 'section-title';
  title.textContent = 'Richieste di ingresso (' + pending.length + ')';
  box.appendChild(title);
  pending.forEach((m) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const grow = document.createElement('div');
    grow.className = 'grow';
    grow.textContent = (m.nome || 'Utente') + (m.qualifica ? ' · ' + QUALIFICHE[m.qualifica] : '');
    const yes = document.createElement('button');
    yes.className = 'btn btn--sm btn--primary';
    yes.textContent = 'Accetta';
    const no = document.createElement('button');
    no.className = 'btn btn--sm btn--danger';
    no.textContent = 'Rifiuta';
    const decide = async (approve) => {
      const { error } = await sb.rpc('approve_team_member', { p_team: currentTeam.team_id, p_user: m.user_id, p_approve: approve });
      if (error) { setFormMsg('members-msg', error.message); return; }
      toast(approve ? (m.nome || 'Utente') + ' è entrato nel team' : 'Richiesta rifiutata');
      renderMembersPanel();
      loadMembersMini();
    };
    yes.onclick = () => decide(true);
    no.onclick = () => decide(false);
    item.append(grow, yes, no);
    box.appendChild(item);
  });
}

async function loadMembersMini() {
  try {
    const members = await loadMembers();
    $('members-mini').textContent = currentTeam.team_nome + ' · ' + members.length + (members.length === 1 ? ' membro' : ' membri') + ' · ruolo: ' + ROLE_LABEL[currentTeam.role];
  } catch (e) {
    $('members-mini').textContent = '';
  }
}

async function renderMembersPanel() {
  const list = $('members-list');
  list.innerHTML = '';
  setFormMsg('members-msg', '');
  let all = [];
  try { all = await loadMembers({ withPending: true }); } catch (e) { setFormMsg('members-msg', 'Errore: ' + e.message); return; }
  renderPendingRequests(all);
  const members = all.filter((m) => (m.stato || 'attivo') === 'attivo');
  members.forEach((m) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const grow = document.createElement('div'); grow.className = 'grow';
    grow.textContent = (m.nome || 'Utente') + (m.user_id === me.id ? ' (tu)' : '') + ' ';
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = ROLE_LABEL[m.role] || m.role;
    grow.appendChild(badge);
    if (m.qualifica && m.user_id !== me.id) {
      const q = document.createElement('span'); q.className = 'subtle'; q.textContent = ' · ' + QUALIFICHE[m.qualifica];
      grow.appendChild(q);
    }
    item.appendChild(grow);
    if (m.user_id === me.id) {
      const sel = qualificaSelect(m.qualifica, 'La tua qualifica nel team');
      sel.onchange = async () => {
        const { error } = await sb.rpc('set_my_qualifica', { p_team: currentTeam.team_id, p_qualifica: sel.value });
        if (error) { setFormMsg('members-msg', error.message); return; }
        setFormMsg('members-msg', 'Qualifica salvata.', true);
      };
      item.appendChild(sel);
    }
    if (m.user_id !== me.id && currentTeam.role === 'owner') {
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Ruolo di ' + (m.nome || 'questo membro'));
      [['member', 'Membro'], ['admin', 'Amministratore'], ['owner', 'Rendi proprietario']].forEach(([v, l]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o);
      });
      sel.value = m.role;
      sel.onchange = async () => {
        if (sel.value === 'owner' && !await confirmDialog('Trasferire la proprietà?', 'Diventerai amministratore e ' + (m.nome || 'questo membro') + ' sarà il nuovo proprietario del team.', { okText: 'Trasferisci' })) { sel.value = m.role; return; }
        const { error } = await sb.rpc('set_team_member_role', { p_team: currentTeam.team_id, p_user: m.user_id, p_role: sel.value });
        if (error) { setFormMsg('members-msg', error.message); sel.value = m.role; return; }
        await refreshAfterRoleChange();
      };
      item.appendChild(sel);
    }
    const canRemove = m.user_id !== me.id && m.role !== 'owner' && (currentTeam.role === 'owner' || (currentTeam.role === 'admin' && m.role === 'member'));
    if (canRemove) {
      const rm = document.createElement('button');
      rm.className = 'btn btn--sm btn--danger';
      rm.textContent = 'Rimuovi';
      rm.onclick = async () => {
        if (!await confirmDialog('Rimuovere ' + (m.nome || 'questo membro') + '?', 'Non vedrà più i canali e i messaggi del team.', { okText: 'Rimuovi', danger: true })) return;
        const { error } = await sb.rpc('remove_team_member', { p_team: currentTeam.team_id, p_user: m.user_id });
        if (error) { setFormMsg('members-msg', error.message); return; }
        renderMembersPanel();
        loadMembersMini();
      };
      item.appendChild(rm);
    }
    list.appendChild(item);
  });
}

async function refreshAfterRoleChange() {
  await loadMemberships();
  currentTeam = memberships.find((m) => m.team_id === currentTeam.team_id);
  $('btn-invite').hidden = !isAdmin();
  renderChannelList();
  renderMembersPanel();
  loadMembersMini();
}

$('btn-members').onclick = () => { renderMembersPanel(); $('members-panel').showModal(); };

$('btn-leave-team').onclick = async () => {
  const last = (await loadMembers()).length === 1;
  const ok = await confirmDialog('Uscire dal team "' + currentTeam.team_nome + '"?',
    last ? 'Sei l\'unico membro: il team, i canali e i messaggi verranno eliminati.' : 'Non vedrai più i canali e i messaggi del team.',
    { okText: 'Esci dal team', danger: true });
  if (!ok) return;
  const { error } = await sb.rpc('leave_team', { p_team: currentTeam.team_id });
  if (error) { setFormMsg('members-msg', error.message); return; }
  $('members-panel').close();
  await loadMemberships();
  if (memberships.length) await openTeam(memberships[0].team_id);
  else showSetup();
};

// ============================================================
// IMPOSTAZIONI DEL TEAM (proprietario: team; amministratori: sedi e tipi di turno)
// ============================================================
function tipoRow(t = {}) {
  const row = document.createElement('div');
  row.className = 'cfg-tipo';
  row.innerHTML = '<input type="text" class="input" maxlength="40" placeholder="Nome (es. Notte)" aria-label="Nome del tipo di turno">'
    + '<input type="color" aria-label="Colore">'
    + '<input type="time" aria-label="Inizio"><input type="time" aria-label="Fine">';
  const [nome, colore, inizio, fine] = row.querySelectorAll('input');
  nome.value = t.nome || '';
  colore.value = t.colore || '#0ea5e9';
  inizio.value = t.inizio || '08:00';
  fine.value = t.fine || '14:00';
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'btn btn--ghost btn--icon btn--sm';
  del.setAttribute('aria-label', 'Togli questo tipo');
  del.appendChild(icon('trash-2'));
  del.onclick = () => row.remove();
  row.appendChild(del);
  return row;
}

function openSettings() {
  const t = currentTeam.team || {};
  const owner = currentTeam.role === 'owner';
  $('team-form').hidden = !owner;
  $('danger-zone').hidden = !owner;
  $('team-nome').value = t.nome || currentTeam.team_nome;
  $('team-tipo').value = t.tipo || '';
  $('team-sede').value = t.sede || '';
  $('team-approvazione').checked = !!t.richiede_approvazione;
  const cfg = t.turni_config || {};
  $('cfg-sedi').value = (cfg.sedi || []).join('\n');
  $('cfg-tipi').innerHTML = '';
  (cfg.tipi || []).forEach((x) => $('cfg-tipi').appendChild(tipoRow(x)));
  setFormMsg('team-msg', '');
  setFormMsg('cfg-msg', '');
  $('settings-panel').showModal();
}

$('btn-settings').onclick = openSettings;
$('cfg-add-tipo').onclick = () => { $('cfg-tipi').appendChild(tipoRow()); $('cfg-tipi').lastChild.querySelector('input').focus(); };

$('team-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = $('team-nome').value.trim();
  if (!nome) { setFormMsg('team-msg', 'Scrivi il nome del team.'); return; }
  const { error } = await sb.rpc('update_team', {
    p_team: currentTeam.team_id, p_nome: nome, p_tipo: $('team-tipo').value, p_sede: $('team-sede').value.trim(),
    p_richiede_approvazione: $('team-approvazione').checked,
  });
  if (error) { setFormMsg('team-msg', error.message); return; }
  setFormMsg('team-msg', 'Salvato.', true);
  await loadMemberships();
  currentTeam = memberships.find((m) => m.team_id === currentTeam.team_id);
  renderTeamSelect();
  loadMembersMini();
});

$('turni-config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const sedi = [...new Set($('cfg-sedi').value.split('\n').map((x) => x.trim().slice(0, 80)).filter(Boolean))].slice(0, 50);
  const tipi = [...$('cfg-tipi').querySelectorAll('.cfg-tipo')].map((row) => {
    const [nome, colore, inizio, fine] = row.querySelectorAll('input');
    return { nome: nome.value.trim().slice(0, 40), colore: colore.value, inizio: inizio.value, fine: fine.value };
  }).filter((x) => x.nome).slice(0, 30);
  const { error } = await sb.rpc('set_team_turni_config', { p_team: currentTeam.team_id, p_config: { sedi, tipi } });
  if (error) { setFormMsg('cfg-msg', error.message); return; }
  setFormMsg('cfg-msg', 'Salvato.', true);
  await loadMemberships();
  currentTeam = memberships.find((m) => m.team_id === currentTeam.team_id);
});

$('btn-delete-team').onclick = async () => {
  const nome = currentTeam.team_nome;
  const typed = await promptDialog('Eliminare il team "' + nome + '"?', {
    message: 'Vengono eliminati definitivamente canali, messaggi, inviti, libreria del team e condivisioni dei turni. Per confermare scrivi il nome del team.',
    label: 'Nome del team', okText: 'Elimina definitivamente', danger: true,
    validate: (v) => (v.trim().toLowerCase() === nome.trim().toLowerCase() ? null : 'Il nome non coincide.'),
  });
  if (typed === null) return;
  const { error } = await sb.rpc('delete_team', { p_team: currentTeam.team_id, p_conferma: typed });
  if (error) { await alertDialog('Team non eliminato', error.message); return; }
  $('settings-panel').close();
  toast('Team "' + nome + '" eliminato');
  await loadMemberships();
  if (memberships.length) await openTeam(memberships[0].team_id);
  else showSetup();
};

// ============================================================
// TURNI DEL TEAM (settimana): chi è di turno, dove; solo chi li condivide con il team
// ============================================================
let turniWeek = weekStart(new Date());
const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

async function renderTurni() {
  const end = addDays(turniWeek, 7);
  $('turni-title').textContent = turniWeek.getDate() + ' ' + MESI[turniWeek.getMonth()] + ' – ' + addDays(turniWeek, 6).getDate() + ' ' + MESI[addDays(turniWeek, 6).getMonth()] + ' ' + addDays(turniWeek, 6).getFullYear();
  const box = $('turni-week');
  box.innerHTML = '<p class="subtle">Caricamento…</p>';
  const [{ data, error }, mine] = await Promise.all([
    sb.rpc('team_shifts', { p_team: currentTeam.team_id, p_from: turniWeek.toISOString(), p_to: end.toISOString() }),
    sb.from('shift_shares').select('team_id').eq('user_id', me.id).eq('team_id', currentTeam.team_id),
  ]);
  if (error) { box.innerHTML = '<p class="msg msg--error">Turni non caricati: ' + error.message.replace(/</g, '&lt;') + '</p>'; return; }
  const sharing = (mine.data || []).length > 0;
  $('turni-hint').textContent = sharing
    ? 'Vedi i turni dei colleghi che li condividono con questo team.'
    : 'Non stai condividendo i tuoi turni con questo team: puoi farlo in "I miei turni" → Condivisione con i team.';
  const filter = $('turni-qualifica').value;
  const rows = (data || []).filter((s) => !filter || s.qualifica === filter);
  const tipi = mergeTipi((currentTeam.team && currentTeam.team.turni_config && currentTeam.team.turni_config.tipi) || []);
  box.innerHTML = '';
  const today = dayKey(new Date());
  for (let i = 0; i < 7; i++) {
    const day = addDays(turniWeek, i);
    const list = rows.filter((s) => dayKey(new Date(s.starts_at)) === dayKey(day));
    const sec = document.createElement('section');
    sec.className = 'turni-day' + (dayKey(day) === today ? ' is-today' : '');
    const h = document.createElement('h3');
    h.textContent = GIORNI[i] + ' ' + day.getDate() + ' ' + MESI[day.getMonth()];
    sec.appendChild(h);
    if (!list.length) {
      const p = document.createElement('p'); p.className = 'subtle'; p.textContent = 'Nessun turno condiviso.';
      sec.appendChild(p);
    }
    list.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'turno';
      item.style.setProperty('--c', s.colore || shiftColor(s.tipo, tipi));
      const who = document.createElement('div');
      who.className = 'turno__who';
      who.textContent = s.nome + (s.qualifica ? ' · ' + QUALIFICHE[s.qualifica] : '');
      const what = document.createElement('div');
      what.className = 'turno__what';
      what.textContent = s.tipo + ' · ' + formatRange(s) + (s.sede ? ' · ' + s.sede : '');
      item.append(who, what);
      if (s.note) { const n = document.createElement('div'); n.className = 'turno__note'; n.textContent = s.note; item.appendChild(n); }
      sec.appendChild(item);
    });
    box.appendChild(sec);
  }
}

$('turni-prev').onclick = () => { turniWeek = addDays(turniWeek, -7); renderTurni(); };
$('turni-next').onclick = () => { turniWeek = addDays(turniWeek, 7); renderTurni(); };
$('turni-today').onclick = () => { turniWeek = weekStart(new Date()); renderTurni(); };
$('turni-qualifica').innerHTML += Object.entries(QUALIFICHE).map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('');
$('turni-qualifica').onchange = renderTurni;

function showTab(name) {
  const turni = name === 'turni';
  $('tab-chat').setAttribute('aria-selected', String(!turni));
  $('tab-turni').setAttribute('aria-selected', String(turni));
  $('chat-view').hidden = turni;
  $('turni-view').hidden = !turni;
  try { localStorage.setItem('mr-team-tab', name); } catch (e) { /* ignora */ }
  if (turni) renderTurni();
}
$('tab-chat').onclick = () => showTab('chat');
$('tab-turni').onclick = () => showTab('turni');

// ============================================================
// INVITI
// ============================================================
async function renderInvites() {
  const list = $('invite-list');
  list.innerHTML = '';
  const { data, error } = await sb.from('team_invites').select('code, expires_at, max_uses, uses, revoked_at, created_at')
    .eq('team_id', currentTeam.team_id).order('created_at', { ascending: false });
  if (error) { list.textContent = 'Errore: ' + error.message; return; }
  const active = (data || []).filter((i) => !i.revoked_at && new Date(i.expires_at) > new Date() && i.uses < i.max_uses);
  if (!active.length) { list.innerHTML = '<p class="muted">Nessun invito attivo.</p>'; return; }
  active.forEach((inv) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const grow = document.createElement('div');
    grow.className = 'grow';
    grow.textContent = '…' + inv.code.slice(-6) + ' · usato ' + inv.uses + '/' + inv.max_uses + ' · scade il ' + formatTime(inv.expires_at);
    const rv = document.createElement('button');
    rv.className = 'btn btn--sm btn--danger';
    rv.textContent = 'Revoca';
    rv.onclick = async () => {
      const { error: e2 } = await sb.rpc('revoke_team_invite', { p_code: inv.code });
      if (e2) { setFormMsg('invite-msg', e2.message); return; }
      renderInvites();
    };
    item.append(grow, rv);
    list.appendChild(item);
  });
}

$('btn-invite').onclick = () => {
  $('invite-result').hidden = true;
  setFormMsg('invite-msg', '');
  renderInvites();
  $('invite-panel').showModal();
};

$('invite-generate').onclick = async () => {
  const { data: code, error } = await sb.rpc('create_team_invite', {
    p_team: currentTeam.team_id, p_max_uses: Number($('invite-uses').value), p_valid_days: Number($('invite-days').value),
  });
  if (error) { setFormMsg('invite-msg', error.message); return; }
  $('invite-link').textContent = pageUrl('team.html') + '?invite=' + encodeURIComponent(code);
  $('invite-result').hidden = false;
  setFormMsg('invite-msg', '');
  renderInvites();
};

$('invite-copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('invite-link').textContent);
    setFormMsg('invite-msg', 'Link copiato negli appunti.', true);
  } catch (e) {
    setFormMsg('invite-msg', 'Copia non riuscita: seleziona il link e copialo a mano.');
  }
};

document.querySelectorAll('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

// ============================================================
// AVVIO
// ============================================================
(async function init() {
  if (!sb) { $('gate').textContent = 'Configurazione cloud mancante.'; return; }
  if (isLocalMode()) {
    $('gate').innerHTML = '<div class="card setup-card"><h2>Team non disponibile</h2><p>In modalità locale i dati restano su questo computer: per lavorare in team serve un account.</p><a class="btn" href="app.html"><svg class="icon" aria-hidden="true"><use href="assets/icons.svg#arrow-left"></use></svg>Torna al referto</a></div>';
    return;
  }
  const invite = new URLSearchParams(window.location.search).get('invite');
  const { data: { session } } = await sb.auth.getSession();
  if (invite && !session) {
    // Si riprende l'invito dopo l'accesso o la registrazione.
    try { sessionStorage.setItem('mr-pending-invite', invite); } catch (e) { /* ignora */ }
  }
  me = await requireSession(sb);
  if (!me) return;
  try {
    await loadMemberships();
  } catch (e) {
    $('gate').textContent = 'Errore di connessione: ' + e.message;
    return;
  }
  startRealtime();
  if (invite) {
    showSetup({ title: 'Invito a un team', text: 'Sei stato invitato a entrare in un team. Premi "Entra" per accettare.', code: invite });
    return;
  }
  if (!memberships.length) { showSetup(); return; }
  let saved = null;
  try { saved = localStorage.getItem('mr-team'); } catch (e) { /* ignora */ }
  await openTeam(memberships.some((m) => m.team_id === saved) ? saved : memberships[0].team_id);
  let tab = null;
  try { tab = localStorage.getItem('mr-team-tab'); } catch (e) { /* ignora */ }
  if (tab === 'turni' || new URLSearchParams(window.location.search).get('vista') === 'turni') showTab('turni');
})();
