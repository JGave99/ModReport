// Libreria predefinita — Ecografia. BOZZA da validare clinicamente (revisione di 2-3 radiologi prima del lancio).
//
// Note per la revisione:
// - O(..., true) = reperto patologico "in aggiunta": non entra nel referto negativo e non sostituisce la
//   frase normale del gruppo perché non la contraddice (es. cisti renale accanto a "reni di dimensioni e
//   morfologia conservate", microlitiasi testicolare accanto a "testicoli di dimensioni ed ecostruttura nella norma");
// - le frasi che dipendono da come è stato condotto l'esame (pancreas non esplorabile, residuo post-minzionale,
//   reflusso venoso, velocità di flusso) sono opzionali, così il referto negativo resta corretto in ogni caso;
// - classificazioni solo come liste di scelta compilate dal medico (ACR TI-RADS, BI-RADS, grado di stenosi
//   carotidea, grado di varicocele), mai calcolate; nessuna raccomandazione di follow-up, biopsia o ulteriori esami;
import { N, P, O, exam } from './helpers.js';

export const METODICA = 'Ecografia';

export const ESAMI = [
  'ECOGRAFIA ADDOME COMPLETO',
  'ECOGRAFIA TIROIDE',
  'ECOGRAFIA ADDOME SUPERIORE',
  'ECOGRAFIA RENALE E VESCICALE',
  'ECOGRAFIA PARTI MOLLI',
  'ECOCOLORDOPPLER ARTI INFERIORI VENOSO',
  'ECOGRAFIA SCROTALE',
  'ECOGRAFIA MAMMARIA',
  'ECOCOLORDOPPLER TSA',
];

export const INDICAZIONI = {
  'ECOGRAFIA ADDOME COMPLETO': ['Dolore addominale', 'Alterazione indici epatici', 'Follow-up', 'Sospetta colelitiasi', 'Dispepsia', 'Calo ponderale'],
  'ECOGRAFIA TIROIDE': ['Riscontro di nodulo palpabile', 'Controllo periodico', 'Familiarità per patologia tiroidea', 'Alterazione della funzionalità tiroidea', 'Tumefazione cervicale'],
  'ECOGRAFIA ADDOME SUPERIORE': ['Dolore ipocondrio destro', 'Alterazione indici epatici', 'Sospetta colelitiasi', 'Dispepsia', 'Follow-up'],
  'ECOGRAFIA RENALE E VESCICALE': ['Dolore lombare', 'Ematuria', 'Controllo', 'Colica renale', 'Infezioni urinarie ricorrenti', 'Disturbi minzionali'],
  'ECOGRAFIA PARTI MOLLI': ['Tumefazione palpabile', 'Dolore localizzato', 'Sospetta ernia', 'Sospetta raccolta', 'Linfonodo palpabile'],
  'ECOCOLORDOPPLER ARTI INFERIORI VENOSO': ['Sospetta trombosi venosa profonda', 'Edema arto', 'Varici arti inferiori', 'Insufficienza venosa cronica', 'Follow-up di trombosi venosa'],
  'ECOGRAFIA SCROTALE': ['Dolore scrotale', 'Tumefazione palpabile', 'Sospetto varicocele', 'Infertilità di coppia', 'Trauma scrotale'],
  'ECOGRAFIA MAMMARIA': ['Riscontro di nodulo palpabile', 'Controllo', 'Integrazione di mammografia', 'Mastodinia', 'Secrezione dal capezzolo'],
  'ECOCOLORDOPPLER TSA': ['Fattori di rischio cardiovascolari', 'Soffio carotideo', 'Pregresso TIA o ictus', 'Vertigini', 'Controllo di stenosi carotidea nota'],
};

// -------------------------------------------------------------------------------------------------
// Frasi e gruppi comuni a più esami (exam() li copia e antepone all'ID il codice dell'esame).

const SEGMENTO = '[I/II/III/IV/V/VI/VII/VIII]';
const SEDE_RENALE = '[al polo superiore/al terzo medio/al polo inferiore]';
const TIRADS = 'Categoria ACR TI-RADS: [TR1/TR2/TR3/TR4/TR5].';
const STENOSI = 'Stenosi carotidea: [< 50%/50-69%/≥ 70%/subocclusiva/occlusione].';
const ASPETTO_PLACCA = '[ipoecogena/isoecogena/iperecogena/calcifica/a ecostruttura mista]';

// Addome

const FEGATO = [
  N('fegato.norma', 'Nella norma', 'Fegato di dimensioni ed ecostruttura nei limiti della norma.'),
  P('fegato.steatosi', 'Steatosi', 'Fegato di dimensioni [nei limiti della norma/aumentate], con iperecogenicità diffusa del parenchima e attenuazione del fascio ultrasonoro, quadro di steatosi di grado [lieve/moderato/marcato].'),
  P('fegato.epatomegalia', 'Epatomegalia', 'Fegato aumentato di volume, con diametro longitudinale di [___ cm] sulla linea emiclaveare media, a ecostruttura [omogenea/disomogenea].'),
];

const LESIONI_EPATICHE = [
  N('lesioni-epatiche.norma', 'Non lesioni focali', 'Non evidenti lesioni focali epatiche.'),
  P('lesioni-epatiche.cisti', 'Cisti semplice', 'Cisti epatica semplice al segmento ' + SEGMENTO + ', anecogena, a pareti sottili e con rinforzo acustico posteriore, di [___ mm].'),
  P('lesioni-epatiche.angioma', 'Angioma', 'Formazione iperecogena omogenea, a margini netti, al segmento ' + SEGMENTO + ', di [___ mm], con aspetto ecografico tipico di angioma.'),
  P('lesioni-epatiche.solida', 'Lesione da caratterizzare', 'Formazione focale solida [ipoecogena/iperecogena/isoecogena/disomogenea] al segmento ' + SEGMENTO + ', di [___ mm], a margini [netti/irregolari], non univocamente caratterizzabile all\'esame ecografico.'),
];

const COLECISTI = [
  N('colecisti.norma', 'Nella norma', 'Colecisti normodistesa, alitiasica, a pareti regolari.'),
  P('colecisti.litiasi', 'Litiasi', 'Colecisti contenente [un calcolo mobile/multipli calcoli mobili] con cono d\'ombra posteriore, di diametro massimo [___ mm], a pareti [sottili/ispessite].'),
  P('colecisti.colecistite', 'Colecistite', 'Colecisti [distesa/non distesa], con pareti ispessite fino a [___ mm] e stratificate, [con/senza] litiasi e [con/senza] falda fluida pericolecistica; segno di Murphy ecografico [positivo/negativo], quadro compatibile con colecistite acuta.'),
  P('colecisti.polipo', 'Polipo', 'Formazione ecogena di [___ mm] adesa alla parete colecistica [del fondo/del corpo/dell\'infundibolo], priva di cono d\'ombra posteriore e immobile ai cambi di decubito, compatibile con polipo.'),
  P('colecisti.colecistectomia', 'Colecistectomia', 'Colecisti non visualizzabile per pregressa colecistectomia.'),
];

const VIE_BILIARI = [
  N('vie-biliari.norma', 'Non dilatate', 'Vie biliari intra- ed extraepatiche non dilatate.'),
  P('vie-biliari.dilatazione', 'Dilatazione', 'Dilatazione delle vie biliari [intraepatiche/extraepatiche/intra- ed extraepatiche], con via biliare principale del calibro di [___ mm].'),
];

const PANCREAS = [
  N('pancreas.norma', 'Nella norma', 'Pancreas, per quanto esplorabile, di dimensioni ed ecostruttura regolari.'),
  P('pancreas.lesione', 'Lesione focale', 'Formazione focale [ipoecogena/anecogena/disomogenea] a carico [della testa/del corpo/della coda] del pancreas, di [___ mm], non univocamente caratterizzabile all\'esame ecografico.'),
  O('pancreas.non-esplorabile', 'Non esplorabile', 'Pancreas [non esplorabile/esplorabile solo in parte] per interposizione di meteorismo intestinale.'),
];

const MILZA = [
  N('milza.norma', 'Nella norma', 'Milza di dimensioni ed ecostruttura nei limiti della norma.'),
  P('milza.splenomegalia', 'Splenomegalia', 'Milza aumentata di volume, con diametro longitudinale di [___ cm].'),
];

const RENI = [
  N('reni.norma', 'Nella norma', 'Reni di dimensioni e morfologia conservate, senza dilatazione delle vie escretrici.'),
  P('reni.idronefrosi', 'Idronefrosi', 'Dilatazione delle cavità calico-pieliche [destre/sinistre/bilaterali] di grado [lieve/moderato/severo], con diametro antero-posteriore della pelvi di [___ mm].'),
  O('reni.cisti', 'Cisti renale', 'Cisti renale semplice ' + SEDE_RENALE + ' del rene [destro/sinistro], anecogena, a pareti sottili, di [___ mm].', true),
  O('reni.calcolosi', 'Calcolosi renale', 'Calcolosi del rene [destro/sinistro]: [un calcolo/multipli calcoli] con cono d\'ombra posteriore, di diametro massimo [___ mm].', true),
];

const VESCICA_ADDOME = [
  N('vescica.norma', 'Nella norma', 'Vescica a medio riempimento, a pareti regolari, senza alterazioni endoluminali.'),
  P('vescica.ispessimento', 'Ispessimento parietale', 'Ispessimento parietale vescicale [diffuso/focale] fino a [___ mm], con profilo [regolare/trabecolato].'),
  O('vescica.residuo', 'Residuo post-minzionale', 'Residuo post-minzionale di [___ ml].', true),
];

const AORTA = [
  N('aorta.norma', 'Nella norma', 'Aorta addominale di calibro nei limiti della norma nei tratti esplorabili.'),
  P('aorta.aneurisma', 'Aneurisma', 'Dilatazione aneurismatica dell\'aorta addominale [sottorenale/iuxtarenale/soprarenale], con diametro massimo di [___ mm], [con/senza] trombosi murale.'),
];

const VERSAMENTO = [
  N('versamento.norma', 'Non versamento', 'Non versamento libero in addome.'),
  P('versamento.libero', 'Versamento libero', 'Versamento libero in addome di entità [minima/modesta/abbondante], con falda fluida in sede [periepatica/perisplenica/pelvica/diffusa].'),
];

// Reni e vie urinarie (esame dedicato): parenchima, vie escretrici e lesioni focali sono aspetti separati
const RENI_PARENCHIMA = [
  N('reni.norma', 'Nella norma', 'Reni in sede, di dimensioni e morfologia conservate, con regolare spessore parenchimale.'),
  P('reni.parenchima', 'Alterazione parenchimale', '[Entrambi i reni/Il rene destro/Il rene sinistro] di dimensioni [ridotte/aumentate], con parenchima [assottigliato/iperecogeno/assottigliato e iperecogeno] e ridotta differenziazione corticomidollare.'),
  P('reni.assente', 'Rene non visualizzabile', 'Rene [destro/sinistro] non visualizzabile per [pregressa nefrectomia/agenesia]; rene controlaterale in sede, di morfologia conservata.'),
  O('reni.diametri', 'Diametri bipolari', 'Diametro bipolare: rene destro [___ mm], rene sinistro [___ mm].'),
];

const VIE_ESCRETRICI = [
  N('vie.norma', 'Nella norma', 'Non dilatazione delle cavità calico-pieliche né immagini litiasiche.'),
  P('vie.ectasia', 'Ectasia pielica', 'Ectasia della pelvi renale [destra/sinistra], con diametro antero-posteriore di [___ mm] e cavità caliceali non dilatate.'),
  P('vie.idronefrosi', 'Idronefrosi', 'Idronefrosi [destra/sinistra/bilaterale] di grado [lieve/moderato/severo], con diametro antero-posteriore della pelvi di [___ mm].'),
  P('vie.calcolosi', 'Calcolosi', 'Calcolosi del rene [destro/sinistro]: [un calcolo/multipli calcoli] con cono d\'ombra posteriore, di diametro massimo [___ mm], in corrispondenza [dei calici/della pelvi renale/della giunzione pielo-ureterale].'),
];

const LESIONI_RENALI = [
  N('lesioni-renali.norma', 'Non lesioni focali', 'Non evidenti lesioni focali renali.'),
  P('lesioni-renali.cisti', 'Cisti semplice', 'Cisti renale semplice ' + SEDE_RENALE + ' del rene [destro/sinistro], anecogena, a pareti sottili, di [___ mm].'),
  P('lesioni-renali.cisti-multiple', 'Cisti multiple', 'Multiple cisti renali semplici [bilaterali/a destra/a sinistra], la maggiore di [___ mm].'),
  P('lesioni-renali.complessa', 'Cisti complessa', 'Formazione cistica ' + SEDE_RENALE + ' del rene [destro/sinistro], di [___ mm], con [setti/ispessimento parietale/componente corpuscolata/calcificazioni parietali].'),
  P('lesioni-renali.solida', 'Lesione solida', 'Formazione solida [ipoecogena/iperecogena/isoecogena/disomogenea] ' + SEDE_RENALE + ' del rene [destro/sinistro], di [___ mm], [con/senza] segnale vascolare al color-Doppler.'),
];

const VESCICA_DEDICATA = [
  N('vescica.norma', 'Nella norma', 'Vescica a medio riempimento, a pareti regolari, senza alterazioni endoluminali.'),
  P('vescica.ispessimento', 'Ispessimento parietale', 'Ispessimento parietale vescicale [diffuso/focale] fino a [___ mm], con profilo [regolare/trabecolato].'),
  P('vescica.calcolo', 'Calcolosi vescicale', 'Vescica contenente [un calcolo/multipli calcoli] con cono d\'ombra posteriore, di diametro massimo [___ mm].'),
  P('vescica.formazione', 'Formazione endoluminale', 'Formazione [vegetante/sessile] adesa alla parete vescicale [laterale destra/laterale sinistra/posteriore/anteriore/del trigono/del fondo], di [___ mm], [con/senza] segnale vascolare al color-Doppler.'),
  O('vescica.residuo-nonsign', 'Residuo non significativo', 'Residuo post-minzionale non significativo ([___ ml]).'),
  O('vescica.residuo', 'Residuo aumentato', 'Residuo post-minzionale di [___ ml].', true),
];

// -------------------------------------------------------------------------------------------------

export const REFERTI = {
  'ECOGRAFIA ADDOME COMPLETO': exam('eco-addome', {
    'Fegato': FEGATO,
    'Lesioni epatiche': LESIONI_EPATICHE,
    'Colecisti': COLECISTI,
    'Vie biliari': VIE_BILIARI,
    'Pancreas': PANCREAS,
    'Milza': MILZA,
    'Reni': RENI,
    'Vescica': VESCICA_ADDOME,
    'Aorta addominale': AORTA,
    'Versamento': VERSAMENTO,
  }),

  'ECOGRAFIA TIROIDE': exam('eco-tiroide', {
    'Parenchima tiroideo': [
      N('parenchima.norma', 'Nella norma', 'Ghiandola tiroidea in sede, di dimensioni nella norma ed ecostruttura omogenea.'),
      P('parenchima.gozzo', 'Gozzo', 'Ghiandola tiroidea aumentata di volume [in toto/con prevalenza a carico del lobo destro/con prevalenza a carico del lobo sinistro], a ecostruttura [omogenea/disomogenea].'),
      P('parenchima.tiroidite', 'Tiroidite', 'Ghiandola tiroidea di dimensioni [nei limiti della norma/aumentate/ridotte], con ecostruttura diffusamente [ipoecogena/disomogenea/pseudonodulare], [con/senza] iperemia al color-Doppler, compatibile con tiroidite.'),
      P('parenchima.esiti', 'Esiti chirurgici', 'Esiti di [emitiroidectomia destra/emitiroidectomia sinistra/tiroidectomia totale].'),
      O('parenchima.dimensioni', 'Dimensioni', 'Lobo destro [___ x ___ x ___ mm], lobo sinistro [___ x ___ x ___ mm], istmo di [___ mm] di spessore; volume complessivo [___ ml].'),
      O('parenchima.vascolarizzazione', 'Vascolarizzazione', 'Vascolarizzazione parenchimale al color-Doppler [nei limiti della norma/aumentata/ridotta].'),
    ],
    'Noduli': [
      N('noduli.norma', 'Non noduli', 'Non si evidenziano formazioni nodulari focali.'),
      P('noduli.nodulo', 'Nodulo', 'Nodulo [del lobo destro/del lobo sinistro/dell\'istmo] di [___ x ___ x ___ mm], a composizione [cistica/spongiforme/mista cistico-solida/solida], [anecogeno/iperecogeno o isoecogeno/ipoecogeno/marcatamente ipoecogeno], di forma [più larga che alta/più alta che larga], a margini [netti/mal definiti/lobulati o irregolari/con estensione extratiroidea], [privo di focolai ecogeni/con macrocalcificazioni/con calcificazioni periferiche/con focolai ecogeni puntiformi]. ' + TIRADS),
      P('noduli.multipli', 'Noduli multipli', 'Multipli noduli [bilaterali/del lobo destro/del lobo sinistro], il maggiore [del lobo destro/del lobo sinistro/dell\'istmo] di [___ x ___ x ___ mm], a composizione [cistica/spongiforme/mista cistico-solida/solida], [anecogeno/iperecogeno o isoecogeno/ipoecogeno/marcatamente ipoecogeno]. Categoria ACR TI-RADS del nodulo maggiore: [TR1/TR2/TR3/TR4/TR5].'),
      O('noduli.vascolarizzazione', 'Vascolarizzazione nodulo', 'Nodulo con vascolarizzazione al color-Doppler [assente/perinodulare/intranodulare/mista].'),
    ],
    'Linfonodi': [
      N('linfonodi.norma', 'Non linfonodi patologici', 'Non linfonodi laterocervicali di aspetto patologico.'),
      P('linfonodi.singolo', 'Linfonodo', 'Linfonodo [laterocervicale destro/laterocervicale sinistro/del compartimento centrale] di [___ mm] in asse corto, [con/senza] ilo ecogeno conservato.'),
      P('linfonodi.multipli', 'Linfonodi multipli', 'Linfonodi [laterocervicali destri/laterocervicali sinistri/laterocervicali bilaterali/del compartimento centrale], il maggiore di [___ mm] in asse corto, di aspetto [reattivo/sospetto].'),
    ],
  }),

  'ECOGRAFIA ADDOME SUPERIORE': exam('eco-addome-sup', {
    'Fegato': FEGATO,
    'Lesioni epatiche': LESIONI_EPATICHE,
    'Colecisti': COLECISTI,
    'Vie biliari': VIE_BILIARI,
    'Pancreas': PANCREAS,
    'Milza': MILZA,
    'Reni': RENI,
  }),

  'ECOGRAFIA RENALE E VESCICALE': exam('eco-reni-vescica', {
    'Reni': RENI_PARENCHIMA,
    'Vie escretrici': VIE_ESCRETRICI,
    'Lesioni renali': LESIONI_RENALI,
    'Vescica': VESCICA_DEDICATA,
  }),

  'ECOGRAFIA PARTI MOLLI': exam('eco-parti-molli', {
    'Tessuti molli': [
      N('molli.norma', 'Nella norma', 'Non evidenti raccolte né lesioni focali nei tessuti molli in esame.'),
      P('molli.lipoma', 'Lipoma', 'Formazione ovalare ipo-isoecogena con fini strie ecogene, di [___ x ___ mm], in sede [sottocutanea/intermuscolare/intramuscolare], priva di significativo segnale vascolare al color-Doppler, compatibile con lipoma.'),
      P('molli.cisti', 'Cisti', 'Formazione ovalare ben definita a contenuto [anecogeno/ipoecogeno disomogeneo/corpuscolato], di [___ x ___ mm], in sede [sottocutanea/intradermica], con rinforzo acustico posteriore, compatibile con cisti.'),
      P('molli.raccolta', 'Raccolta fluida', 'Raccolta fluida [anecogena/a contenuto corpuscolato/a contenuto disomogeneo] di [___ x ___ mm] in sede [sottocutanea/intermuscolare/profonda], [con/senza] ispessimento parietale iperemico al color-Doppler.'),
      P('molli.ascesso', 'Ascesso', 'Raccolta a contenuto disomogeneo di [___ x ___ mm], con parete ispessita e iperemica e tessuti circostanti ispessiti e iperecogeni, compatibile con ascesso.'),
      P('molli.solida', 'Lesione solida', 'Formazione solida [ipoecogena/iperecogena/isoecogena/disomogenea] di [___ x ___ mm] in sede [sottocutanea/intramuscolare/profonda], a margini [netti/irregolari], [con/senza] segnale vascolare al color-Doppler.'),
    ],
    'Parete ed ernie': [
      N('parete.norma', 'Nella norma', 'Non evidenti ernie né difetti della parete.'),
      P('parete.ernia', 'Ernia', 'Ernia in sede [inguinale destra/inguinale sinistra/femorale destra/femorale sinistra/ombelicale/epigastrica/incisionale], con difetto di parete di [___ mm] e sacco contenente [tessuto adiposo/anse intestinali], [riducibile/non riducibile].'),
    ],
    'Muscoli e tendini': [
      N('muscoli.norma', 'Nella norma', 'Strutture muscolo-tendinee in esame di spessore ed ecostruttura regolari.'),
      P('muscoli.lesione', 'Lesione muscolare', 'Soluzione di continuità [parziale/completa] delle fibre del muscolo [___], con ematoma di [___ x ___ mm].'),
      P('muscoli.tendinopatia', 'Tendinopatia', 'Tendine [___] ispessito e disomogeneamente ipoecogeno, [con/senza] soluzione di continuità fibrillare e [con/senza] iperemia al color-Doppler.'),
    ],
    'Linfonodi': [
      N('linfonodi.norma', 'Non linfonodi patologici', 'Non linfonodi di aspetto patologico nelle stazioni esaminate.'),
      P('linfonodi.reattivo', 'Linfonodo reattivo', 'Linfonodo di aspetto reattivo in sede [___], ovalare, di [___ mm] in asse corto, con ilo ecogeno conservato.'),
      P('linfonodi.sospetti', 'Linfonodi sospetti', 'Linfonodi in sede [___], il maggiore di [___ mm] in asse corto, [di morfologia rotondeggiante/con corticale ispessita/privo di ilo ecogeno].'),
    ],
  }),

  'ECOCOLORDOPPLER ARTI INFERIORI VENOSO': exam('ecd-venoso-ai', {
    'Vena femorale comune': [
      N('femorale-comune.norma', 'Nella norma', 'Vena femorale comune pervia e comprimibile, con flusso spontaneo, fasico e modulato dagli atti respiratori.'),
      P('femorale-comune.occlusiva', 'Trombosi occlusiva', 'Vena femorale comune [destra/sinistra] non comprimibile, con lume occupato da materiale [ipoecogeno/iperecogeno/disomogeneo] e assenza di flusso al color-Doppler, per un tratto di [___ cm], compatibile con trombosi venosa profonda occlusiva.'),
      P('femorale-comune.non-occlusiva', 'Trombosi non occlusiva', 'Vena femorale comune [destra/sinistra] solo parzialmente comprimibile, con trombo parietale [ipoecogeno/iperecogeno/disomogeneo] di [___ cm] e flusso residuo al color-Doppler, compatibile con trombosi venosa profonda non occlusiva.'),
      P('femorale-comune.esiti', 'Esiti post-trombotici', 'Vena femorale comune [destra/sinistra] con ispessimento parietale e sinechie intraluminali, quadro compatibile con esiti post-trombotici.'),
    ],
    'Vena femorale': [
      N('femorale.norma', 'Nella norma', 'Vena femorale e vena femorale profonda pervie e comprimibili, con flusso spontaneo e fasico.'),
      P('femorale.occlusiva', 'Trombosi occlusiva', 'Vena femorale [superficiale/profonda] [destra/sinistra] non comprimibile, con lume occupato da materiale [ipoecogeno/iperecogeno/disomogeneo] e assenza di flusso al color-Doppler, per un tratto di [___ cm], compatibile con trombosi venosa profonda occlusiva.'),
      P('femorale.non-occlusiva', 'Trombosi non occlusiva', 'Vena femorale [superficiale/profonda] [destra/sinistra] solo parzialmente comprimibile, con trombo parietale [ipoecogeno/iperecogeno/disomogeneo] di [___ cm] e flusso residuo al color-Doppler, compatibile con trombosi venosa profonda non occlusiva.'),
      P('femorale.esiti', 'Esiti post-trombotici', 'Vena femorale [superficiale/profonda] [destra/sinistra] con ispessimento parietale e sinechie intraluminali, quadro compatibile con esiti post-trombotici.'),
    ],
    'Vena poplitea': [
      N('poplitea.norma', 'Nella norma', 'Vena poplitea pervia e comprimibile, con flusso spontaneo, fasico e incrementato dalle manovre di compressione distale.'),
      P('poplitea.occlusiva', 'Trombosi occlusiva', 'Vena poplitea [destra/sinistra] non comprimibile, con lume occupato da materiale [ipoecogeno/iperecogeno/disomogeneo] e assenza di flusso al color-Doppler, per un tratto di [___ cm], compatibile con trombosi venosa profonda occlusiva.'),
      P('poplitea.non-occlusiva', 'Trombosi non occlusiva', 'Vena poplitea [destra/sinistra] solo parzialmente comprimibile, con trombo parietale [ipoecogeno/iperecogeno/disomogeneo] di [___ cm] e flusso residuo al color-Doppler, compatibile con trombosi venosa profonda non occlusiva.'),
      P('poplitea.esiti', 'Esiti post-trombotici', 'Vena poplitea [destra/sinistra] con ispessimento parietale e sinechie intraluminali, quadro compatibile con esiti post-trombotici.'),
      O('poplitea.baker', 'Cisti di Baker', 'Cisti di Baker [destra/sinistra] di [___ x ___ mm], [con/senza] segni di rottura.', true),
    ],
    'Vene di gamba': [
      N('gamba.norma', 'Nella norma', 'Vene tibiali posteriori e peroneali, per quanto esplorabili, pervie e comprimibili; vene muscolari soleari e gemellari pervie.'),
      P('gamba.assiali', 'Trombosi vene assiali', 'Trombosi [occlusiva/non occlusiva] delle vene [tibiali posteriori/peroneali/tibiali anteriori] [destre/sinistre], per un tratto di [___ cm].'),
      P('gamba.muscolari', 'Trombosi vene muscolari', 'Trombosi [occlusiva/non occlusiva] delle vene muscolari [soleari/gemellari] [destre/sinistre], per un tratto di [___ cm].'),
    ],
    'Sistema venoso superficiale': [
      N('superficiale.norma', 'Nella norma', 'Non segni di trombosi venosa superficiale nei tratti esaminati.'),
      P('superficiale.trombosi', 'Trombosi superficiale', 'Trombosi venosa superficiale [occlusiva/non occlusiva] [della vena grande safena/della vena piccola safena/di un ramo varicoso] dell\'arto [destro/sinistro], estesa per [___ cm].'),
      P('superficiale.giunzione', 'Trombosi della safena', 'Trombosi della [grande safena/piccola safena] dell\'arto [destro/sinistro], con estremo prossimale a [___ cm] dalla giunzione [safeno-femorale/safeno-poplitea].'),
    ],
    'Insufficienza venosa': [
      O('insufficienza.norma', 'Giunzioni continenti', 'Giunzioni safeno-femorale e safeno-poplitea continenti, senza reflusso patologico alle manovre di compressione e rilascio.'),
      O('insufficienza.reflusso', 'Reflusso safenico', 'Reflusso patologico [della vena grande safena/della vena piccola safena] dell\'arto [destro/sinistro], di durata [___ s], con incontinenza della giunzione [safeno-femorale/safeno-poplitea].', true),
      O('insufficienza.varici', 'Ectasie varicose', 'Ectasia varicosa [della vena grande safena/della vena piccola safena/di vene tributarie] dell\'arto [destro/sinistro], con diametro massimo di [___ mm].', true),
      O('insufficienza.perforanti', 'Perforanti incontinenti', 'Vena perforante incontinente in sede [___], di diametro [___ mm].', true),
    ],
  }),

  'ECOGRAFIA SCROTALE': exam('eco-scroto', {
    'Testicoli': [
      N('testicoli.norma', 'Nella norma', 'Testicoli in sede, di dimensioni ed ecostruttura nella norma.'),
      P('testicoli.lesione', 'Lesione focale', 'Formazione focale [ipoecogena/iperecogena/disomogenea] del testicolo [destro/sinistro], di [___ mm], [con/senza] segnale vascolare al color-Doppler.'),
      P('testicoli.ipotrofia', 'Ipotrofia', 'Testicolo [destro/sinistro] di dimensioni ridotte ([___ x ___ x ___ mm]), a ecostruttura [omogenea/disomogenea].'),
      P('testicoli.aumentato', 'Aumento di volume', 'Testicolo [destro/sinistro] aumentato di volume ([___ x ___ x ___ mm]), a ecostruttura [omogenea/disomogenea/ipoecogena].'),
      P('testicoli.non-visualizzabile', 'Non visualizzabile', 'Testicolo [destro/sinistro] non visualizzabile in sede scrotale.'),
      O('testicoli.microlitiasi', 'Microlitiasi', 'Microlitiasi testicolare [destra/sinistra/bilaterale], con focolai iperecogeni puntiformi privi di cono d\'ombra, in numero di [___] per scansione.', true),
      O('testicoli.misure', 'Misure', 'Testicolo destro [___ x ___ x ___ mm], testicolo sinistro [___ x ___ x ___ mm].'),
    ],
    'Epididimi': [
      N('epididimi.norma', 'Nella norma', 'Epididimi di dimensioni ed ecostruttura regolari.'),
      P('epididimi.epididimite', 'Epididimite', 'Epididimo [destro/sinistro] aumentato di volume [in toto/a carico della testa/a carico della coda], a ecostruttura [ipoecogena/disomogenea], [con/senza] iperemia al color-Doppler, compatibile con epididimite.'),
      P('epididimi.lesione', 'Lesione focale', 'Formazione focale [solida/disomogenea] dell\'epididimo [destro/sinistro], di [___ mm].'),
      O('epididimi.cisti', 'Cisti epididimaria', 'Cisti [della testa/del corpo/della coda] dell\'epididimo [destro/sinistro], anecogena, a pareti sottili, di [___ mm].', true),
    ],
    'Vascolarizzazione': [
      N('vascolarizzazione.norma', 'Conservata', 'Vascolarizzazione intratesticolare conservata e simmetrica al color-Doppler.'),
      P('vascolarizzazione.iperemia', 'Iperemia', 'Aumento della vascolarizzazione del testicolo [destro/sinistro] e dell\'epididimo omolaterale al color-Doppler, compatibile con orchiepididimite.'),
      P('vascolarizzazione.ridotta', 'Ridotta o assente', 'Vascolarizzazione intratesticolare [ridotta/assente] [a destra/a sinistra/bilateralmente] al color-Doppler.'),
    ],
    'Idrocele': [
      N('idrocele.norma', 'Non idrocele', 'Non idrocele.'),
      P('idrocele.idrocele', 'Idrocele', 'Idrocele [destro/sinistro/bilaterale] di entità [lieve/modesta/notevole], a contenuto [anecogeno/finemente corpuscolato], [con/senza] setti.'),
    ],
    'Varicocele': [
      N('varicocele.norma', 'Non varicocele', 'Plesso pampiniforme di calibro regolare, senza reflusso alla manovra di Valsalva.'),
      P('varicocele.varicocele', 'Varicocele', 'Varicocele [destro/sinistro/bilaterale] di grado [I/II/III], con vene del plesso pampiniforme dilatate (diametro massimo [___ mm]) e reflusso [solo alla manovra di Valsalva/continuo con accentuazione al Valsalva].'),
    ],
  }),

  'ECOGRAFIA MAMMARIA': exam('eco-mammella', {
    'Parenchima ghiandolare': [
      N('parenchima.norma', 'Nella norma', 'Parenchima ghiandolare di ecostruttura regolare, con normale distribuzione del tessuto adiposo e fibroso.'),
      P('parenchima.ectasia', 'Ectasia duttale', 'Ectasia dei dotti galattofori [retroareolari/diffusa] [a destra/a sinistra/bilateralmente], con calibro massimo di [___ mm].'),
      P('parenchima.mastopatia', 'Mastopatia fibrocistica', 'Parenchima ghiandolare a ecostruttura disomogenea con multiple microcisti [a destra/a sinistra/bilateralmente], quadro compatibile con mastopatia fibrocistica.'),
      O('parenchima.esiti', 'Esiti chirurgici', 'Esiti di [quadrantectomia/mastectomia] della mammella [destra/sinistra].'),
    ],
    'Lesioni': [
      N('lesioni.norma', 'Non lesioni focali', 'Non formazioni focali solide o cistiche di significato patologico bilateralmente.'),
      P('lesioni.cisti', 'Cisti semplice', 'Formazione cistica anecogena a pareti sottili, con rinforzo acustico posteriore, in sede [___] della mammella [destra/sinistra], di [___ mm], compatibile con cisti semplice.'),
      P('lesioni.cisti-complessa', 'Cisti complessa', 'Formazione cistica in sede [___] della mammella [destra/sinistra], di [___ mm], con [echi interni/setti/ispessimento parietale/componente solida].'),
      P('lesioni.fibroadenoma', 'Fibroadenoma', 'Formazione solida ovalare, ipoecogena e omogenea, a margini netti, con asse maggiore parallelo alla cute, in sede [___] della mammella [destra/sinistra], di [___ mm], aspetto compatibile con fibroadenoma.'),
      P('lesioni.sospetta', 'Lesione sospetta', 'Formazione solida in sede [___] della mammella [destra/sinistra], di [___ mm], di forma [ovalare/rotonda/irregolare], a margini [irregolari/microlobulati/angolati/spiculati], con orientamento [parallelo/non parallelo] alla cute, [con/senza] ombra acustica posteriore.'),
    ],
    'Cavi ascellari': [
      N('ascelle.norma', 'Liberi', 'Cavi ascellari privi di linfonodi di aspetto patologico.'),
      P('ascelle.singolo', 'Linfonodo', 'Linfonodo ascellare [destro/sinistro] di [___ mm] in asse corto, [con/senza] ilo ecogeno conservato e [con/senza] ispessimento corticale.'),
      P('ascelle.multipli', 'Linfonodi multipli', 'Linfonodi ascellari [destri/sinistri/bilaterali], il maggiore di [___ mm] in asse corto, di aspetto [reattivo/sospetto].'),
    ],
    'Categoria BI-RADS': [
      N('birads.categoria', 'Categoria BI-RADS', 'Categoria BI-RADS: [0/1/2/3/4A/4B/4C/5/6].'),
    ],
  }),

  'ECOCOLORDOPPLER TSA': exam('ecd-tsa', {
    'Carotidi comuni': [
      N('cca.norma', 'Nella norma', 'Carotidi comuni pervie, di calibro regolare, con spessore intimo-mediale nei limiti della norma e flusso di morfologia e velocità regolari.'),
      P('cca.imt', 'Ispessimento intimo-mediale', 'Ispessimento intimo-mediale [diffuso/focale] [della carotide comune destra/della carotide comune sinistra/di entrambe le carotidi comuni], con spessore massimo di [___ mm].'),
      P('cca.placca', 'Placca', 'Placca ateromasica [della carotide comune destra/della carotide comune sinistra], ' + ASPETTO_PLACCA + ', a superficie [liscia/irregolare/ulcerata], con spessore massimo di [___ mm].'),
    ],
    'Bulbo e carotide interna dx': icaGroup('destra', 'dx'),
    'Bulbo e carotide interna sx': icaGroup('sinistra', 'sx'),
    'Carotidi esterne': [
      N('acc.norma', 'Nella norma', 'Carotidi esterne pervie, con flusso di morfologia e velocità regolari.'),
      P('acc.placca', 'Placca', 'Placca ateromasica all\'origine della carotide esterna [destra/sinistra], ' + ASPETTO_PLACCA + ', con spessore massimo di [___ mm].'),
      P('acc.occlusione', 'Occlusione', 'Carotide esterna [destra/sinistra] non pervia, con assenza di flusso al color-Doppler.'),
    ],
    'Arterie vertebrali': [
      N('vertebrali.norma', 'Nella norma', 'Arterie vertebrali pervie, con flusso anterogrado e velocità regolari.'),
      P('vertebrali.inversione', 'Inversione di flusso', 'Inversione del flusso nell\'arteria vertebrale [destra/sinistra], [completa/parziale/in fase sistolica].'),
      P('vertebrali.ipoplasia', 'Ipoplasia', 'Arteria vertebrale [destra/sinistra] di calibro ridotto, con diametro di [___ mm].'),
      P('vertebrali.stenosi', 'Stenosi dell\'origine', 'Stenosi all\'origine dell\'arteria vertebrale [destra/sinistra], con velocità di picco sistolico di [___ cm/s].'),
      O('vertebrali.calibro', 'Calibro', 'Diametro delle arterie vertebrali: destra [___ mm], sinistra [___ mm].'),
    ],
  }),
};

// Gruppo del bulbo e della carotide interna di un lato (dichiarato dopo l'uso perché function hoisted).
function icaGroup(lato, sigla) {
  const pl = lato === 'destra' ? 'destra' : 'sinistra';
  return [
    N('ica-' + sigla + '.norma', 'Nella norma', 'Biforcazione, bulbo e carotide interna ' + pl + ' pervi, di calibro regolare, senza placche ateromasiche e con flusso di morfologia e velocità regolari.'),
    P('ica-' + sigla + '.placca', 'Placca non stenosante', 'Placca ateromasica a livello del bulbo e dell\'origine della carotide interna ' + pl + ', ' + ASPETTO_PLACCA + ', a superficie [liscia/irregolare/ulcerata], con spessore massimo di [___ mm], senza stenosi emodinamicamente significativa.'),
    P('ica-' + sigla + '.stenosi', 'Placca stenosante', 'Placca ateromasica a livello del bulbo e dell\'origine della carotide interna ' + pl + ', ' + ASPETTO_PLACCA + ', a superficie [liscia/irregolare/ulcerata], con spessore massimo di [___ mm], velocità di picco sistolico di [___ cm/s] e velocità telediastolica di [___ cm/s]. ' + STENOSI),
    O('ica-' + sigla + '.velocita', 'Velocità di flusso', 'Velocità di picco sistolico della carotide interna ' + pl + ' di [___ cm/s], con rapporto tra carotide interna e carotide comune di [___].'),
  ];
}
