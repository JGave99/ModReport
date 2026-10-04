// Tour animato (tutorial.html).
const SCENES=[
{t:'Referto a blocchi',p:'Scegli la metodica, poi l\'esame: le opzioni si filtrano a cascata. Ogni pulsante del referto aggiunge la sua frase al testo.',h:`
<div class="two"><div>
<div class="lbl s">Metodica</div><span class="chip">Ecografia</span><span class="chip hl" style="--d:.6s">RX</span><span class="chip">TC</span>
<div class="lbl s" style="--d:1.6s">Esame</div><span class="chip hl s" style="--d:1.8s">RX TORACE 2PR</span><span class="chip s" style="--d:1.8s">RX ADDOME</span>
<div class="lbl s" style="--d:2.8s">Referto</div><span class="chip hl" style="--d:3s">Pleura libera</span><span class="chip hl" style="--d:4s">Cuore nella norma</span>
</div><div class="doc"><div class="s" style="--d:2s">RX TORACE 2PR</div><br><div class="s" style="--d:4s">Non versamento pleurico bilateralmente.</div><div class="s" style="--d:5s">Ombra cardiaca nei limiti della norma.</div></div></div>`},
{t:'Dettatura vocale',p:'Premi il microfono e parla: indicazioni e referti vengono scritti direttamente nel browser, senza installare nulla.',h:`
<div style="display:flex;align-items:center;gap:22px;justify-content:center;flex-wrap:wrap">
<div class="mic s">🎤</div><div class="wave s" style="--d:.3s"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
<div class="doc" style="margin-top:22px"><span class="type" style="--d:.8s">Indicazione: tosse persistente da due settimane</span></div>`},
{t:'Le 5 schede',p:'Lavora su più referti insieme: ogni scheda conserva testo, esame e indicazioni. I pulsanti a sinistra restano sempre gli stessi.',h:`
<div class="two"><div><div class="lbl">Pulsanti sempre fissi</div><span class="chip">RX</span><span class="chip">TC</span><span class="chip">RMN</span><span class="chip">Pleura libera</span></div>
<div><div class="tabs"><div class="tab on">1</div><div class="tab dot">2</div><div class="tab">3</div><div class="tab">4</div><div class="tab">5</div></div>
<div class="doc s" style="--d:.3s">Scheda 1<br>RX TORACE 2PR<br>Pleura libera…</div>
<div class="s" style="--d:2.4s;margin-top:10px;font-size:12.5px;color:var(--soft)">Il puntino indica che la scheda contiene già qualcosa.</div></div></div>`},
{t:'Libreria e importazione',p:'Incolla un referto scritto altrove: ModReport riconosce esame e indicazione e lo divide in frasi. Correggi e premi "Includi" sotto ciascuna per aggiungerla alla tua libreria.',h:`
<div class="doc s">RX TORACE 2PR — Non addensamenti a focolaio. Non versamento pleurico.</div>
<div class="s" style="--d:1s;margin:10px 0"><span class="btn">Analizza referto</span></div>
<div class="card s" style="--d:1.8s">Gruppo: <b>Parenchima</b> · Etichetta: <b>Parenchima nella norma</b><br>Non addensamenti a focolaio.<br><br><span class="btn hl" style="--d:2.6s">+ Includi nella libreria</span></div>
<div class="card s" style="--d:2.4s">Gruppo: <b>Pleura</b> · Etichetta: <b>Pleura libera</b><br>Non versamento pleurico.<br><br><span class="btn">+ Includi nella libreria</span></div>`},
{t:'Archivio',p:'Salva i referti composti e ritrovali cercando per esame o testo. Restano visibili solo a te.',h:`
<div class="card s" style="padding:9px 12px;color:var(--soft)">🔎 Cerca per nome esame o testo…</div>
<div class="card s" style="--d:.6s;display:flex;justify-content:space-between"><b>RX TORACE 2PR</b><span style="color:var(--soft)">28/09/2026</span></div>
<div class="card s" style="--d:1.1s;display:flex;justify-content:space-between"><b>ECOGRAFIA TIROIDE</b><span style="color:var(--soft)">27/09/2026</span></div>
<div class="s" style="--d:1.8s"><span class="btn">Copia negli appunti</span> <span class="btn" style="border-color:var(--danger);color:var(--danger)">Elimina</span></div>`},
{t:'Carta intestata e stampa',p:'Carica la carta intestata una sola volta: la stampa genera il PDF già impaginato.',h:`
<div class="paper s"><div class="head">Studio Radiologico</div>
<p class="s" style="--d:.8s"><b>RX TORACE 2PR</b></p><p class="s" style="--d:1.3s">Non versamento pleurico bilateralmente.</p><p class="s" style="--d:1.8s">Ombra cardiaca nei limiti della norma.</p></div>
<div class="s" style="--d:2.4s;text-align:center;margin-top:14px"><span class="btn hl" style="--d:2.6s">Genera e stampa</span></div>`},
{t:'Comunicazione di team',p:'Canali dedicati al tuo reparto, con messaggi in tempo reale, solo per chi lavora con te.',h:`
<div class="lbl"># reparto-radiologia</div>
<div class="bub s" style="--d:.4s">Chi è di turno in TC stasera?</div>
<div class="bub me s" style="--d:1.4s">Ci sono io fino alle 22.</div>
<div class="bub s" style="--d:2.4s">Perfetto, grazie!</div>
<div class="note s" style="--d:3.2s">⚠ Non inserire mai dati dei pazienti: né nei referti, né nei messaggi.</div>`}
];
const DUR=9000;let cur=0,playing=true,t0=Date.now(),elapsed=0;
const $=id=>document.getElementById(id);
$('dots').innerHTML=SCENES.map((_,i)=>`<button data-i="${i}">${i+1}</button>`).join('');
function go(i){cur=(i+SCENES.length)%SCENES.length;elapsed=0;t0=Date.now();const s=SCENES[cur];
$('mock').innerHTML=s.h;$('cn').textContent='Passo '+(cur+1)+' di '+SCENES.length;$('ct').textContent=s.t;$('cp').textContent=s.p;
document.querySelectorAll('.dots button').forEach((b,k)=>b.classList.toggle('on',k===cur));}
setInterval(()=>{if(playing){elapsed=Date.now()-t0}else{t0=Date.now()-elapsed}
$('bar').style.width=Math.min(100,elapsed/DUR*100)+'%';
if(playing&&elapsed>=DUR){if(cur<SCENES.length-1)go(cur+1);else{go(0)}}},100);
$('prev').onclick=()=>go(cur-1);$('next').onclick=()=>go(cur+1);
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'⏸ Pausa':'▶ Riprendi'};
$('dots').onclick=e=>{if(e.target.dataset.i)go(+e.target.dataset.i)};
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')go(cur+1);if(e.key==='ArrowLeft')go(cur-1);if(e.key===' '){e.preventDefault();$('play').click()}});
go(0);
$('back-link').addEventListener('click',e=>{
  let same=false;try{same=document.referrer&&new URL(document.referrer).origin===location.origin}catch(_){}
  if(same&&history.length>1){e.preventDefault();history.back()}
});
