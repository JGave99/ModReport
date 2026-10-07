// Archivio referti (archivio.html): solo locale (IndexedDB), con spostamento dell'archivio cloud.
import { getSupabase } from '../lib/supabase.js';
import { $, escapeHtml, formatDateTime, setMessage, iconHtml } from '../lib/dom.js';
import { requireSession, isSharedDevice } from '../lib/session.js';
import { confirmDialog, alertDialog } from '../lib/dialog.js';
import { listEntries, addEntry, deleteEntry, clearEntries, exportEntries, importEntries } from '../lib/local-archive.js';
import { computeStats, statsCsv } from '../lib/archive-stats.js';

const sb = getSupabase();
let currentUser = null;
let allEntries = [];

async function loadEntries() {
  try {
    allEntries = await listEntries(currentUser.id);
  } catch (e) {
    $('archive-list').innerHTML = '<div class="empty">Archivio locale non disponibile: ' + escapeHtml(e.message) + '</div>';
    allEntries = [];
    return;
  }
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
      : 'Nessun referto archiviato su questo computer. Dall\'editor, una volta composto il referto, usa "Salva nell\'archivio".';
    return;
  }
  empty.classList.add('hidden');
  filtered.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'archive-item';
    item.innerHTML = `
      <button class="archive-head" aria-expanded="false">
        ${iconHtml('chevron-right', 'chevron')}
        <span class="esame-name ${entry.esame ? '' : 'empty'}">${entry.esame ? escapeHtml(entry.esame) : 'Esame non specificato'}</span>
        <span class="date">${escapeHtml(formatDateTime(entry.createdAt))}</span>
      </button>
      <div class="archive-body">
        <pre class="archive-text">${escapeHtml(entry.testo)}</pre>
        <div class="archive-actions">
          <button class="btn btn--sm btn--danger" data-action="elimina">Elimina</button>
          <button class="btn btn--sm" data-action="copia">Copia negli appunti</button>
        </div>
      </div>`;
    const head = item.querySelector('.archive-head');
    head.onclick = () => head.setAttribute('aria-expanded', item.classList.toggle('open') ? 'true' : 'false');
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
      if (!await confirmDialog('Eliminare il referto?', 'Verrà eliminato definitivamente da questo computer.', { okText: 'Elimina', danger: true })) return;
      await deleteEntry(currentUser.id, entry.id);
      await loadEntries();
    };
    list.appendChild(item);
  });
  
  // Disegna le statistiche dopo ogni render
  try {
    drawStats();
  } catch (e) {
    console.error('Errore nel disegno delle statistiche:', e);
  }
}

$('search-input').addEventListener('input', renderList);
$('filter-esame').addEventListener('change', renderList);

$('btn-export').onclick = async () => {
  const json = await exportEntries(currentUser.id);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modreport-archivio-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  setMessage($('tools-message'), 'Copia scaricata. Conservala in un luogo protetto: contiene i testi dei tuoi referti.', 'ok');
};

$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const added = await importEntries(currentUser.id, await file.text());
    setMessage($('tools-message'), added + (added === 1 ? ' referto ripristinato.' : ' referti ripristinati.'), 'ok');
    await loadEntries();
  } catch (err) {
    setMessage($('tools-message'), err.message, 'error');
  }
});

$('btn-clear').onclick = async () => {
  if (!allEntries.length) return;
  if (!await confirmDialog('Svuotare l\'archivio?', 'Tutti i referti salvati su questo computer verranno eliminati. Se ti servono, scarica prima una copia.', { okText: 'Svuota', danger: true })) return;
  await clearEntries(currentUser.id);
  await loadEntries();
};

$('btn-export-csv').onclick = () => {
  const csv = statsCsv(allEntries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  a.download = `modreport-statistiche-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// ---- Spostamento dell'archivio salvato nel cloud (versioni precedenti) ----
async function cloudCount() {
  const { count, error } = await sb.from('report_archive').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id);
  return error ? 0 : (count || 0);
}

async function showCloudBanner() {
  const n = await cloudCount();
  $('cloud-banner').hidden = n === 0;
  if (n) {
    $('cloud-banner-text').textContent = 'Hai ' + n + (n === 1 ? ' referto salvato' : ' referti salvati') +
      ' nel cloud dalle versioni precedenti. Per proteggere i dati dei pazienti l\'archivio ora resta solo sul computer: spostali qui (verranno poi cancellati dal cloud).';
  }
}

$('btn-move-cloud').onclick = async () => {
  const btn = $('btn-move-cloud');
  btn.disabled = true;
  setMessage($('cloud-message'), 'Spostamento in corso…');
  try {
    let moved = 0;
    for (;;) {
      const { data, error } = await sb.from('report_archive').select('id, esame, testo, created_at')
        .eq('user_id', currentUser.id).order('created_at', { ascending: true }).limit(200);
      if (error) throw error;
      if (!data || !data.length) break;
      for (const row of data) await addEntry(currentUser.id, { id: row.id, esame: row.esame, testo: row.testo, createdAt: row.created_at });
      const { error: delError } = await sb.from('report_archive').delete().in('id', data.map((r) => r.id));
      if (delError) throw delError;
      moved += data.length;
    }
    setMessage($('cloud-message'), moved + (moved === 1 ? ' referto spostato' : ' referti spostati') + ' su questo computer e cancellati dal cloud.', 'ok');
    await loadEntries();
    await showCloudBanner();
  } catch (e) {
    setMessage($('cloud-message'), 'Spostamento interrotto: ' + e.message + '. I referti già copiati restano anche nel cloud finché non riprovi.', 'error');
  }
  btn.disabled = false;
};

function drawBars(box, rows) {
  box.innerHTML = '';
  const max = Math.max(1, ...rows.map((r) => r.n));
  rows.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'bar';
    const label = document.createElement('span');
    label.className = 'bar__label';
    label.textContent = r.nome;
    const track = document.createElement('span');
    track.className = 'bar__track';
    const fill = document.createElement('span');
    fill.className = 'bar__fill';
    fill.style.width = (r.n / max) * 100 + '%';
    track.appendChild(fill);
    const value = document.createElement('span');
    value.className = 'bar__value';
    value.textContent = r.n;
    row.append(label, track, value);
    box.appendChild(row);
  });
}

function drawStats() {
  const section = $('stats-section');
  section.hidden = !allEntries.length;
  if (!allEntries.length) return;
  const stats = computeStats(allEntries);
  $('stats-total').textContent = stats.totale;
  drawBars($('chart-metodica'), stats.perMetodica);
  drawBars($('chart-esame'), stats.perEsame);
  drawBars($('chart-mese'), stats.perMese.map((m) => ({ nome: m.etichetta, n: m.n })));
}

(async function init() {
  if (!sb) { $('gate').textContent = 'Configurazione cloud mancante.'; return; }
  currentUser = await requireSession(sb);
  if (!currentUser) return;
  $('gate').classList.add('hidden');
  $('page-root').classList.remove('hidden');
  if (isSharedDevice()) {
    $('shared-note').hidden = false;
    $('archive-tools').hidden = true;
    return;
  }
  await loadEntries();
  await showCloudBanner();
})();
