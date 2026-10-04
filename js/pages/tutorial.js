// Tour animato (tutorial.html). Le scene sono decorative: il contenuto è nella didascalia.
import { $, iconHtml } from '../lib/dom.js';

const d = (s) => ' style="--d:' + s + 's"';
const chip = (text, delay, extra = '') => '<span class="m-chip ' + extra + (delay != null ? ' hl"' + d(delay) : '"') + '>' + text + '</span>';

const SCENES = [
  {
    t: 'Referto a blocchi',
    p: 'Scegli metodica ed esame: indicazioni e frasi si filtrano a cascata. Ogni frase va al suo posto nel referto e un secondo clic la toglie. Il bordo verde indica un reperto normale, quello ambra un reperto patologico.',
    h: '<div class="m-two"><div>' +
      '<div class="m-lbl s">Metodica</div>' + chip('Ecografia') + chip('RX', 0.6) + chip('TC') + chip('RMN') +
      '<div class="m-lbl s"' + d(1.6) + '>Esame</div>' + chip('RX TORACE 2PR', 1.8) + chip('RX ADDOME') +
      '<div class="m-lbl s"' + d(2.8) + '>Referto</div>' + chip('Pleura libera', 3, 'm-phrase') + chip('Cuore nella norma', 4, 'm-phrase') + chip('Versamento pleurico', null, 'm-phrase m-phrase--abn') +
      '</div><div class="m-doc"><div class="s"' + d(2) + '>RX TORACE 2PR</div><br><div class="s"' + d(4) + '>Non versamento pleurico bilateralmente.</div><div class="s"' + d(5) + '>Ombra cardiaca nei limiti della norma.</div></div></div>',
  },
  {
    t: 'Dettatura vocale',
    p: 'Premi "Detta" e parla: il testo entra nel referto o nell\'indicazione. Usa il riconoscimento vocale del browser, che invia l\'audio al proprio fornitore (Google, Microsoft o Apple); ModReport riceve solo il testo. Puoi disattivarla dalle preferenze.',
    h: '<div class="m-center"><div class="m-mic s">' + iconHtml('mic') + '</div>' +
      '<div class="m-wave s"' + d(0.3) + '>' + '<i></i>'.repeat(10) + '</div></div>' +
      '<div class="m-doc m-doc--line m-gap"><span class="type"' + d(0.8) + '>Indicazione: tosse persistente da due settimane</span></div>',
  },
  {
    t: 'Cinque schede',
    p: 'Lavora su più referti insieme: ogni scheda conserva il suo testo e le sue scelte. Il puntino indica le schede già usate; se ricarichi la pagina la bozza viene ripristinata, e si cancella quando esci.',
    h: '<div class="m-two"><div><div class="m-lbl">Pulsanti sempre a portata</div>' + chip('RX') + chip('TC') + chip('RMN') + chip('Pleura libera', null, 'm-phrase') + '</div>' +
      '<div><div class="m-tabs"><div class="m-tab m-tab--on">1</div><div class="m-tab m-tab--dot">2</div><div class="m-tab">3</div><div class="m-tab">4</div><div class="m-tab">5</div></div>' +
      '<div class="m-doc s"' + d(0.3) + '>Scheda 1<br>RX TORACE 2PR<br>Pleura libera…</div></div></div>',
  },
  {
    t: 'Copia, stampa e archivio',
    p: 'Copia il referto nel RIS con un clic o con Ctrl+Invio. "Stampa" crea il PDF sulla tua carta intestata, con anteprima. "Salva" lo mette nell\'archivio, che resta solo su questo dispositivo.',
    h: '<div class="m-two"><div>' +
      '<div class="m-row s">' + '<span class="m-btn">' + iconHtml('printer') + 'Stampa</span><span class="m-btn">' + iconHtml('save') + 'Salva</span><span class="m-btn m-btn--primary hl"' + d(0.8) + '>' + iconHtml('copy') + 'Copia</span></div>' +
      '<div class="m-lbl s"' + d(1.6) + '>Archivio locale</div>' +
      '<div class="m-card m-card--row s"' + d(1.8) + '><b>RX TORACE 2PR</b><span class="m-muted">04/10/2026</span></div>' +
      '<div class="m-card m-card--row s"' + d(2.2) + '><b>ECOGRAFIA TIROIDE</b><span class="m-muted">03/10/2026</span></div>' +
      '</div><div class="m-paper s"' + d(2.6) + '><div class="m-paper__head">Studio Radiologico</div>' +
      '<p><b>RX TORACE 2PR</b></p><p>Non versamento pleurico bilateralmente.</p><p>Ombra cardiaca nei limiti della norma.</p></div></div>',
  },
  {
    t: 'La tua libreria',
    p: 'In Account → Libreria delle frasi organizzi metodiche, esami, indicazioni e gruppi di frasi. Modifichi il testo direttamente nella lista, cambi l\'ordine e scegli se una frase è normale o patologica. Le modifiche si salvano da sole.',
    h: '<div class="m-two"><div>' +
      '<div class="m-card s">' + iconHtml('search') + ' <span class="m-muted">Cerca esame…</span></div>' +
      '<div class="m-card s"' + d(0.4) + '><b>RX</b><br>' + iconHtml('chevron-right') + ' RX TORACE 2PR<br>' + iconHtml('chevron-right') + ' RX ADDOME</div></div><div>' +
      '<div class="m-lbl s"' + d(0.8) + '>Gruppo: Pleura</div>' +
      '<div class="m-card s"' + d(1) + '><b>Pleura libera</b><br><span class="m-muted">Non versamento pleurico bilateralmente.</span></div>' +
      '<div class="m-card m-card--abn s"' + d(1.4) + '><b>Versamento</b><br><span class="m-muted">Versamento pleurico [destro/sinistro] di [entità].</span></div>' +
      '<div class="s"' + d(2) + '><span class="m-btn hl"' + d(2.2) + '>' + iconHtml('plus') + 'Nuova frase</span></div></div></div>',
  },
  {
    t: 'Importa i tuoi referti',
    p: 'Incolla un referto scritto altrove: ModReport riconosce l\'esame, lo divide in frasi e propone se ciascuna è normale o patologica. Tu confermi e includi solo quelle che vuoi. Le frasi con possibili dati del paziente vengono bloccate.',
    h: '<div class="m-doc m-doc--line s">RX TORACE 2PR — Non addensamenti a focolaio. Non versamento pleurico.</div>' +
      '<div class="m-gap s"' + d(1) + '><span class="m-btn m-btn--primary">Analizza referto</span></div>' +
      '<div class="m-card s"' + d(1.8) + '>Non addensamenti a focolaio. <span class="m-muted">· Normale</span><br><br><span class="m-btn hl"' + d(2.6) + '>' + iconHtml('plus') + 'Includi nella libreria</span></div>' +
      '<div class="m-card s"' + d(2.4) + '>Non versamento pleurico. <span class="m-muted">· Normale</span><br><br><span class="m-btn">' + iconHtml('plus') + 'Includi nella libreria</span></div>',
  },
  {
    t: 'Team',
    p: 'Crea un team per il tuo studio o reparto e invita i colleghi con un link a scadenza. Ogni team ha i suoi canali, visibili solo ai membri.',
    h: '<div class="m-lbl"># reparto-radiologia</div>' +
      '<div class="m-bub s"' + d(0.4) + '>Chi è di turno in TC stasera?</div>' +
      '<div class="m-bub m-bub--me s"' + d(1.4) + '>Ci sono io fino alle 22.</div>' +
      '<div class="m-bub s"' + d(2.4) + '>Perfetto, grazie!</div>' +
      '<div class="m-note s"' + d(3.2) + '>' + iconHtml('triangle-alert') + 'Non inserire mai dati che identificano i pazienti nei messaggi.</div>',
  },
];

const DURATION = 9000;
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let cur = 0;
let playing = !reducedMotion;
let t0 = Date.now();
let elapsed = 0;

$('dots').innerHTML = SCENES.map((s, i) => '<button type="button" data-i="' + i + '" aria-label="Passo ' + (i + 1) + ': ' + s.t + '">' + (i + 1) + '</button>').join('');

function go(i) {
  cur = (i + SCENES.length) % SCENES.length;
  elapsed = 0;
  t0 = Date.now();
  const s = SCENES[cur];
  $('mock').innerHTML = s.h;
  $('cn').textContent = 'Passo ' + (cur + 1) + ' di ' + SCENES.length;
  $('ct').textContent = s.t;
  $('cp').textContent = s.p;
  document.querySelectorAll('#dots button').forEach((b, k) => {
    if (k === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
}

function setPlaying(value) {
  playing = value;
  $('play').querySelector('use').setAttribute('href', 'assets/icons.svg#' + (playing ? 'pause' : 'play'));
  $('play').querySelector('span').textContent = playing ? 'Pausa' : 'Riprendi';
}

setInterval(() => {
  if (playing) elapsed = Date.now() - t0; else t0 = Date.now() - elapsed;
  $('bar').style.width = Math.min(100, elapsed / DURATION * 100) + '%';
  if (playing && elapsed >= DURATION) go(cur + 1);
}, 100);

$('prev').onclick = () => go(cur - 1);
$('next').onclick = () => go(cur + 1);
$('play').onclick = () => setPlaying(!playing);
$('dots').onclick = (e) => { const b = e.target.closest('button[data-i]'); if (b) go(Number(b.dataset.i)); };
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  if (e.key === 'ArrowRight') go(cur + 1);
  if (e.key === 'ArrowLeft') go(cur - 1);
  if (e.key === ' ' && !e.target.closest('button, a')) { e.preventDefault(); setPlaying(!playing); }
});
$('back-link').addEventListener('click', (e) => {
  let same = false;
  try { same = document.referrer && new URL(document.referrer).origin === location.origin; } catch (_) { /* ignora */ }
  if (same && history.length > 1) { e.preventDefault(); history.back(); }
});

setPlaying(playing);
go(0);
