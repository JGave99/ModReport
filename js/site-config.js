// Contenuti della landing che dipendono da decisioni del titolare (liste vuote = sezione nascosta).
// Il dominio usato da canonical, Open Graph, robots.txt e sitemap.xml è scritto in quei file: va
// aggiornato insieme al cambio di hosting (vedi npm run check:lancio).
window.MR_SITE = Object.freeze({
  // Chi siamo: radiologi fondatori e revisori della libreria (foto quadrate in assets/img/team/).
  // Esempio: { nome: 'Dott.ssa Anna Bianchi', ruolo: 'Radiologa, fondatrice', foto: 'assets/img/team/anna.jpg' }
  FOUNDERS: [],
  // Testimonianze reali dei beta tester, con consenso scritto alla pubblicazione.
  // Esempio: { testo: '…', autore: 'Dott. Mario Rossi', ruolo: 'Radiologo libero professionista' }
  TESTIMONIALS: [],
});
