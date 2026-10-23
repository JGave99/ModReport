// Novità dell'ultima versione: le mostra l'editor una volta (finestra "Novità") e la pagina Tutorial.
// A ogni aggiornamento con funzioni nuove: cambiare VERSION e l'elenco.
import { escapeHtml, iconHtml } from './dom.js';

export const NEWS = {
  version: '2026-10-23',
  title: 'Novità: turni, team e referti tipo',
  items: [
    {
      icon: 'calendar-days',
      title: 'I tuoi turni',
      text: 'In Account → Turni segni i tuoi turni in un calendario mensile: tipo, orario, sede e note. Clic su un giorno per aggiungerne uno, "Ripeti ogni settimana" per i turni fissi, l\'icona copia per riportare una settimana nella successiva.',
      link: { href: 'account.html#turni', label: 'Apri i turni' },
    },
    {
      icon: 'users',
      title: 'Turni condivisi con il team',
      text: 'Scegli con quali team condividere i turni (completi o solo "di turno"). In Team → Turni vedi chi è di turno ogni giorno della settimana e dove, con il filtro per qualifica.',
      link: { href: 'team.html?vista=turni', label: 'Apri i turni del team' },
    },
    {
      icon: 'link',
      title: 'Google Calendar',
      text: 'In Account → Turni scarichi i turni in un file .ics da importare, oppure crei un link personale da aggiungere in Google Calendar ("Altri calendari" → "Da URL"), che si aggiorna da solo.',
    },
    {
      icon: 'settings',
      title: 'Team più completi',
      text: 'Il proprietario imposta nome, tipo, sede e l\'approvazione degli ingressi; proprietario e amministratori accettano le richieste, definiscono sedi e tipi di turno comuni e creano i canali. Ognuno indica la propria qualifica nell\'elenco dei membri.',
      link: { href: 'team.html', label: 'Apri il team' },
    },
    {
      icon: 'megaphone',
      title: 'Canale Avvisi e messaggi non letti',
      text: 'Ogni team ha un canale Avvisi in cui scrivono solo proprietario e amministratori, per le comunicazioni importanti. Il numero accanto a "Team" nel menu indica i canali con messaggi non letti.',
    },
    {
      icon: 'pencil',
      title: 'Confronto con precedenti personalizzabile',
      text: 'I pulsanti del punto 04 (Confronto, Presa visione, Non precedenti) ora si modificano: in Account → Libreria delle frasi, sezione "Confronto con precedenti", cambi etichette e testi, li riordini o ne aggiungi. Valgono per tutte le metodiche e tutti gli esami.',
      link: { href: 'account.html#confronti', label: 'Personalizza il confronto' },
    },
    {
      icon: 'bookmark',
      title: 'Referti tipo',
      text: 'Nel blocco Referto, l\'icona segnalibro salva il referto composto come modello per quell\'esame e lo reinserisce con un clic (anche da Ctrl+K).',
    },
    {
      icon: 'star',
      title: 'Frasi più usate',
      text: 'In cima alle frasi di ogni esame compaiono quelle che usi di più; Alt+Maiusc+1…6 le inserisce da tastiera.',
    },
  ],
};

export function newsHtml() {
  return '<ul class="news-list">' + NEWS.items.map((it) => '<li class="news-item">'
    + '<span class="news-item__icon">' + iconHtml(it.icon) + '</span><div><strong>' + escapeHtml(it.title) + '</strong><p>' + escapeHtml(it.text) + '</p>'
    + (it.link ? '<a href="' + escapeHtml(it.link.href) + '">' + escapeHtml(it.link.label) + '</a>' : '') + '</div></li>').join('') + '</ul>';
}
