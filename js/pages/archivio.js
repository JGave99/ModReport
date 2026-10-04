// Archivio referti (archivio.html).
import { getSupabase } from '../lib/supabase.js';
import { $, escapeHtml, formatDateTime } from '../lib/dom.js';
import { requireSession } from '../lib/session.js';
import { confirmDialog, alertDialog } from '../lib/dialog.js';

const sb = getSupabase();
let currentUser = null;
let allEntries = [];

async function loadEntries() {
  const { data, error } = await sb
    .from('report_archive')
    .select('id, esame, testo, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    $('archive-list').innerHTML = '<div class="empty-state">Errore nel caricamento dell\'archivio: ' + escapeHtml(error.message) + '</div>';
    return;
  }
  allEntries = data || [];
  populateEsameFilter();
  renderList();
}

function populateEsameFilter() {
  const select = $('filter-esame');
  const current = select.value;
  const esami = Array.from(new Set(allEntries.map((e) => e.esame).filter(Boolean))).sort();
  select.innerHTML = '<option value="">Tutti gli esami</option>' + esami.map((e) => '<option value="' + escapeHtml(e) + '">' + escapeHtml(e) + '</option>').join('');
  if (esami.includes(current)) select.value = current;
}

function renderList() {
  const search = $('search-input').value.trim().toLowerCase();
  const esameFilter = $('filter-esame').value;
  const filtered = allEntries.filter((entry) => {
    if (esameFilter && entry.esame !== esameFilter) return false;
    if (search && !((entry.esame || '') + ' ' + entry.testo).toLowerCase().includes(search)) return false;
    return true;
  });
  const list = $('archive-list');
  const empty = $('empty-state');
  list.innerHTML = '';
  if (!filtered.length) {
    empty.classList.remove('hidden');
    empty.textContent = allEntries.length
      ? 'Nessun referto corrisponde alla ricerca.'
      : 'Nessun referto archiviato per ora. Da "Anteprima referto", una volta composto, usa "Salva nell\'archivio" per iniziare a costruire il tuo archivio.';
    return;
  }
  empty.classList.add('hidden');
  filtered.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'archive-item';
    item.innerHTML = `
      <button class="archive-head" aria-expanded="false" style="width:100%; background:none; border:0; color:inherit; font:inherit; text-align:left;">
        <span class="chevron" aria-hidden="true">▶</span>
        <span class="esame-name ${entry.esame ? '' : 'empty'}">${entry.esame ? escapeHtml(entry.esame) : 'Esame non specificato'}</span>
        <span class="date">${escapeHtml(formatDateTime(entry.created_at))}</span>
      </button>
      <div class="archive-body">
        <pre class="archive-text">${escapeHtml(entry.testo)}</pre>
        <div class="archive-actions">
          <button class="btn-sm danger" data-action="elimina">Elimina</button>
          <button class="btn-sm" data-action="copia">Copia negli appunti</button>
        </div>
      </div>`;
    const head = item.querySelector('.archive-head');
    head.onclick = () => {
      const open = item.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    item.querySelector('[data-action="copia"]').onclick = async () => {
      try {
        await navigator.clipboard.writeText(entry.testo);
        const flash = $('copy-flash');
        flash.classList.add('show');
        setTimeout(() => flash.classList.remove('show'), 1400);
      } catch (err) {
        await alertDialog('Copia non riuscita', 'Seleziona il testo e copialo a mano.');
      }
    };
    item.querySelector('[data-action="elimina"]').onclick = async () => {
      if (!await confirmDialog('Eliminare il referto?', 'Verrà eliminato definitivamente dall\'archivio.', { okText: 'Elimina', danger: true })) return;
      const { data, error } = await sb.from('report_archive').delete().eq('id', entry.id).select('id');
      if (error || !data || !data.length) {
        await alertDialog('Referto non eliminato', error ? error.message : 'Il server non ha confermato l\'eliminazione: riprova.');
        return;
      }
      allEntries = allEntries.filter((x) => x.id !== entry.id);
      populateEsameFilter();
      renderList();
    };
    list.appendChild(item);
  });
}

$('search-input').addEventListener('input', renderList);
$('filter-esame').addEventListener('change', renderList);

(async function init() {
  if (!sb) { $('gate').textContent = 'Configurazione cloud mancante.'; return; }
  currentUser = await requireSession(sb);
  if (!currentUser) return;
  await loadEntries();
  $('gate').classList.add('hidden');
  $('page-root').classList.remove('hidden');
})();
