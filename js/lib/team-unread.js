// Contatore dei canali del team con messaggi non letti, sul link "Team" del menu (issue #4).
// Si aggiorna all'apertura della pagina, quando si torna sulla scheda e ogni 2 minuti.

export async function showTeamBadge(sb, userId) {
  const link = document.querySelector('a[href="team.html"]');
  if (!link || !sb || !userId) return;
  try {
    const [last, reads] = await Promise.all([
      sb.rpc('my_channels_last_message'),
      sb.from('channel_reads').select('channel_id, last_read_at').eq('user_id', userId),
    ]);
    if (last.error) return;
    const read = new Map((reads.data || []).map((r) => [r.channel_id, r.last_read_at]));
    const n = (last.data || []).filter((r) => r.last_at && (!read.get(r.channel_id) || new Date(r.last_at) > new Date(read.get(r.channel_id)))).length;
    let badge = link.querySelector('.nav-badge');
    if (!n) { if (badge) badge.remove(); return; }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      link.appendChild(badge);
    }
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.title = n === 1 ? '1 canale con messaggi non letti' : n + ' canali con messaggi non letti';
    badge.setAttribute('aria-label', badge.title);
  } catch (e) { /* il contatore è un aiuto: in caso di errore non si mostra */ }
}

export function watchTeamBadge(sb, userId) {
  const refresh = () => showTeamBadge(sb, userId);
  refresh();
  setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 120000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
}
