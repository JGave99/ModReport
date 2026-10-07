// Libreria predefinita — TC. BOZZA da validare clinicamente (revisione di 2-3 radiologi prima del lancio).
//
// Note per la revisione:
// - O(..., true) = reperto patologico "in aggiunta": non entra nel referto normale e non sostituisce la
//   frase normale del gruppo perché non la contraddice (es. enfisema accanto a "parenchima privo di
//   alterazioni densitometriche focali", ateromasia accanto a "calibro regolare");
// - le affermazioni valide solo con il mezzo di contrasto sono opzionali (es. "Non embolia (con mdc)"),
//   così il referto normale resta corretto anche per gli esami senza mdc;
// - classificazioni solo come liste di scelta compilate dal medico (Bosniak 2019, Stanford, tipo di
//   endoleak, grado di listesi), mai calcolate; nessun punteggio, nessuna raccomandazione di follow-up
//   o di ulteriori esami legata ai reperti.
import { N, P, O, exam } from './helpers.js';

export const METODICA = 'TC';

export const ESAMI = [
  'TC TORACE',
  'TC ADDOME COMPLETO',
  'TC ADDOME SENZA E CON MDC',
  'TC TORACE ADDOME PELVI (STADIAZIONE)',
  'TC RACHIDE LOMBOSACRALE',
  'TC BACINO',
  'TC COLONNA CERVICALE',
  'TC ANGIOGRAFIA AORTA',
  'TC ENCEFALO',
];

export const INDICAZIONI = {
  'TC TORACE': ['Stadiazione oncologica', 'Sospetta embolia polmonare', 'Dispnea ingravescente', 'Follow-up oncologico', 'Controllo di nodulo polmonare noto', 'Trauma toracico'],
  'TC ADDOME COMPLETO': ['Dolore addominale acuto', 'Stadiazione neoplastica', 'Follow-up post-chirurgico', 'Sospetta occlusione intestinale', 'Sospetta appendicite', 'Sospetta colica renale'],
  'TC ADDOME SENZA E CON MDC': ['Dolore addominale', 'Sospetta neoplasia', 'Caratterizzazione di lesione epatica', 'Caratterizzazione di lesione renale', 'Follow-up oncologico'],
  'TC TORACE ADDOME PELVI (STADIAZIONE)': ['Stadiazione oncologica', 'Follow-up oncologico', 'Rivalutazione dopo terapia', 'Sospetta recidiva', 'Ricerca di neoplasia primitiva'],
  'TC RACHIDE LOMBOSACRALE': ['Lombalgia', 'Sospetta ernia discale', 'Lombosciatalgia', 'Trauma', 'Sospetto cedimento vertebrale'],
  'TC BACINO': ['Trauma', 'Coxalgia', 'Sospetta frattura del femore prossimale', 'Controllo post-chirurgico'],
  'TC COLONNA CERVICALE': ['Trauma', 'Cervicalgia', 'Cervicobrachialgia', 'Controllo post-chirurgico'],
  'TC ANGIOGRAFIA AORTA': ['Sospetta dissezione aortica', 'Follow-up aneurisma', 'Dolore toracico acuto', 'Controllo dopo endoprotesi aortica', 'Sospetta rottura di aneurisma'],
  'TC ENCEFALO': ['Trauma cranico', 'Sospetto ictus', 'Cefalea acuta', 'Deficit neurologico focale', 'Alterazione dello stato di coscienza'],
};

// -------------------------------------------------------------------------------------------------
// Frasi comuni a più esami (exam() le copia e antepone all'ID il codice dell'esame).

// Tecnica e confronto
const TECNICA_TC = N('tecnica', 'Tecnica', 'Esame eseguito [senza/senza e con] mezzo di contrasto iodato e.v. ([___] ml di [prodotto]).');
const TECNICA_OSSO = N('tecnica', 'Tecnica', 'Esame eseguito senza mezzo di contrasto, con ricostruzioni multiplanari sagittali e coronali.');
const CONFRONTO = O('tecnica.confronto', 'Confronto', 'Confronto con precedente esame TC del [data].');
const ARTEFATTI = O('tecnica.artefatti', 'Artefatti', 'Valutazione parzialmente limitata da artefatti da [movimento/respiro/materiale metallico].');
const CONCL_CONFRONTO = O('concl.confronto', 'Confronto', 'Quadro [invariato/in miglioramento/in peggioramento] rispetto al precedente esame del [data].');

// Torace
const POLMONE_NODULO = P('polmone.nodulo', 'Nodulo', 'Nodulo [solido/parzialmente solido/a vetro smerigliato] del [lobo] di [___ mm] (immagine [___]).');
const POLMONE_NODULI = P('polmone.noduli', 'Noduli multipli', 'Multipli noduli polmonari [bilaterali/a destra/a sinistra], il maggiore del [lobo] di [___ mm] (immagine [___]).');
const POLMONE_MASSA = P('polmone.massa', 'Massa', 'Formazione espansiva solida del [lobo] di [___ x ___ mm], a margini [lobulati/spiculati/regolari], [con/senza] segni di infiltrazione delle strutture adiacenti.');
const POLMONE_ADDENSAMENTO = P('polmone.addensamento', 'Addensamento', 'Addensamento parenchimale [consolidativo/a vetro smerigliato/misto] del [lobo], [con/senza] broncogramma aereo.');
const POLMONE_ENFISEMA = O('polmone.enfisema', 'Enfisema', 'Enfisema [centrolobulare/parasettale/panlobulare] di grado [lieve/moderato/marcato], a distribuzione [prevalente ai lobi superiori/prevalente ai lobi inferiori/diffusa].', true);
const PLEURA_VERSAMENTO = P('pleura.versamento', 'Versamento', 'Versamento pleurico [destro/sinistro/bilaterale] di [minima/modesta/abbondante] entità (spessore massimo [___ mm]), [con/senza] atelettasia passiva del parenchima adiacente.');
const PLEURA_ISPESSIMENTO = P('pleura.ispessimento', 'Ispessimento pleurico', 'Ispessimento pleurico [liscio/nodulare/calcifico] [destro/sinistro/bilaterale], di spessore massimo [___ mm].');

// Addome
const FEGATO_STEATOSI = P('fegato.steatosi', 'Steatosi', 'Fegato di dimensioni [nei limiti/aumentate], con diffusa riduzione della densità parenchimale compatibile con steatosi [lieve/moderata/marcata].');
const FEGATO_LESIONE = P('fegato.lesione', 'Lesione focale', 'Lesione focale ipodensa al segmento [___] di [___ mm], [a densità fluida e margini netti, compatibile con cisti/di natura non determinabile/sospetta per localizzazione secondaria].');
const FEGATO_MULTIPLE = P('fegato.multiple', 'Lesioni multiple', 'Multiple lesioni focali ipodense [in entrambi i lobi/nel lobo destro/nel lobo sinistro], la maggiore al segmento [___] di [___ mm], [da riferire in prima ipotesi a localizzazioni secondarie/di natura da definire].');
const COLECISTI_NORMA = N('colecisti.norma', 'Nella norma', 'Colecisti normodistesa, a pareti sottili, senza calcoli apprezzabili all\'indagine TC.');
const COLECISTI_LITIASI = P('colecisti.litiasi', 'Litiasi', 'Litiasi colecistica [singola/multipla], con calcolo maggiore di [___ mm].');
const VIE_BILIARI_NORMA = N('vie-biliari.norma', 'Non dilatate', 'Vie biliari intra- ed extraepatiche non dilatate.');
const VIE_BILIARI_DILATAZIONE = P('vie-biliari.dilatazione', 'Dilatazione', 'Dilatazione delle vie biliari [intraepatiche/intra- ed extraepatiche], con coledoco del calibro di [___ mm], [con/senza] evidenza della causa ostruttiva.');
const PANCREAS_NORMA = N('pancreas.norma', 'Nella norma', 'Pancreas di morfologia e densità regolari; dotto di Wirsung non dilatato.');
const PANCREAS_PANCREATITE = P('pancreas.pancreatite', 'Pancreatite', 'Pancreas [aumentato di volume/di volume conservato] con imbibizione del tessuto adiposo peripancreatico, [con/senza] raccolte fluide, compatibile con pancreatite acuta.');
const PANCREAS_LESIONE = P('pancreas.lesione', 'Lesione focale', 'Lesione focale [solida ipodensa/cistica] a carico [della testa/del corpo/della coda] del pancreas, di [___ mm], [con/senza] dilatazione a monte del dotto di Wirsung.');
const MILZA_NORMA = N('milza.norma', 'Nella norma', 'Milza di dimensioni e densità nei limiti della norma.');
const MILZA_SPLENOMEGALIA = P('milza.splenomegalia', 'Splenomegalia', 'Milza aumentata di volume, con diametro longitudinale di [___ cm].');
const MILZA_LESIONE = P('milza.lesione', 'Lesione focale', 'Lesione focale splenica ipodensa di [___ mm], [a densità fluida/a densità tissutale].');
const SURRENI_NORMA = N('surreni.norma', 'Nella norma', 'Surreni di morfologia regolare.');
const SURRENI_NODULO = P('surreni.nodulo', 'Nodulo', 'Nodulo surrenalico [destro/sinistro] di [___ mm], con densità di [___ HU] [nelle scansioni senza mdc/in fase portale], [compatibile con adenoma/di natura non determinabile/sospetto per localizzazione secondaria].');
const RENI_NORMA = N('reni.norma', 'Nella norma', 'Reni di dimensioni e morfologia conservate; non dilatazione delle vie escretrici.');
const RENI_CISTI = P('reni.cisti', 'Lesione cistica', 'Lesione cistica renale [destra/sinistra] al [polo superiore/terzo medio/polo inferiore] di [___ mm], categoria Bosniak 2019 [I/II/IIF/III/IV].');
const RENI_SOLIDA = P('reni.solida', 'Lesione solida', 'Lesione solida renale [destra/sinistra] al [polo superiore/terzo medio/polo inferiore] di [___ mm], a crescita [esofitica/endofitica/mista].');
const RENI_CALCOLO = P('reni.calcolo', 'Calcolo', 'Calcolo [caliceale/pielico/ureterale] [destro/sinistro] di [___ mm], in sede [___].');
const RENI_IDRONEFROSI = P('reni.idronefrosi', 'Idronefrosi', 'Dilatazione della via escretrice [destra/sinistra] di grado [lieve/moderato/marcato], [con/senza] imbibizione del tessuto adiposo perirenale.');
const PELVI_NORMA = N('pelvi.norma', 'Nella norma', 'Organi pelvici nei limiti per quanto valutabile con metodica TC.');
const PELVI_FORMAZIONE = P('pelvi.formazione', 'Formazione pelvica', 'Formazione [cistica/solida/mista] in sede [annessiale destra/annessiale sinistra/uterina/prostatica/pelvica], di [___ mm].');
const VERSAMENTO_LIBERO = P('versamento.libero', 'Versamento libero', 'Versamento fluido libero [periepatico/perisplenico/nello scavo pelvico/diffuso] di [minima/modesta/abbondante] entità.');
const LINFONODI_ADDOME = P('linfonodi.adenopatie', 'Linfoadenopatie', 'Linfoadenopatie [retroperitoneali/mesenteriche/iliache/inguinali], la maggiore in sede [___] di [___ mm] in asse corto.');
const AORTA_ADD_NORMA = N('aorta.norma', 'Nella norma', 'Aorta addominale di calibro regolare.');
const AORTA_ADD_ANEURISMA = P('aorta.aneurisma', 'Aneurisma', 'Dilatazione aneurismatica dell\'aorta addominale [sottorenale/iuxtarenale/soprarenale], con diametro massimo di [___ mm], [con/senza] trombosi murale.');

// Scheletro e rachide
const OSSA_NORMA = N('scheletro.norma', 'Nella norma', 'Non lesioni ossee focali di aspetto litico o addensante nei segmenti esaminati.');
const OSSA_LESIONE = P('scheletro.lesione', 'Lesione ossea', 'Lesione ossea [litica/addensante/mista] a carico [___], di [___ mm].');
const VERTEBRA_LESIONE = P('vertebre.lesione', 'Lesione ossea', 'Lesione ossea [litica/addensante/mista] del corpo vertebrale di [___], di [___ mm], [con/senza] interruzione della corticale.');
const CANALE_NORMA = N('canale.norma', 'Nella norma', 'Canale vertebrale e forami di coniugazione di ampiezza conservata ai livelli esaminati.');
const FORAMI_STENOSI = P('canale.foraminale', 'Stenosi foraminale', 'Stenosi [lieve/moderata/severa] [del forame di coniugazione destro/del forame di coniugazione sinistro/dei forami di coniugazione bilateralmente] a livello [___].');
const CONCL_DEGENERATIVE = (tratto) => P('concl.degenerative', 'Alterazioni degenerative', 'Alterazioni degenerative disco-artrosiche del rachide ' + tratto + ', prevalenti a livello [___].');
const CONCL_STENOSI = P('concl.stenosi', 'Stenosi del canale', 'Stenosi [lieve/moderata/severa] del canale vertebrale a livello [___].');

// -------------------------------------------------------------------------------------------------

export const REFERTI = {
  'TC TORACE': exam('tc-torace', {
    'Tecnica': [TECNICA_TC, CONFRONTO, ARTEFATTI],
    'Parenchima polmonare': [
      N('polmone.norma', 'Nella norma', 'Parenchima polmonare privo di alterazioni densitometriche focali.'),
      POLMONE_NODULO,
      POLMONE_NODULI,
      POLMONE_MASSA,
      POLMONE_ADDENSAMENTO,
      POLMONE_ENFISEMA,
      O('polmone.interstizio', 'Interstiziopatia', 'Alterazioni interstiziali con reticolazioni a distribuzione [subpleurica e basale/peribroncovascolare/diffusa], [con/senza] bronchiectasie da trazione e [con/senza] aspetti a favo.', true),
      O('polmone.bronchiectasie', 'Bronchiectasie', 'Bronchiectasie [cilindriche/varicose/cistiche] in sede [___].', true),
    ],
    'Pleura': [
      N('pleura.norma', 'Nella norma', 'Non versamento pleurico né pneumotorace.'),
      PLEURA_VERSAMENTO,
      P('pleura.pnx', 'Pneumotorace', 'Pneumotorace [destro/sinistro] con falda di spessore massimo [___ mm] in sede [apicale/anteriore/laterale/basale].'),
      PLEURA_ISPESSIMENTO,
    ],
    'Linfonodi': [
      N('linfonodi.norma', 'Non linfoadenopatie', 'Non linfoadenopatie mediastiniche o ilari di rilievo dimensionale.'),
      P('linfonodi.adenopatia', 'Linfoadenopatia', 'Linfoadenopatia [mediastinica/ilare] in stazione [___], di [___ mm] in asse corto.'),
      P('linfonodi.multiple', 'Linfoadenopatie multiple', 'Multiple linfoadenopatie [mediastiniche/ilari/mediastiniche e ilari], la maggiore in stazione [___] di [___ mm] in asse corto.'),
    ],
    'Arterie polmonari': [
      N('arterie.norma', 'Nella norma', 'Arteria polmonare e rami principali di calibro regolare.'),
      O('arterie.no-tep', 'Non embolia (con mdc)', 'Non difetti di riempimento endoluminali nelle arterie polmonari opacizzate, fino ai rami [lobari/segmentari/sottosegmentari].'),
      P('arterie.tep', 'Embolia polmonare', 'Difetti di riempimento endoluminali compatibili con embolia polmonare, a carico [del tronco polmonare/dei rami principali/dei rami lobari/dei rami segmentari/dei rami sottosegmentari] [bilateralmente/a destra/a sinistra].'),
      O('arterie.vd-vs', 'Rapporto VD/VS', 'Rapporto tra i diametri del ventricolo destro e del ventricolo sinistro di [___]; reflusso di mdc in vena cava inferiore [assente/presente].'),
    ],
    'Cuore': [
      N('cuore.norma', 'Nella norma', 'Cuore di dimensioni nei limiti della norma.'),
      P('cuore.cardiomegalia', 'Cardiomegalia', 'Aumento delle dimensioni cardiache [globale/prevalente a carico delle sezioni destre/prevalente a carico delle sezioni sinistre].'),
      O('cuore.coronarie', 'Calcificazioni coronariche', 'Calcificazioni coronariche [lievi/moderate/marcate].', true),
    ],
    'Pericardio': [
      N('pericardio.norma', 'Non versamento', 'Non versamento pericardico.'),
      P('pericardio.versamento', 'Versamento', 'Versamento pericardico [lieve/moderato/abbondante], con spessore massimo di [___ mm].'),
    ],
    'Aorta toracica': [
      N('aorta.norma', 'Nella norma', 'Aorta toracica di calibro regolare.'),
      P('aorta.dilatazione', 'Dilatazione', 'Dilatazione [ectasica/aneurismatica] dell\'aorta toracica a livello [della radice/del tratto ascendente/dell\'arco/del tratto discendente], con diametro massimo di [___ mm].'),
      O('aorta.ateromasia', 'Ateromasia', 'Ateromasia calcifica [lieve/moderata/marcata] dell\'aorta toracica.', true),
    ],
    'Scheletro': [
      N('scheletro.norma', 'Nella norma', 'Non lesioni ossee focali né rime di frattura nei segmenti scheletrici esaminati.'),
      OSSA_LESIONE,
      P('scheletro.costa', 'Frattura costale', 'Frattura [composta/scomposta] del [___] arco costale [destro/sinistro], sul versante [anteriore/laterale/posteriore].'),
      P('scheletro.vertebra', 'Cedimento vertebrale', 'Riduzione in altezza del corpo vertebrale di [___], di grado [lieve/moderato/severo].'),
    ],
    'Addome superiore': [
      N('addome.norma', 'Nella norma', 'Organi dell\'addome superiore compresi nel volume di studio senza alterazioni di rilievo.'),
      P('addome.reperto', 'Reperto incidentale', 'Nel volume di studio dell\'addome superiore: [___].'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame TC del torace nei limiti della norma.'),
      P('concl.nodulo', 'Nodulo polmonare', 'Nodulo polmonare [solido/parzialmente solido/a vetro smerigliato] del [lobo] di [___ mm], da correlare con il quadro clinico e con eventuali esami precedenti.'),
      P('concl.massa', 'Formazione espansiva', 'Formazione espansiva del [lobo] di [___ mm], di [sospetta/verosimile] natura neoplastica.'),
      P('concl.flogosi', 'Focolaio flogistico', 'Addensamento parenchimale [___] compatibile in prima ipotesi con focolaio flogistico; da correlare con il quadro clinico-laboratoristico.'),
      P('concl.tep', 'Embolia polmonare', 'Reperti compatibili con embolia polmonare [bilaterale/destra/sinistra], con interessamento [del tronco polmonare/dei rami principali/dei rami lobari/dei rami segmentari/dei rami sottosegmentari].'),
      CONCL_CONFRONTO,
    ],
  }),

  'TC ADDOME COMPLETO': exam('tc-addome', {
    'Tecnica': [TECNICA_TC, CONFRONTO],
    'Fegato': [
      N('fegato.norma', 'Nella norma', 'Fegato di dimensioni e densità nei limiti, privo di lesioni focali.'),
      FEGATO_STEATOSI,
      FEGATO_LESIONE,
      FEGATO_MULTIPLE,
    ],
    'Colecisti': [
      COLECISTI_NORMA,
      COLECISTI_LITIASI,
      P('colecisti.colecistite', 'Colecistite', 'Colecisti distesa, con ispessimento parietale di [___ mm] e imbibizione del tessuto adiposo pericolecistico, compatibile con colecistite acuta [litiasica/alitiasica].'),
    ],
    'Vie biliari': [VIE_BILIARI_NORMA, VIE_BILIARI_DILATAZIONE],
    'Pancreas': [PANCREAS_NORMA, PANCREAS_PANCREATITE, PANCREAS_LESIONE],
    'Milza': [MILZA_NORMA, MILZA_SPLENOMEGALIA],
    'Surreni': [SURRENI_NORMA, SURRENI_NODULO],
    'Reni': [RENI_NORMA, RENI_CISTI, RENI_SOLIDA, RENI_CALCOLO, RENI_IDRONEFROSI],
    'Vescica': [
      N('vescica.norma', 'Nella norma', 'Vescica normodistesa, a pareti regolari.'),
      P('vescica.parete', 'Ispessimento parietale', 'Ispessimento parietale vescicale [diffuso/focale] di [___ mm], [con/senza] componente vegetante endoluminale.'),
    ],
    'Organi pelvici': [PELVI_NORMA, PELVI_FORMAZIONE],
    'Intestino': [
      N('intestino.norma', 'Nella norma', 'Anse intestinali di calibro regolare, senza evidenti ispessimenti parietali.'),
      P('intestino.occlusione', 'Occlusione', 'Distensione delle anse [del tenue/del colon/del tenue e del colon] con livelli idro-aerei, calibro massimo di [___ mm] e punto di transizione in sede [___].'),
      P('intestino.ispessimento', 'Ispessimento parietale', 'Ispessimento parietale [concentrico/eccentrico] [dell\'ileo/del digiuno/del colon/del retto] in sede [___], per un tratto di [___ cm], [con/senza] imbibizione del tessuto adiposo circostante.'),
      P('intestino.diverticolite', 'Diverticolite', 'Diverticoli del [sigma/colon discendente/colon ascendente] con ispessimento parietale e imbibizione del tessuto adiposo pericolico, quadro compatibile con diverticolite acuta.'),
    ],
    'Appendice': [
      N('appendice.norma', 'Nella norma', 'Appendice ciecale [di calibro regolare/non chiaramente identificabile], senza segni di flogosi in fossa iliaca destra.'),
      P('appendice.appendicite', 'Appendicite', 'Appendice ciecale distesa (diametro [___ mm]), con ispessimento parietale e imbibizione del tessuto adiposo periappendicolare, [con/senza] appendicolita.'),
    ],
    'Aria libera': [
      N('aria.norma', 'Non pneumoperitoneo', 'Non segni di pneumoperitoneo.'),
      P('aria.libera', 'Aria libera', 'Aria libera [endoperitoneale/retroperitoneale] [in sede sottodiaframmatica/in sede periepatica/diffusa], [compatibile con perforazione di viscere cavo/in esiti di recente intervento chirurgico].'),
    ],
    'Versamento': [
      N('versamento.norma', 'Non versamento', 'Non versamento libero né raccolte fluide addomino-pelviche.'),
      VERSAMENTO_LIBERO,
      P('versamento.raccolta', 'Raccolta', 'Raccolta fluida [saccata/con parete captante il mdc] in sede [___], di [___ x ___ mm], [con/senza] bolle gassose.'),
    ],
    'Linfonodi': [
      N('linfonodi.norma', 'Non linfoadenopatie', 'Non linfoadenopatie retroperitoneali di rilievo dimensionale.'),
      LINFONODI_ADDOME,
    ],
    'Aorta addominale': [AORTA_ADD_NORMA, AORTA_ADD_ANEURISMA],
    'Scheletro': [OSSA_NORMA, OSSA_LESIONE],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame TC dell\'addome nei limiti della norma.'),
      P('concl.appendicite', 'Appendicite acuta', 'Quadro compatibile con appendicite acuta [non complicata/complicata].'),
      P('concl.diverticolite', 'Diverticolite acuta', 'Quadro compatibile con diverticolite acuta del [sigma/colon discendente/colon ascendente] [non complicata/complicata].'),
      P('concl.occlusione', 'Occlusione intestinale', 'Quadro compatibile con occlusione intestinale [del tenue/del colon], con punto di transizione in sede [___].'),
      P('concl.uropatia', 'Uropatia ostruttiva', 'Uropatia ostruttiva [destra/sinistra] da calcolo ureterale di [___ mm].'),
      P('concl.lesione', 'Lesione da definire', 'Lesione [___] di natura da definire, da correlare con il quadro clinico-laboratoristico.'),
      CONCL_CONFRONTO,
    ],
  }),

  'TC ADDOME SENZA E CON MDC': exam('tc-addome-mdc', {
    'Tecnica': [
      N('tecnica', 'Tecnica', 'Esame eseguito senza e con mezzo di contrasto iodato e.v. ([___] ml di [prodotto]), con acquisizioni in fase [arteriosa/portale/tardiva].'),
      CONFRONTO,
      ARTEFATTI,
    ],
    'Fegato': [
      N('fegato.norma', 'Nella norma', 'Fegato di dimensioni e densità nei limiti, privo di lesioni focali nelle diverse fasi di studio.'),
      FEGATO_STEATOSI,
      P('fegato.ipodensa', 'Lesione ipodensa', 'Lesione focale ipodensa al segmento [___] di [___ mm], [a densità fluida senza enhancement, compatibile con cisti/con enhancement periferico ad anello/ipovascolare in tutte le fasi].'),
      P('fegato.angioma', 'Angioma', 'Lesione al segmento [___] di [___ mm] con enhancement periferico nodulare discontinuo e progressivo riempimento centripeto, compatibile con angioma.'),
      P('fegato.ipervascolare', 'Lesione ipervascolare', 'Lesione focale al segmento [___] di [___ mm], ipervascolare in fase arteriosa, con [wash-out/persistenza dell\'enhancement/isodensità al parenchima] nelle fasi portale e tardiva.'),
    ],
    'Colecisti': [COLECISTI_NORMA, COLECISTI_LITIASI],
    'Vie biliari': [VIE_BILIARI_NORMA, VIE_BILIARI_DILATAZIONE],
    'Pancreas': [
      N('pancreas.norma', 'Nella norma', 'Pancreas di morfologia e impregnazione contrastografica regolari; dotto di Wirsung non dilatato.'),
      P('pancreas.solida', 'Lesione solida', 'Lesione solida [ipovascolare/ipervascolare] a carico [della testa/del corpo/della coda] del pancreas, di [___ mm], [con/senza] dilatazione a monte del dotto di Wirsung.'),
      P('pancreas.cistica', 'Lesione cistica', 'Formazione cistica [uniloculare/multiloculare] a carico [della testa/del corpo/della coda] del pancreas, di [___ mm].'),
      PANCREAS_PANCREATITE,
    ],
    'Milza': [MILZA_NORMA, MILZA_SPLENOMEGALIA, MILZA_LESIONE],
    'Surreni': [
      SURRENI_NORMA,
      SURRENI_NODULO,
      O('surreni.densita', 'Densità nelle fasi', 'Densità del nodulo surrenalico: [___ HU] in fase basale, [___ HU] in fase portale, [___ HU] in fase tardiva.'),
    ],
    'Reni': [
      N('reni.norma', 'Nella norma', 'Reni di dimensioni e morfologia conservate, con regolare impregnazione contrastografica; non dilatazione delle vie escretrici.'),
      RENI_CISTI,
      P('reni.solida', 'Lesione solida', 'Lesione solida renale [destra/sinistra] al [polo superiore/terzo medio/polo inferiore] di [___ mm], a crescita [esofitica/endofitica/mista], con enhancement [omogeneo/disomogeneo] (da [___ HU] in fase basale a [___ HU] dopo mdc).'),
      RENI_CALCOLO,
      RENI_IDRONEFROSI,
    ],
    'Aorta addominale': [AORTA_ADD_NORMA, AORTA_ADD_ANEURISMA],
    'Asse portale': [
      N('portale.norma', 'Pervio', 'Asse spleno-mesenterico-portale pervio.'),
      P('portale.trombosi', 'Trombosi', 'Difetto di riempimento [completo/parziale] [della vena porta/del ramo portale destro/del ramo portale sinistro/della vena mesenterica superiore/della vena splenica], compatibile con trombosi [non neoplastica/neoplastica].'),
    ],
    'Linfonodi': [
      N('linfonodi.norma', 'Non linfoadenopatie', 'Non linfoadenopatie addominali di rilievo dimensionale.'),
      LINFONODI_ADDOME,
    ],
    'Versamento': [
      N('versamento.norma', 'Non versamento', 'Non versamento libero in addome.'),
      VERSAMENTO_LIBERO,
    ],
    'Scheletro': [OSSA_NORMA, OSSA_LESIONE],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame TC dell\'addome senza e con mdc nei limiti della norma.'),
      P('concl.angioma', 'Angioma epatico', 'Lesione epatica al segmento [___] con comportamento contrastografico compatibile con angioma.'),
      P('concl.epatica', 'Lesione epatica', 'Lesione epatica al segmento [___] di [___ mm], a comportamento [ipervascolare/ipovascolare], di natura da definire; da correlare con il quadro clinico-laboratoristico.'),
      P('concl.cisti-renale', 'Lesione cistica renale', 'Lesione cistica renale [destra/sinistra] di [___ mm], categoria Bosniak 2019 [I/II/IIF/III/IV].'),
      P('concl.renale-solida', 'Lesione renale solida', 'Lesione solida renale [destra/sinistra] di [___ mm] con enhancement, di [sospetta/verosimile] natura neoplastica.'),
      P('concl.pancreas', 'Lesione pancreatica', 'Lesione [solida/cistica] del pancreas di [___ mm], di natura da definire.'),
      CONCL_CONFRONTO,
    ],
  }),

  'TC TORACE ADDOME PELVI (STADIAZIONE)': exam('tc-tap', {
    'Tecnica': [TECNICA_TC, CONFRONTO],
    'Neoplasia nota': [
      O('neoplasia.esiti', 'Esiti chirurgici', 'Esiti di [___] per neoplasia [___].'),
      O('neoplasia.lesione', 'Lesione di riferimento', 'Lesione di riferimento in sede [___]: [___ mm] (precedente [___ mm] del [data]).', true),
    ],
    'Parenchima polmonare': [
      N('polmone.norma', 'Nella norma', 'Non noduli né masse polmonari.'),
      POLMONE_NODULO,
      POLMONE_NODULI,
      POLMONE_MASSA,
      POLMONE_ADDENSAMENTO,
      POLMONE_ENFISEMA,
    ],
    'Pleura': [
      N('pleura.norma', 'Non versamento', 'Non versamento pleurico.'),
      PLEURA_VERSAMENTO,
      PLEURA_ISPESSIMENTO,
    ],
    'Fegato': [
      N('fegato.norma', 'Nella norma', 'Fegato privo di lesioni focali.'),
      FEGATO_LESIONE,
      FEGATO_MULTIPLE,
      O('fegato.steatosi', 'Steatosi', 'Diffusa riduzione della densità parenchimale epatica, compatibile con steatosi.', true),
    ],
    'Pancreas': [PANCREAS_NORMA, PANCREAS_LESIONE],
    'Milza': [MILZA_NORMA, MILZA_LESIONE],
    'Surreni': [SURRENI_NORMA, SURRENI_NODULO],
    'Reni': [RENI_NORMA, RENI_CISTI, RENI_SOLIDA],
    'Linfonodi': [
      N('linfonodi.norma', 'Non linfoadenopatie', 'Non linfoadenopatie di significato patologico (asse corto superiore a 10 mm) nelle stazioni toraciche, addominali e pelviche esaminate.'),
      P('linfonodi.adenopatia', 'Linfoadenopatia', 'Linfoadenopatia in sede [___], di [___ mm] in asse corto.'),
      P('linfonodi.multiple', 'Linfoadenopatie multiple', 'Multiple linfoadenopatie [mediastiniche/ilari/addominali/pelviche/in più distretti], la maggiore in sede [___] di [___ mm] in asse corto.'),
    ],
    'Peritoneo': [
      N('peritoneo.norma', 'Nella norma', 'Non versamento libero né segni di carcinosi peritoneale.'),
      VERSAMENTO_LIBERO,
      P('peritoneo.carcinosi', 'Carcinosi', 'Noduli e ispessimenti peritoneali in sede [___], [con/senza] infiltrazione del grande omento, sospetti per carcinosi peritoneale.'),
    ],
    'Organi pelvici': [PELVI_NORMA, PELVI_FORMAZIONE],
    'Scheletro': [
      OSSA_NORMA,
      OSSA_LESIONE,
      P('scheletro.multiple', 'Lesioni multiple', 'Multiple lesioni ossee [litiche/addensanti/miste] a carico [___], la maggiore di [___ mm], da riferire in prima ipotesi a localizzazioni secondarie.'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Non evidenti segni TC di localizzazioni di malattia nei distretti esaminati.'),
      P('concl.secondarismi', 'Localizzazioni secondarie', 'Reperti compatibili con localizzazioni secondarie a carico di [___].'),
      P('concl.linfonodi', 'Linfoadenopatie', 'Linfoadenopatie [___] sospette per localizzazioni di malattia.'),
      P('concl.evoluzione', 'Confronto con precedente', 'Rispetto al precedente esame del [data], [stabilità/riduzione/incremento] dimensionale delle lesioni note, [senza/con] comparsa di nuove lesioni.'),
      P('concl.indeterminato', 'Reperto da definire', 'Reperto [___] di natura da definire, da correlare con il quadro clinico e con eventuali esami precedenti.'),
    ],
  }),

  'TC RACHIDE LOMBOSACRALE': exam('tc-rachide-ls', {
    'Tecnica': [TECNICA_OSSO, CONFRONTO, ARTEFATTI],
    'Allineamento': [
      N('allineamento.norma', 'Conservato', 'Allineamento dei metameri lombosacrali conservato.'),
      P('allineamento.listesi', 'Listesi', '[Anterolistesi/Retrolistesi] di [___] su [___] di [I/II/III/IV] grado, [con/senza] lisi istmica.'),
      P('allineamento.scoliosi', 'Scoliosi', 'Atteggiamento scoliotico [destro-convesso/sinistro-convesso] del rachide lombare.'),
    ],
    'Vertebre': [
      N('vertebre.norma', 'Nella norma', 'Vertebre di altezza e morfologia conservate, senza rime di frattura.'),
      P('vertebre.frattura', 'Frattura somatica', 'Frattura [a cuneo/a biconcavità/da scoppio] del corpo vertebrale di [___], con riduzione in altezza di grado [lieve/moderato/severo], [con/senza] retropulsione del muro posteriore.'),
      P('vertebre.arco', 'Frattura arco posteriore', 'Frattura [del processo trasverso/della lamina/del peduncolo/del processo spinoso] di [___] [a destra/a sinistra/bilateralmente].'),
      VERTEBRA_LESIONE,
    ],
    'Dischi intervertebrali': [
      N('dischi.norma', 'Nella norma', 'Spazi intersomatici di altezza conservata; non evidenti protrusioni o ernie discali ai livelli esaminati.'),
      P('dischi.discopatia', 'Discopatia', 'Discopatia degenerativa a livello [___], con riduzione in altezza dello spazio intersomatico, [con/senza] fenomeno del vuoto discale.'),
      P('dischi.protrusione', 'Protrusione discale', 'Protrusione discale [circonferenziale/a larga base] a livello [___], [con/senza] impronta sul sacco durale.'),
      P('dischi.ernia', 'Ernia discale', 'Ernia discale [mediana/paramediana destra/paramediana sinistra/foraminale destra/foraminale sinistra/extraforaminale] a livello [___], [contenuta/espulsa/migrata], [con/senza] impronta sul sacco durale e sulla radice [___].'),
    ],
    'Canale vertebrale': [
      CANALE_NORMA,
      P('canale.stenosi', 'Stenosi del canale', 'Stenosi [lieve/moderata/severa] del canale vertebrale a livello [___], da [protrusione discale/ipertrofia dei legamenti gialli/artrosi interapofisaria/concorso di più fattori], con diametro antero-posteriore di [___ mm].'),
      FORAMI_STENOSI,
    ],
    'Articolazioni interapofisarie': [
      N('faccette.norma', 'Nella norma', 'Articolazioni interapofisarie senza significative alterazioni degenerative.'),
      P('faccette.artrosi', 'Artrosi interapofisaria', 'Artrosi interapofisaria [lieve/moderata/marcata] a livello [___], [bilaterale/a destra/a sinistra].'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame TC del rachide lombosacrale nei limiti della norma.'),
      P('concl.ernia', 'Ernia discale', 'Ernia discale [mediana/paramediana destra/paramediana sinistra/foraminale destra/foraminale sinistra] a livello [___].'),
      CONCL_STENOSI,
      CONCL_DEGENERATIVE('lombosacrale'),
      P('concl.frattura', 'Frattura vertebrale', 'Frattura [recente/di datazione non determinabile] del corpo vertebrale di [___].'),
      CONCL_CONFRONTO,
    ],
  }),

  'TC BACINO': exam('tc-bacino', {
    'Tecnica': [TECNICA_OSSO, CONFRONTO, ARTEFATTI],
    'Anello pelvico': [
      N('anello.norma', 'Nella norma', 'Anello pelvico in continuità, senza rime di frattura; sinfisi pubica e articolazioni sacro-iliache di ampiezza regolare.'),
      P('anello.frattura', 'Frattura', 'Frattura [composta/scomposta] [della branca ileo-pubica/della branca ischio-pubica/dell\'ala iliaca/della massa laterale del sacro] [destra/sinistra].'),
      P('anello.acetabolo', 'Frattura acetabolare', 'Frattura dell\'acetabolo [destro/sinistro] a carico [della colonna anteriore/della colonna posteriore/della parete anteriore/della parete posteriore/del tetto], [composta/scomposta].'),
      P('anello.diastasi', 'Diastasi', 'Diastasi [della sinfisi pubica/dell\'articolazione sacro-iliaca destra/dell\'articolazione sacro-iliaca sinistra] di [___ mm].'),
      P('anello.lesione', 'Lesione ossea', 'Lesione ossea [litica/addensante/mista] a carico [___], di [___ mm].'),
    ],
    'Femori prossimali': [
      N('femori.norma', 'Nella norma', 'Non rime di frattura a carico dei femori prossimali.'),
      P('femori.collo', 'Frattura del collo', 'Frattura [sottocapitata/transcervicale/basicervicale] del collo femorale [destro/sinistro], [composta/scomposta/ingranata].'),
      P('femori.trocanterica', 'Frattura trocanterica', 'Frattura [pertrocanterica/intertrocanterica/sottotrocanterica] del femore [destro/sinistro], [composta/scomposta].'),
    ],
    'Articolazioni coxo-femorali': [
      N('anche.norma', 'Nella norma', 'Articolazioni coxo-femorali con rapporti conservati e rime articolari di ampiezza regolare.'),
      P('anche.coxartrosi', 'Coxartrosi', 'Coxartrosi [destra/sinistra/bilaterale] di grado [lieve/moderato/marcato], con riduzione della rima articolare, osteofitosi e sclerosi subcondrale.'),
      P('anche.osteonecrosi', 'Osteonecrosi', 'Alterazioni strutturali della testa femorale [destra/sinistra] con [sclerosi a carta geografica/frattura subcondrale/collasso della superficie articolare], compatibili con osteonecrosi.'),
      P('anche.lussazione', 'Lussazione', 'Lussazione [posteriore/anteriore] dell\'anca [destra/sinistra].'),
      P('anche.protesi', 'Protesi d\'anca', 'Esiti di artroprotesi d\'anca [destra/sinistra], con componenti in sede.'),
    ],
    'Tessuti molli': [
      N('molli.norma', 'Nella norma', 'Non ematomi né raccolte nei tessuti molli pelvici e periarticolari.'),
      P('molli.ematoma', 'Ematoma', 'Ematoma [intramuscolare/pelvico extraperitoneale/sottocutaneo] in sede [___], di [___ x ___ mm].'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame TC del bacino nei limiti della norma.'),
      P('concl.frattura', 'Frattura del bacino', 'Frattura [___] [destra/sinistra], [composta/scomposta].'),
      P('concl.femore', 'Frattura femorale', 'Frattura [del collo del femore/pertrocanterica del femore/sottotrocanterica del femore] [destro/sinistro], [composta/scomposta].'),
      P('concl.coxartrosi', 'Coxartrosi', 'Coxartrosi [destra/sinistra/bilaterale] di grado [lieve/moderato/marcato].'),
      P('concl.osteonecrosi', 'Osteonecrosi', 'Quadro compatibile con osteonecrosi della testa femorale [destra/sinistra].'),
      CONCL_CONFRONTO,
    ],
  }),

  'TC COLONNA CERVICALE': exam('tc-rachide-c', {
    'Tecnica': [TECNICA_OSSO, CONFRONTO, ARTEFATTI],
    'Giunzione cranio-cervicale': [
      N('giunzione.norma', 'Nella norma', 'Rapporti atlo-occipitali e atlo-assiali conservati; non rime di frattura di atlante ed epistrofeo.'),
      P('giunzione.dente', 'Frattura del dente', 'Frattura del dente dell\'epistrofeo [all\'apice/alla base/con estensione al corpo di C2], [composta/scomposta].'),
      P('giunzione.atlante', 'Frattura dell\'atlante', 'Frattura dell\'atlante a carico [dell\'arco anteriore/dell\'arco posteriore/delle masse laterali], [con/senza] diastasi delle masse laterali.'),
    ],
    'Allineamento': [
      N('allineamento.norma', 'Conservato', 'Allineamento dei metameri cervicali conservato.'),
      P('allineamento.listesi', 'Listesi', '[Anterolistesi/Retrolistesi] di [___] su [___] di [___ mm].'),
      P('allineamento.lussazione', 'Lussazione faccette', 'Lussazione [monolaterale destra/monolaterale sinistra/bilaterale] delle faccette articolari a livello [___].'),
      O('allineamento.lordosi', 'Rettilineizzazione', 'Rettilineizzazione della fisiologica lordosi cervicale.'),
    ],
    'Vertebre': [
      N('vertebre.norma', 'Nella norma', 'Vertebre di altezza e morfologia conservate, senza rime di frattura dei corpi e degli elementi posteriori.'),
      P('vertebre.frattura', 'Frattura somatica', 'Frattura [a cuneo/da scoppio/a goccia/lineare] del corpo vertebrale di [___], [composta/scomposta], [con/senza] retropulsione di frammenti nel canale vertebrale.'),
      P('vertebre.arco', 'Frattura arco posteriore', 'Frattura [della lamina/del peduncolo/della massa articolare/del processo spinoso/del processo trasverso] di [___] [a destra/a sinistra/bilateralmente], [con/senza] interessamento del forame trasversario.'),
      VERTEBRA_LESIONE,
    ],
    'Dischi intervertebrali': [
      N('dischi.norma', 'Nella norma', 'Spazi intersomatici di altezza conservata; non evidenti ernie discali ai livelli esaminati.'),
      P('dischi.discopatia', 'Discopatia', 'Discopatia degenerativa a livello [___], con riduzione in altezza dello spazio intersomatico, osteofitosi marginale e uncoartrosi.'),
      P('dischi.ernia', 'Ernia discale', 'Ernia discale [mediana/paramediana destra/paramediana sinistra/foraminale destra/foraminale sinistra] a livello [___], con impronta [sul sacco durale/sul profilo anteriore del midollo].'),
    ],
    'Canale vertebrale': [
      CANALE_NORMA,
      P('canale.stenosi', 'Stenosi del canale', 'Stenosi [lieve/moderata/severa] del canale vertebrale a livello [___], con diametro antero-posteriore di [___ mm].'),
      FORAMI_STENOSI,
    ],
    'Tessuti molli prevertebrali': [
      N('prevertebrali.norma', 'Nella norma', 'Tessuti molli prevertebrali di spessore regolare.'),
      P('prevertebrali.ematoma', 'Ematoma', 'Ispessimento dei tessuti molli prevertebrali (fino a [___ mm] a livello [___]), compatibile con ematoma.'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame TC del rachide cervicale nei limiti della norma.'),
      P('concl.frattura', 'Frattura', 'Frattura [___] di [___], [composta/scomposta], [con/senza] interessamento del canale vertebrale.'),
      P('concl.lussazione', 'Lussazione', 'Lussazione [monolaterale/bilaterale] delle faccette articolari a livello [___].'),
      CONCL_DEGENERATIVE('cervicale'),
      CONCL_STENOSI,
      CONCL_CONFRONTO,
    ],
  }),

  'TC ANGIOGRAFIA AORTA': exam('angio-tc-aorta', {
    'Tecnica': [
      N('tecnica', 'Tecnica', 'Angio-TC eseguita con mezzo di contrasto iodato e.v. in fase arteriosa ([___] ml di [prodotto]).'),
      O('tecnica.basale', 'Fase basale', 'Acquisizione preliminare senza mezzo di contrasto.'),
      O('tecnica.ecg', 'Sincronizzazione ECG', 'Acquisizione con sincronizzazione ECG [prospettica/retrospettiva].'),
      O('tecnica.tardiva', 'Fase tardiva', 'Acquisizione aggiuntiva in fase tardiva.'),
      CONFRONTO,
    ],
    'Diametri': [
      N('diametri', 'Diametri aortici', 'Diametri aortici massimi (piani doppio-obliqui): radice [___] mm, aorta ascendente [___] mm, arco [___] mm, aorta discendente [___] mm, sovrarenale [___] mm, infrarenale [___] mm.'),
      O('diametri.iliache', 'Arterie iliache comuni', 'Diametri delle arterie iliache comuni: destra [___] mm, sinistra [___] mm.'),
    ],
    'Calibro aortico': [
      N('calibro.norma', 'Nella norma', 'Aorta toracica e addominale di calibro regolare nei segmenti esaminati.'),
      P('calibro.toracica', 'Dilatazione toracica', 'Dilatazione [ectasica/aneurismatica] dell\'aorta toracica a livello [della radice/del tratto ascendente/dell\'arco/del tratto discendente/del tratto toraco-addominale], con diametro massimo di [___ mm].'),
      P('calibro.addominale', 'Aneurisma addominale', 'Aneurisma [fusiforme/sacciforme] dell\'aorta addominale [sottorenale/iuxtarenale/soprarenale], con diametro massimo di [___ mm], colletto prossimale di lunghezza [___ mm], [con/senza] trombosi murale.'),
      P('calibro.rottura', 'Rottura', 'Ematoma periaortico [mediastinico/retroperitoneale], [con/senza] stravaso di mdc, compatibile con rottura [contenuta/libera].'),
      O('calibro.ateromasia', 'Ateromasia', 'Ateromasia [calcifica/mista] [lieve/moderata/marcata] dell\'aorta toracica e addominale.', true),
    ],
    'Dissezione': [
      N('dissezione.norma', 'Assente', 'Non segni di dissezione né di ematoma intramurale.'),
      P('dissezione.flap', 'Dissezione', 'Dissezione aortica tipo Stanford [A/B], con flap intimale esteso da [___] a [___]; falso lume [pervio/parzialmente trombizzato/trombizzato].'),
      P('dissezione.imh', 'Ematoma intramurale', 'Ematoma intramurale [dell\'aorta ascendente/dell\'arco/dell\'aorta discendente], con spessore parietale massimo di [___ mm].'),
      P('dissezione.pau', 'Ulcera penetrante', 'Ulcera aterosclerotica penetrante [dell\'arco/dell\'aorta discendente/dell\'aorta addominale], con profondità di [___ mm].'),
    ],
    'Rami aortici': [
      N('rami.norma', 'Pervi', 'Tronchi sovraortici, tripode celiaco, arteria mesenterica superiore e arterie renali pervi e di calibro regolare all\'origine.'),
      P('rami.stenosi', 'Stenosi o occlusione', '[Stenosi lieve/Stenosi moderata/Stenosi severa/Occlusione] all\'origine [del tronco anonimo/della carotide comune sinistra/della succlavia sinistra/del tripode celiaco/dell\'arteria mesenterica superiore/dell\'arteria renale destra/dell\'arteria renale sinistra].'),
      P('rami.dissezione', 'Coinvolgimento dissezione', 'Estensione della dissezione [al tronco anonimo/alla carotide comune sinistra/alla succlavia sinistra/al tripode celiaco/all\'arteria mesenterica superiore/all\'arteria renale destra/all\'arteria renale sinistra], con origine dal [vero lume/falso lume].'),
    ],
    'Arterie iliache': [
      N('iliache.norma', 'Nella norma', 'Arterie iliache pervie e di calibro regolare.'),
      P('iliache.aneurisma', 'Aneurisma iliaco', 'Dilatazione aneurismatica dell\'arteria iliaca [comune/interna] [destra/sinistra], con diametro massimo di [___ mm].'),
      P('iliache.stenosi', 'Stenosi o occlusione', '[Stenosi lieve/Stenosi moderata/Stenosi severa/Occlusione] dell\'arteria iliaca [comune/esterna/interna] [destra/sinistra].'),
    ],
    'Endoprotesi': [
      O('endoprotesi.sede', 'Endoprotesi in sede', 'Esiti di trattamento endovascolare con endoprotesi [toracica/aorto-biiliaca/aorto-monoiliaca], in sede e pervia.'),
      O('endoprotesi.endoleak', 'Endoleak', 'Endoleak di tipo [Ia/Ib/II/III/IV], con opacizzazione della sacca aneurismatica in fase [arteriosa/tardiva]; diametro massimo della sacca [___ mm].', true),
    ],
    'Reperti extravascolari': [
      N('extra.norma', 'Nella norma', 'Nei limiti del volume di studio, non alterazioni extravascolari di rilievo.'),
      P('extra.reperto', 'Reperto extravascolare', 'Reperto extravascolare: [___].'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame angio-TC dell\'aorta nei limiti della norma, senza segni di sindrome aortica acuta.'),
      P('concl.dissezione', 'Dissezione', 'Dissezione aortica tipo Stanford [A/B], estesa da [___] a [___].'),
      P('concl.imh', 'Ematoma intramurale', 'Ematoma intramurale dell\'aorta [ascendente/discendente].'),
      P('concl.aneurisma', 'Aneurisma', 'Aneurisma dell\'aorta [toracica/addominale] con diametro massimo di [___ mm].'),
      P('concl.rottura', 'Rottura', 'Quadro compatibile con rottura aortica [contenuta/libera].'),
      P('concl.endoleak', 'Endoleak', 'Endoleak di tipo [Ia/Ib/II/III/IV].'),
      CONCL_CONFRONTO,
    ],
  }),

  'TC ENCEFALO': exam('tc-encefalo', {
    'Tecnica': [
      N('tecnica', 'Tecnica', 'Esame eseguito senza mezzo di contrasto.'),
      O('tecnica.mdc', 'Con mdc', 'Completamento dopo somministrazione e.v. di mezzo di contrasto iodato ([___] ml di [prodotto]).'),
      CONFRONTO,
      O('tecnica.artefatti', 'Artefatti', 'Valutazione parzialmente limitata da artefatti da [movimento/indurimento del fascio in fossa posteriore/materiale metallico].'),
    ],
    'Parenchima encefalico': [
      N('parenchima.norma', 'Nella norma', 'Non alterazioni densitometriche focali del parenchima encefalico sovra- e sottotentoriale.'),
      P('parenchima.ischemia', 'Ischemia acuta', 'Area ipodensa [cortico-sottocorticale/sottocorticale/dei nuclei della base] in territorio [dell\'arteria cerebrale media/dell\'arteria cerebrale anteriore/dell\'arteria cerebrale posteriore/dell\'arteria cerebellare postero-inferiore] [destra/sinistra], con perdita della differenziazione tra sostanza grigia e bianca, compatibile con lesione ischemica [acuta/subacuta].'),
      P('parenchima.ematoma', 'Ematoma', 'Ematoma intraparenchimale [lobare/dei nuclei della base/talamico/cerebellare/pontino] [destro/sinistro] di [___ x ___ mm], [con/senza] edema perilesionale, [con/senza] spandimento intraventricolare.'),
      P('parenchima.esiti', 'Esiti ischemici', 'Area ipodensa [cortico-sottocorticale/lacunare] a densità liquorale in sede [___] [destra/sinistra], compatibile con esito ischemico.'),
      P('parenchima.lesione', 'Lesione espansiva', 'Formazione espansiva [iperdensa/isodensa/ipodensa] in sede [___] [destra/sinistra], di [___ mm], [con/senza] edema perilesionale.'),
      O('parenchima.microangiopatia', 'Microangiopatia', 'Ipodensità della sostanza bianca periventricolare e sottocorticale, compatibili con alterazioni microangiopatiche croniche di grado [lieve/moderato/marcato].', true),
      O('parenchima.acm', 'Arteria iperdensa', 'Iperdensità spontanea dell\'arteria cerebrale media [destra/sinistra], compatibile con trombosi endoluminale.', true),
    ],
    'Spazi extra-assiali': [
      N('extra-assiali.norma', 'Nella norma', 'Non raccolte ematiche extra-assiali né segni di emorragia subaracnoidea.'),
      P('extra-assiali.subdurale', 'Ematoma subdurale', 'Raccolta subdurale [iperdensa/a densità mista/ipodensa] [fronto-parietale/temporale/emisferica] [destra/sinistra], di spessore massimo [___ mm], compatibile con ematoma subdurale [acuto/subacuto/cronico].'),
      P('extra-assiali.extradurale', 'Ematoma extradurale', 'Raccolta ematica extradurale biconvessa [frontale/temporale/parietale/occipitale] [destra/sinistra], di spessore massimo [___ mm].'),
      P('extra-assiali.esa', 'Emorragia subaracnoidea', 'Spandimento ematico subaracnoideo [bilaterale/a destra/a sinistra] [nelle cisterne della base/nei solchi della convessità/nella scissura silviana].'),
    ],
    'Sistema ventricolare': [
      N('ventricoli.norma', 'Nella norma', 'Sistema ventricolare di ampiezza nei limiti della norma per età.'),
      P('ventricoli.idrocefalo', 'Idrocefalo', 'Dilatazione del sistema ventricolare [sovratentoriale/tetraventricolare], [con/senza] segni di riassorbimento transependimale, compatibile con idrocefalo.'),
      P('ventricoli.atrofia', 'Atrofia', 'Ampliamento del sistema ventricolare e degli spazi liquorali periencefalici, compatibile con atrofia cerebrale [lieve/moderata/marcata].'),
      P('ventricoli.emoventricolo', 'Emoventricolo', 'Spandimento ematico intraventricolare [nei corni occipitali/nel III ventricolo/nel IV ventricolo/diffuso].'),
    ],
    'Effetto massa': [
      N('massa.norma', 'Assente', 'Strutture della linea mediana in asse; cisterne della base ben rappresentate.'),
      P('massa.deviazione', 'Deviazione linea mediana', 'Effetto massa con deviazione controlaterale delle strutture della linea mediana di [___ mm] a livello del setto pellucido.'),
      P('massa.erniazione', 'Erniazione', 'Segni di erniazione [sottofalcina/transtentoriale discendente/tonsillare], con [parziale/completa] obliterazione delle cisterne della base.'),
    ],
    'Ossa del cranio': [
      N('ossa.norma', 'Nella norma', 'Non rime di frattura della volta e della base cranica nei segmenti esaminati.'),
      P('ossa.volta', 'Frattura della volta', 'Frattura [lineare/pluriframmentaria/affondata] [dell\'osso frontale/dell\'osso parietale/della squama temporale/dell\'osso occipitale] [a destra/a sinistra].'),
      P('ossa.base', 'Frattura della base', 'Frattura della base cranica a carico [della rocca petrosa/della fossa cranica anteriore/della fossa cranica media/del clivus] [a destra/a sinistra].'),
    ],
    'Tessuti molli extracranici': [
      O('epicranio.ematoma', 'Ematoma epicranico', 'Ematoma epicranico [frontale/parietale/temporale/occipitale] [destro/sinistro].', true),
    ],
    'Seni paranasali': [
      N('seni.norma', 'Nella norma', 'Regolare pneumatizzazione dei seni paranasali e delle celle mastoidee in esame.'),
      P('seni.ispessimento', 'Ispessimento mucoso', 'Ispessimento mucoso [del seno mascellare/dei seni etmoidali/del seno frontale/del seno sfenoidale] [a destra/a sinistra/bilateralmente], [con/senza] livello idro-aereo.'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Non evidenti segni TC di emorragia endocranica né di lesioni ischemiche acute.'),
      P('concl.emorragia', 'Emorragia endocranica', 'Emorragia endocranica [intraparenchimale/subaracnoidea/subdurale/extradurale/intraventricolare] in sede [___], [con/senza] effetto massa.'),
      P('concl.ischemia', 'Lesione ischemica', 'Quadro compatibile con lesione ischemica [acuta/subacuta] in territorio [___] [destra/sinistra].'),
      P('concl.lesione', 'Lesione espansiva', 'Formazione espansiva [___] di natura da definire, [con/senza] effetto massa.'),
      P('concl.frattura', 'Frattura cranica', 'Frattura [___] [con/senza] lesioni endocraniche associate.'),
      P('concl.microangiopatia', 'Microangiopatia cronica', 'Alterazioni microangiopatiche croniche della sostanza bianca di grado [lieve/moderato/marcato], in assenza di evidenti lesioni acute.'),
      O('concl.limite', 'Limite TC precoce', 'Nelle prime ore dall\'esordio dei sintomi l\'esame TC può non evidenziare lesioni ischemiche.'),
    ],
  }),
};
