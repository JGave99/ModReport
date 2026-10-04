// Amministrazione del sito (admin.html). Il controllo vero è sul server: le funzioni e le policy
// rifiutano chi non è in app_admins; qui si nasconde solo l'interfaccia.
import { getSupabase } from '../lib/supabase.js';
import { $, escapeHtml, formatDateTime } from '../lib/dom.js';
import { requireSession } from '../lib/session.js';
import { alertDialog } from '../lib/dialog.js';

const sb = getSupabase();
const STATUS_LABEL = { in_attesa: 'in attesa', approvato: 'approvato', rifiutato: 'rifiutato' };
let allRequests = [];
let currentFilter = 'in_attesa';
let allUsers = [];
let usersLoaded = false;

async function loadRequests() {
  const { data, error } = await sb
    .from('verification_requests')
    .select('id, user_id, email, storage_path, status, note_admin, submitted_at')
    .order('submitted_at', { ascending: false });
  if (error) {
    $('req-list').innerHTML = '<div class="empty">Errore nel caricamento: ' + escapeHtml(error.message) + '</div>';
    return;
  }
  allRequests = data || [];
  renderRequests();
}

function renderRequests() {
  const list = $('req-list');
  const filtered = currentFilter === 'tutte' ? allRequests : allRequests.filter((r) => r.status === currentFilter);
  if (!filtered.length) { list.innerHTML = '<div class="empty">Nessuna richiesta in questa categoria.</div>'; return; }
  list.innerHTML = '';
  filtered.forEach((req) => {
    const status = STATUS_LABEL[req.status] ? req.status : 'in_attesa';
    const card = document.createElement('div');
    card.className = 'req-card';
    card.innerHTML = `
      <div class="req-head">
        <span class="req-email">${escapeHtml(req.email || req.user_id)}</span>
        <span class="req-date">${escapeHtml(formatDateTime(req.submitted_at))}</span>
      </div>
      <div class="req-status ${status}">${escapeHtml(STATUS_LABEL[status])}</div>
      ${req.note_admin ? '<p style="font-size:12.5px; color:var(--ink-soft); margin:0 0 10px;">Nota: ' + escapeHtml(req.note_admin) + '</p>' : ''}
      <div class="req-actions">
        <button class="btn btn--sm" data-action="view">Vedi documento</button>
        ${status !== 'approvato' ? '<button class="btn btn--sm btn--primary" data-action="approve">Approva</button>' : ''}
        ${status !== 'rifiutato' ? '<input type="text" class="req-note" maxlength="500" placeholder="Motivo del rifiuto (opzionale)" aria-label="Motivo del rifiuto" data-note>' : ''}
        ${status !== 'rifiutato' ? '<button class="btn btn--sm btn--danger" data-action="reject">Rifiuta</button>' : ''}
      </div>`;
    card.querySelector('[data-action="view"]').onclick = () => viewDocument(req.storage_path);
    const approveBtn = card.querySelector('[data-action="approve"]');
    if (approveBtn) approveBtn.onclick = () => reviewRequest(req.id, 'approvato', null);
    const rejectBtn = card.querySelector('[data-action="reject"]');
    if (rejectBtn) {
      rejectBtn.onclick = () => {
        const noteInput = card.querySelector('[data-note]');
        reviewRequest(req.id, 'rifiutato', noteInput ? noteInput.value.trim() : null);
      };
    }
    list.appendChild(card);
  });
}

async function viewDocument(path) {
  // Finestra aperta subito (gesto dell'utente), poi indirizzata al link firmato: niente popup bloccati.
  const win = window.open('about:blank', '_blank');
  const { data, error } = await sb.storage.from('verifiche').createSignedUrl(path, 120);
  if (error) {
    if (win) win.close();
    await alertDialog('Documento non disponibile', error.message);
    return;
  }
  if (win) { win.opener = null; win.location.href = data.signedUrl; } else window.location.assign(data.signedUrl);
}

async function reviewRequest(id, status, note) {
  // Revisore e data li imposta il server.
  const { error } = await sb.from('verification_requests').update({ status, note_admin: note || null }).eq('id', id);
  if (error) { await alertDialog('Operazione non riuscita', error.message); return; }
  await loadRequests();
}

document.querySelectorAll('.tab-btn[data-filter]').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn[data-filter]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderRequests();
  };
});

async function loadUsers() {
  $('users-list').innerHTML = '<div class="empty">Caricamento…</div>';
  const { data, error } = await sb.rpc('list_app_users');
  if (error) {
    $('users-list').innerHTML = '<div class="empty">Errore nel caricamento: ' + escapeHtml(error.message) + '</div>';
    return;
  }
  allUsers = data || [];
  usersLoaded = true;
  renderUsers();
}

function renderUsers() {
  const search = $('user-search').value.trim().toLowerCase();
  const filtered = search ? allUsers.filter((u) => (u.email || '').toLowerCase().includes(search)) : allUsers;
  $('users-count').textContent = filtered.length + (filtered.length === 1 ? ' utente registrato' : ' utenti registrati');
  const list = $('users-list');
  if (!filtered.length) { list.innerHTML = '<div class="empty">Nessun utente trovato.</div>'; return; }
  list.innerHTML = '';
  filtered.forEach((u) => {
    const card = document.createElement('div');
    card.className = 'req-card';
    card.innerHTML = `
      <div class="req-head">
        <span class="req-email">${escapeHtml(u.email || u.id)}${u.is_admin ? '<span class="badge-admin">Admin</span>' : ''}</span>
        <span class="req-date">Iscritto il ${escapeHtml(formatDateTime(u.created_at))}</span>
      </div>
      <p class="muted" style="margin:0;">Ultimo accesso: ${u.last_sign_in_at ? escapeHtml(formatDateTime(u.last_sign_in_at)) : 'mai'}</p>`;
    list.appendChild(card);
  });
}

$('user-search').addEventListener('input', renderUsers);

document.querySelectorAll('.tab-btn[data-view]').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn[data-view]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    $('view-requests').classList.toggle('hidden', view !== 'requests');
    $('view-users').classList.toggle('hidden', view !== 'users');
    if (view === 'users' && !usersLoaded) loadUsers();
  };
});

(async function init() {
  if (!sb) { $('gate').textContent = 'Configurazione cloud mancante.'; return; }
  const user = await requireSession(sb);
  if (!user) return;
  const { data: adminRow } = await sb.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminRow) {
    $('gate').textContent = 'Questa pagina è riservata agli amministratori del sito.';
    return;
  }
  await loadRequests();
  $('gate').classList.add('hidden');
  $('page-root').classList.remove('hidden');
})();
