# Libreria predefinita v4 — punti per la revisione clinica

La libreria (js/lib/library-base/: rx.js, eco.js, tc.js, rm.js) è una **BOZZA** scritta con l'aiuto di modelli linguistici:
prima del lancio deve essere rivista da 2-3 radiologi (voce 👤 dello Step 6 in docs/PIANO-LAVORI.md).

**Regole di struttura** (helpers.js):
- un gruppo per distretto; la prima frase normale entra nel "Referto negativo" predefinito (ogni utente può scegliere, per esame, quali frasi inserire);
- le frasi patologiche sostituiscono quella normale del gruppo; le frasi "aggiuntive" non entrano nel referto negativo predefinito e non sostituiscono nulla;
- niente gruppi "Tecnica" e "Conclusioni" (v4, issue #1): chi li vuole li aggiunge nella sua libreria. La classe di dose e la tecnica le indica già il RIS;
- le categorie (TI-RADS, BI-RADS, PI-RADS, LI-RADS, Bosniak, Fazekas…) sono solo liste di scelta del medico, mai calcolate;
- nessuna raccomandazione di follow-up o di altri esami (docs/legale/destinazione-uso.md).

**Contenuto:** 38 esami, circa 840 frasi. Le frasi possono essere modificate da ogni utente nella propria libreria; le correzioni della base arrivano agli utenti con un aggiornamento della versione (DEFAULTS_VERSION) senza toccare le frasi che hanno personalizzato.

## RX (12 esami, 280 frasi)
- RX TORACE 2PR ha 38 frasi: candidate allo sfoltimento Strie, Spondilosi dorsale, Limiti tecnici.
- RX ADDOME: la frase sull'aria libera dice "in ortostatismo" ma la Tecnica prevede anche il clinostatismo: correggere a mano se l'esame è solo supino.
- Classificazioni solo come liste di scelta (nessun punteggio calcolato): Garden (sottocapitata/mediocervicale; basicervicale tra le trocanteriche), Weber, Meyerding, Salter-Harris; gradi lieve/moderato/marcato per cedimento vertebrale, artrosi, alluce valgo.
- Formulazioni interpretative da validare: "sospetta per" (solco profondo, diastasi di Lisfranc); "di natura da definire" (nodulo polmonare); lipoemartro "compatibile con frattura intra-articolare anche in assenza di rime evidenti"; risalita della testa omerale "in prima ipotesi lesione cronica della cuffia"; protesi d'anca e ginocchio "senza evidenti segni radiografici di mobilizzazione".
- Piede piatto: valutabile solo in carico (non scritto per evitare raccomandazioni); angoli dell'alluce valgo come campi liberi.
- Reperti che convivono con la frase normale (strie, aorta ateromasica, osteopenia, corpi liberi, tumefazione, corpo estraneo…) sono frasi opzionali patologiche: non sostituiscono la frase normale.
- Le frasi v2 di ginocchio, spalla, polso, caviglia e rachide cervicale coprivano più distretti: divise per distretto mantenendo le formulazioni.

## Ecografia (9 esami, circa 225 frasi)
- Lessico ACR TI-RADS dei noduli (composizione, ecogenicità, forma, margini, focolai ecogeni): verificare le forme delle opzioni.
- Gradi di idronefrosi, steatosi e varicocele (lieve/moderato/severo, I/II/III): confermare.
- Formulazioni "compatibile con…" (angioma, polipo, colecistite, lipoma, cisti, ascesso, tiroidite, fibroadenoma, orchiepididimite): controllare.
- Il referto normale contiene affermazioni che dipendono dall'esame eseguito: "Plesso pampiniforme… senza reflusso alla manovra di Valsalva", "Vene tibiali… e muscolari… pervie", "Vescica a medio riempimento" (v2).
- "Rene non visualizzabile" aggiunge "rene controlaterale in sede, di morfologia conservata": confermare.
- Gruppo "Muscoli e tendini" nelle parti molli aggiunto (tenere o togliere).
- TSA: gruppi separati destra/sinistra; il grado di stenosi compare nella placca e nella conclusione; manca una frase dedicata all'occlusione.
- Le conclusioni mammarie includono sempre il campo BI-RADS (anche quella normale).
- Addome: cisti e calcolosi renale sono frasi aggiuntive (non sostituiscono la normale dei reni); "Insufficienza venosa" è un gruppo opzionale.

## TC (9 esami, 324 frasi)
- TC ADDOME COMPLETO ha 51 frasi (17 organi con normale + variante): sfoltibile.
- Reperti patologici che non contraddicono la frase normale come frasi opzionali patologiche: enfisema, interstiziopatia, bronchiectasie, calcificazioni coronariche, ateromasia, steatosi (TAP), microangiopatia, arteria iperdensa, ematoma epicranico, endoleak.
- "Non embolia (con mdc)" è opzionale (non entra nel referto normale degli esami senza contrasto): per l'angio-TC polmonare va aggiunta dal medico.
- "Protesi d'anca" è marcata patologica per sostituire la frase normale dell'anca.
- Classificazioni come liste di scelta: Bosniak 2019, Stanford, endoleak tipo Ia–IV, listesi grado I–IV (Meyerding). Gradi solo lieve/moderato/marcato; niente Fazekas, ASPECTS, Garden.
- Conclusione normale TAP: "Non evidenti segni TC di localizzazioni di malattia nei distretti esaminati." (diversa dalla frase v1 dismessa, ma vicina nel significato): da validare.
- Possibili letture come raccomandazioni o interpretazioni: "…e con eventuali esami precedenti" (nodulo polmonare, conclusioni TAP); "Limite TC precoce" (nota opzionale, ischemia iniziale); "da riferire in prima ipotesi a localizzazioni secondarie", "compatibile con adenoma", "trombosi non neoplastica/neoplastica", "[sospetta/verosimile] natura neoplastica".
- La frase v2 dei linfonodi TAP contiene una soglia ("asse corto superiore a 10 mm").
- Nuove indicazioni TC encefalo: Trauma cranico, Sospetto ictus, Cefalea acuta, Deficit neurologico focale, Alterazione dello stato di coscienza.

## RMN (8 esami, circa 290 frasi)
- Sintesi interpretative da validare: "compatibile con osteonecrosi", "compatibile con angioma", "di probabile natura vascolare" (Fazekas), "di aspetto compatibile con lesioni demielinizzanti", "da riferire a discopatia degenerativa", "a degenerazione mucoide".
- Classificazioni solo come liste di scelta: Modic, Meyerding, Fazekas, ARCO, Outerbridge, LI-RADS, PI-RADS v2.1 (verificare versioni e uso di Meyerding per una sola listesi).
- Prostata: tecnica con "[senza/con] studio dinamico"; valore ADC come campo libero senza unità; "estensione extraprostatica" e "obliterazione del piano di clivaggio" da verificare.
- Concordanza del lato con i nomi femminili: rileggere nel testo reale.
- Rachide: la frase normale "Canale vertebrale e forami" include "senza conflitti disco-radicolari"; una stenosi isolata la sostituisce e fa perdere anche questa affermazione.
- Encefalo: gruppi "Dopo mezzo di contrasto" e "Seni paranasali" interamente opzionali; "Non enhancement" vale solo con mdc.
- Reperti opzionali che si aggiungono alla frase normale: angioma vertebrale, osteofitosi marginale, cisti sinoviale, ipertrofia dei legamenti gialli, uncoartrosi, cisti parameniscale, os acromiale, cisti paralabrale, isola ossea, cisti di Baker, cisti prostatica, noduli ipertrofici della zona di transizione.
