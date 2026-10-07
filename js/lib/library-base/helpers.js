// Strumenti per scrivere la libreria predefinita (js/lib/library-base/*.js).
//
// Regole della libreria (valgono anche per le frasi dell'utente):
// - ogni gruppo è un distretto (o un aspetto) del referto; i gruppi compaiono nel referto nell'ordine
//   in cui sono scritti. "Tecnica" va per primo, "Conclusioni" per ultimo (sezione con intestazione);
// - nel gruppo, la prima frase normale (neg: false) è quella del "Referto normale";
// - le frasi patologiche (neg: true) sono varianti: inserite nel referto sostituiscono la frase
//   normale dello stesso gruppo (e viceversa). Più frasi patologiche dello stesso gruppo possono coesistere;
// - le frasi "opzionali" (opz: true) non entrano nel referto normale e non sostituiscono nulla
//   (presidi, misure aggiuntive, note);
// - campi da compilare: [___] o [___ mm] = campo libero, [a/b/c] = scelta tra opzioni. Mai dati del paziente.
//
// ID stabili: ogni frase ha un ID locale (es. 'pleura.versamento') che exam() rende globale
// anteponendo il codice dell'esame ('rx-torace-2p:pleura.versamento'). Gli ID NON vanno mai cambiati
// né riutilizzati: servono ad aggiornare la libreria degli utenti senza toccare le loro modifiche.

export const N = (id, label, text) => ({ id, label, text, neg: false });
export const P = (id, label, text) => ({ id, label, text, neg: true });
export const O = (id, label, text, neg = false) => ({ id, label, text, neg, opz: true });

export function exam(code, groups) {
  const out = {};
  const seen = new Set();
  for (const [group, phrases] of Object.entries(groups)) {
    out[group] = phrases.map((p) => {
      const id = code + ':' + p.id;
      if (seen.has(id)) throw new Error('ID duplicato nella libreria predefinita: ' + id);
      seen.add(id);
      return { ...p, id };
    });
  }
  return out;
}
