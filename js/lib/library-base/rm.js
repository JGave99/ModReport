// Libreria predefinita — RMN. BOZZA da validare clinicamente (revisione di 2-3 radiologi prima del lancio).
//
// Note per la revisione:
// - O(..., true) = reperto patologico "in aggiunta": non entra nel referto normale e non sostituisce la
//   frase normale del gruppo perché non la contraddice (es. angioma vertebrale accanto a "corpi vertebrali
//   di altezza e segnale regolari", cisti di Baker accanto a "non versamento articolare");
// - le affermazioni valide solo con il mezzo di contrasto sono opzionali, così il referto normale resta
//   corretto anche per gli esami senza mdc;
// - classificazioni (Modic, Fazekas, ARCO, Meyerding, Outerbridge, LI-RADS, PI-RADS v2.1) solo come liste
//   di scelta compilate dal medico, mai calcolate; nessun punteggio, nessuna raccomandazione di follow-up,
//   biopsia o ulteriori esami legata ai reperti;
// - le conclusioni sono sintesi: non ripetono le frasi dei distretti.
import { N, P, O, exam } from './helpers.js';

export const METODICA = 'RMN';

export const ESAMI = [
  'RMN RACHIDE LOMBOSACRALE',
  'RMN GINOCCHIO',
  'RMN SPALLA',
  'RMN ADDOME SUPERIORE',
  'RMN BACINO',
  'RMN RACHIDE CERVICALE',
  'RMN ENCEFALO',
  'RMN PROSTATA MULTIPARAMETRICA',
];

export const INDICAZIONI = {
  'RMN RACHIDE LOMBOSACRALE': ['Lombalgia', 'Sciatalgia', 'Sospetta ernia discale', 'Lombocruralgia', 'Claudicatio neurogena', 'Controllo post-chirurgico'],
  'RMN GINOCCHIO': ['Gonalgia', 'Trauma', 'Sospetta lesione meniscale', 'Sospetta lesione legamentosa', 'Blocco articolare', 'Controllo post-chirurgico'],
  'RMN SPALLA': ['Dolore', 'Sospetta lesione della cuffia dei rotatori', 'Trauma', 'Instabilità gleno-omerale', 'Limitazione funzionale'],
  'RMN ADDOME SUPERIORE': ['Riscontro incidentale di lesione epatica', 'Studio delle vie biliari', 'Sospetta coledocolitiasi', 'Caratterizzazione di lesione pancreatica', 'Sorveglianza in epatopatia cronica'],
  'RMN BACINO': ['Coxalgia', 'Sospetta necrosi avascolare', 'Trauma', 'Sospetta frattura occulta', 'Dolore trocanterico'],
  'RMN RACHIDE CERVICALE': ['Cervicalgia', 'Cervicobrachialgia', 'Parestesie agli arti superiori', 'Sospetta mielopatia', 'Trauma'],
  'RMN ENCEFALO': ['Cefalea persistente', 'Sospetta lesione ischemica', 'Vertigini', 'Deficit neurologico focale', 'Sospetta malattia demielinizzante', 'Crisi epilettica'],
  'RMN PROSTATA MULTIPARAMETRICA': ['Rialzo del PSA', 'Esplorazione rettale sospetta', 'Pregressa biopsia negativa', 'Sorveglianza attiva', 'Stadiazione locale di neoplasia prostatica'],
};

// Frasi comuni a più esami (exam() le copia e antepone all'ID il codice dell'esame).
const TECNICA_RM = N('tecnica', 'Tecnica', 'Esame eseguito con sequenze multiplanari [senza/senza e con] mezzo di contrasto paramagnetico e.v.');
const ARTEFATTI = O('tecnica.artefatti', 'Artefatti da movimento', 'Esame parzialmente limitato da artefatti da movimento.');
const CONFRONTO = O('tecnica.confronto', 'Confronto', 'Confronto con precedente esame RM del [data].');
const CONCL_CONFRONTO = O('concl.confronto', 'Confronto', 'Quadro [invariato/in miglioramento/in peggioramento] rispetto al precedente esame del [data].');

export const REFERTI = {
  'RMN RACHIDE LOMBOSACRALE': exam('rm-rachide-ls', {
    'Tecnica': [TECNICA_RM, ARTEFATTI, CONFRONTO],
    'Allineamento': [
      N('allineamento.norma', 'Nella norma', 'Lordosi lombare fisiologica; allineamento dei metameri lombosacrali conservato.'),
      P('allineamento.lordosi', 'Lordosi alterata', '[Riduzione/Inversione/Accentuazione] della fisiologica lordosi lombare.'),
      P('allineamento.scoliosi', 'Atteggiamento scoliotico', 'Atteggiamento scoliotico del tratto lombare a convessità [destra/sinistra].'),
      P('allineamento.anterolistesi', 'Anterolistesi', 'Anterolistesi di [L3 su L4/L4 su L5/L5 su S1] di grado [I/II/III/IV] secondo Meyerding, [su base degenerativa/da spondilolisi istmica].'),
      P('allineamento.retrolistesi', 'Retrolistesi', 'Retrolistesi di [L2 su L3/L3 su L4/L4 su L5/L5 su S1] di [___ mm].'),
    ],
    'Corpi vertebrali': [
      N('corpi.norma', 'Nella norma', 'Corpi vertebrali di altezza e segnale regolari, senza alterazioni focali del midollo osseo.'),
      P('corpi.modic', 'Alterazioni Modic', 'Alterazioni del segnale del midollo osseo dei piatti vertebrali adiacenti al disco [L1-L2/L2-L3/L3-L4/L4-L5/L5-S1], di [tipo 1/tipo 2/tipo 3] secondo Modic.'),
      P('corpi.cedimento', 'Cedimento somatico', 'Deformità [a cuneo/a biconcavità] del corpo vertebrale di [___], con riduzione in altezza di [___ mm], [con/senza] edema del midollo osseo.'),
      P('corpi.lesione', 'Lesione focale', 'Lesione focale del corpo vertebrale di [___], di [___ mm], con segnale [iperintenso/ipointenso/disomogeneo] nelle sequenze T2 pesate, di natura da definire.'),
      O('corpi.angioma', 'Angioma vertebrale', 'Angioma vertebrale tipico nel corpo di [___].', true),
      O('corpi.osteofitosi', 'Osteofitosi marginale', 'Osteofitosi marginale anteriore e laterale [lieve/moderata/marcata] del tratto lombare.', true),
    ],
    'Dischi intervertebrali': [
      N('dischi.norma', 'Nella norma', 'Dischi intervertebrali di segnale e altezza conservati ai livelli esaminati.'),
      P('dischi.discopatia', 'Discopatia degenerativa', 'Disidratazione del disco intervertebrale [L1-L2/L2-L3/L3-L4/L4-L5/L5-S1], con [lieve/moderata/marcata] riduzione di altezza, da riferire a discopatia degenerativa.'),
      P('dischi.protrusione', 'Protrusione discale', 'Protrusione discale [circonferenziale/a larga base posteriore/mediana/paramediana destra/paramediana sinistra] a livello [L3-L4/L4-L5/L5-S1], [con/senza] impronta sul sacco durale.'),
      P('dischi.ernia', 'Ernia discale', 'Ernia discale [mediana/paramediana destra/paramediana sinistra/foraminale destra/foraminale sinistra/extraforaminale destra/extraforaminale sinistra] a livello [L3-L4/L4-L5/L5-S1], [contenuta/estrusa/migrata], con impronta sul sacco durale.'),
    ],
    'Canale vertebrale e forami': [
      N('canale.norma', 'Nella norma', 'Canale vertebrale di ampiezza conservata, privo di stenosi significative; forami di coniugazione liberi, senza conflitti disco-radicolari.'),
      P('canale.stenosi', 'Stenosi del canale', 'Stenosi [lieve/moderata/severa] del canale vertebrale a livello [L2-L3/L3-L4/L4-L5/L5-S1], con diametro antero-posteriore del sacco durale di [___ mm], da [protrusione discale/ipertrofia dei legamenti gialli/artrosi interapofisaria/concorso di più fattori].'),
      P('canale.recesso', 'Stenosi del recesso laterale', 'Stenosi del recesso laterale [destro/sinistro/bilaterale] di grado [lieve/moderato/severo] a livello [L3-L4/L4-L5/L5-S1].'),
      P('canale.foraminale', 'Stenosi foraminale', 'Stenosi foraminale [destra/sinistra/bilaterale] di grado [lieve/moderato/severo] a livello [L3-L4/L4-L5/L5-S1].'),
      P('canale.conflitto', 'Conflitto radicolare', 'Conflitto con la radice [L4/L5/S1] [destra/sinistra], che appare [dislocata/compressa/ispessita].'),
      O('canale.cisti', 'Cisti sinoviale', 'Cisti [sinoviale/del legamento giallo] in sede [intraspinale/foraminale] a livello [L3-L4/L4-L5/L5-S1], di [___ mm].', true),
    ],
    'Articolazioni interapofisarie': [
      N('faccette.norma', 'Nella norma', 'Articolazioni interapofisarie senza significative alterazioni degenerative.'),
      P('faccette.artrosi', 'Artrosi interapofisaria', 'Artrosi interapofisaria [lieve/moderata/marcata] a livello [L3-L4/L4-L5/L5-S1], [bilaterale/a destra/a sinistra], [con/senza] versamento articolare.'),
      O('faccette.legamenti', 'Ipertrofia legamenti gialli', 'Ipertrofia dei legamenti gialli a livello [L3-L4/L4-L5/L5-S1].', true),
    ],
    'Cono midollare': [
      N('cono.norma', 'Nella norma', 'Cono midollare in sede regolare, di calibro e segnale conservati; radici della cauda equina nei limiti.'),
      P('cono.basso', 'Cono in sede bassa', 'Cono midollare in posizione bassa, con terminazione a livello [L2-L3/L3-L4/L4-L5].'),
      P('cono.segnale', 'Alterazione di segnale', 'Area di iperintensità di segnale nelle sequenze T2 pesate del cono midollare, estesa per [___ mm].'),
    ],
    'Parti molli': [
      N('molli.norma', 'Nella norma', 'Muscolatura paravertebrale e tessuti molli del campo di vista senza alterazioni di segnale significative.'),
      P('molli.atrofia', 'Atrofia muscolare', 'Atrofia con infiltrazione adiposa della muscolatura paravertebrale [lieve/moderata/marcata] a livello [L3-L4/L4-L5/L5-S1].'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame RM del rachide lombosacrale nei limiti della norma.'),
      P('concl.ernia', 'Ernia discale', 'Ernia discale [mediana/paramediana destra/paramediana sinistra/foraminale destra/foraminale sinistra] a livello [L3-L4/L4-L5/L5-S1].'),
      P('concl.stenosi', 'Stenosi del canale', 'Stenosi del canale vertebrale lombare di grado [lieve/moderato/severo] a livello [___].'),
      P('concl.degenerative', 'Alterazioni degenerative', 'Alterazioni degenerative disco-artrosiche del rachide lombosacrale, prevalenti a livello [___].'),
      P('concl.listesi', 'Listesi', 'Listesi [degenerativa/istmica] di [L3/L4/L5] su [L4/L5/S1].'),
    ],
  }),

  'RMN GINOCCHIO': exam('rm-ginocchio', {
    'Tecnica': [TECNICA_RM, ARTEFATTI, CONFRONTO],
    'Menisco mediale': [
      N('mediale.norma', 'Nella norma', 'Menisco mediale di morfologia e segnale regolari, senza lesioni che raggiungono la superficie articolare.'),
      P('mediale.lesione', 'Lesione', 'Lesione del menisco mediale a carico [del corno posteriore/del corpo/del corno anteriore], di tipo [orizzontale/verticale/radiale/a manico di secchio/complesso].'),
      P('mediale.degenerazione', 'Degenerazione intrameniscale', 'Alterazione di segnale intrameniscale del menisco mediale a carico [del corno posteriore/del corpo/del corno anteriore], che non raggiunge la superficie articolare, da riferire a degenerazione mucoide.'),
    ],
    'Menisco laterale': [
      N('laterale.norma', 'Nella norma', 'Menisco laterale di morfologia e segnale regolari, senza lesioni che raggiungono la superficie articolare.'),
      P('laterale.lesione', 'Lesione', 'Lesione del menisco laterale a carico [del corno posteriore/del corpo/del corno anteriore], di tipo [orizzontale/verticale/radiale/a manico di secchio/complesso].'),
      P('laterale.degenerazione', 'Degenerazione intrameniscale', 'Alterazione di segnale intrameniscale del menisco laterale a carico [del corno posteriore/del corpo/del corno anteriore], che non raggiunge la superficie articolare, da riferire a degenerazione mucoide.'),
      O('laterale.cisti', 'Cisti parameniscale', 'Cisti parameniscale laterale di [___ mm], in rapporto con [il corno posteriore/il corpo/il corno anteriore].', true),
    ],
    'Legamento crociato anteriore': [
      N('lca.norma', 'Nella norma', 'Legamento crociato anteriore in continuità, di decorso e segnale regolari.'),
      P('lca.completa', 'Lesione completa', 'Lesione completa del legamento crociato anteriore, con discontinuità delle fibre a carico del terzo [prossimale/medio/distale].'),
      P('lca.parziale', 'Lesione parziale', 'Lesione parziale del legamento crociato anteriore, con ispessimento e iperintensità di segnale delle fibre a carico del terzo [prossimale/medio/distale].'),
      P('lca.esiti', 'Esiti di ricostruzione', 'Esiti di ricostruzione del legamento crociato anteriore, con neolegamento [in continuità/di segnale disomogeneo/non riconoscibile].'),
    ],
    'Legamento crociato posteriore': [
      N('lcp.norma', 'Nella norma', 'Legamento crociato posteriore in continuità, di decorso e segnale regolari.'),
      P('lcp.lesione', 'Lesione', 'Lesione [parziale/completa] del legamento crociato posteriore, a carico del terzo [prossimale/medio/distale].'),
    ],
    'Legamenti collaterali': [
      N('collaterali.norma', 'Nella norma', 'Legamenti collaterali mediale e laterale in continuità, di segnale regolare.'),
      P('collaterali.mediale', 'Collaterale mediale', 'Distorsione del legamento collaterale mediale di grado [1/2/3], con iperintensità di segnale intra- e perilegamentosa.'),
      P('collaterali.laterale', 'Collaterale laterale', 'Distorsione del legamento collaterale laterale e dell\'angolo postero-laterale di grado [1/2/3].'),
    ],
    'Apparato estensore': [
      N('estensore.norma', 'Nella norma', 'Tendini quadricipitale e rotuleo in continuità, di segnale regolare; rotula in sede, con regolare rapporto femoro-rotuleo.'),
      P('estensore.tendinopatia', 'Tendinopatia', 'Tendinopatia [del tendine rotuleo/del tendine quadricipitale], con ispessimento e iperintensità di segnale intratendinea.'),
      P('estensore.lesione', 'Lesione tendinea', 'Lesione [parziale/completa] [del tendine rotuleo/del tendine quadricipitale].'),
      P('estensore.lateralizzazione', 'Lateralizzazione rotulea', 'Lateralizzazione della rotula, [con/senza] displasia trocleare.'),
    ],
    'Cartilagine': [
      N('cartilagine.norma', 'Nella norma', 'Cartilagine articolare di spessore e segnale regolari nei compartimenti femoro-tibiali e femoro-rotuleo.'),
      P('cartilagine.condropatia', 'Condropatia', 'Condropatia del compartimento [femoro-tibiale mediale/femoro-tibiale laterale/femoro-rotuleo] di grado [I/II/III/IV] secondo Outerbridge.'),
      P('cartilagine.difetto', 'Difetto focale', 'Difetto cartilagineo focale a carico [del condilo femorale mediale/del condilo femorale laterale/del piatto tibiale mediale/del piatto tibiale laterale/della rotula/della troclea], di [___ mm].'),
      P('cartilagine.gonartrosi', 'Gonartrosi', 'Gonartrosi con osteofitosi marginale e riduzione dello spessore cartilagineo, prevalente nel compartimento [femoro-tibiale mediale/femoro-tibiale laterale/femoro-rotuleo].'),
    ],
    'Osso spongioso': [
      N('osso.norma', 'Nella norma', 'Segnale del midollo osseo di femore distale, tibia prossimale e rotula nei limiti, senza edema né lesioni focali.'),
      P('osso.edema', 'Edema del midollo osseo', 'Edema del midollo osseo [subcondrale/di tipo contusivo] a carico [del condilo femorale mediale/del condilo femorale laterale/del piatto tibiale mediale/del piatto tibiale laterale/della rotula], esteso per [___ mm].'),
      P('osso.rima', 'Rima di frattura', 'Rima lineare ipointensa di frattura [subcondrale/da stress] a carico [del condilo femorale mediale/del condilo femorale laterale/del piatto tibiale mediale/del piatto tibiale laterale/della rotula], con edema perilesionale.'),
      P('osso.osteocondrale', 'Lesione osteocondrale', 'Lesione osteocondrale a carico [del condilo femorale mediale/del condilo femorale laterale/della troclea], di [___ mm], con frammento [stabile/instabile].'),
    ],
    'Versamento': [
      N('versamento.norma', 'Nella norma', 'Non versamento articolare.'),
      P('versamento.articolare', 'Versamento articolare', 'Versamento articolare [lieve/moderato/abbondante], [con/senza] ispessimento sinoviale.'),
      O('versamento.baker', 'Cisti di Baker', 'Cisti di Baker di [___ x ___ mm] nel cavo popliteo.', true),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame RM del ginocchio nei limiti della norma.'),
      P('concl.menisco', 'Lesione meniscale', 'Lesione del menisco [mediale/laterale] a carico del [corno posteriore/corpo/corno anteriore].'),
      P('concl.crociato', 'Lesione crociato', 'Lesione [parziale/completa] del legamento crociato [anteriore/posteriore].'),
      P('concl.collaterale', 'Distorsione collaterale', 'Distorsione del legamento collaterale [mediale/laterale] di grado [1/2/3].'),
      P('concl.gonartrosi', 'Gonartrosi', 'Quadro di gonartrosi [lieve/moderata/marcata] con condropatia prevalente nel compartimento [femoro-tibiale mediale/femoro-tibiale laterale/femoro-rotuleo].'),
      P('concl.edema', 'Edema osseo', 'Edema del midollo osseo di [___], compatibile con [contusione ossea/sovraccarico funzionale/frattura da stress].'),
    ],
  }),

  'RMN SPALLA': exam('rm-spalla', {
    'Tecnica': [TECNICA_RM, ARTEFATTI, CONFRONTO],
    'Sovraspinoso': [
      N('sovraspinoso.norma', 'Integro', 'Tendine del sovraspinoso in continuità, di spessore e segnale regolari.'),
      P('sovraspinoso.tendinosi', 'Tendinosi', 'Tendinosi del sovraspinoso, con ispessimento e iperintensità di segnale intratendinea, senza discontinuità delle fibre.'),
      P('sovraspinoso.parziale', 'Lesione parziale', 'Lesione parziale del tendine del sovraspinoso a carico della superficie [articolare/bursale/intrasostanza], di [___ mm].'),
      P('sovraspinoso.completa', 'Lesione a tutto spessore', 'Lesione a tutto spessore del tendine del sovraspinoso, estesa per [___ mm] in senso antero-posteriore, con retrazione del moncone tendineo di [___ mm].'),
    ],
    'Sottospinoso e piccolo rotondo': [
      N('sottospinoso.norma', 'Integri', 'Tendini del sottospinoso e del piccolo rotondo in continuità, di segnale regolare.'),
      P('sottospinoso.tendinosi', 'Tendinosi', 'Tendinosi del sottospinoso, con ispessimento e iperintensità di segnale intratendinea.'),
      P('sottospinoso.lesione', 'Lesione', 'Lesione [parziale/a tutto spessore] del tendine del sottospinoso, di [___ mm].'),
    ],
    'Sottoscapolare': [
      N('sottoscapolare.norma', 'Integro', 'Tendine del sottoscapolare in continuità, di spessore e segnale regolari.'),
      P('sottoscapolare.tendinosi', 'Tendinosi', 'Tendinosi del sottoscapolare, con ispessimento e iperintensità di segnale intratendinea.'),
      P('sottoscapolare.lesione', 'Lesione', 'Lesione [parziale/a tutto spessore] del tendine del sottoscapolare a carico [del terzo superiore/dei due terzi superiori/dell\'intero tendine].'),
    ],
    'Muscoli della cuffia': [
      N('muscoli.norma', 'Nella norma', 'Ventri muscolari della cuffia dei rotatori di volume e segnale regolari.'),
      P('muscoli.atrofia', 'Atrofia muscolare', 'Atrofia con infiltrazione adiposa del [sovraspinoso/sottospinoso/sottoscapolare] di grado [lieve/moderato/marcato].'),
    ],
    'Capo lungo del bicipite': [
      N('bicipite.norma', 'Nella norma', 'Capo lungo del bicipite in sede nella doccia bicipitale, di segnale regolare.'),
      P('bicipite.tendinopatia', 'Tendinopatia', 'Tendinopatia del capo lungo del bicipite, con [ispessimento/assottigliamento] e iperintensità di segnale, [con/senza] fluido nella guaina tendinea.'),
      P('bicipite.sublussazione', 'Sublussazione', 'Sublussazione [mediale/intra-articolare] del capo lungo del bicipite rispetto alla doccia bicipitale.'),
      P('bicipite.rottura', 'Rottura', 'Rottura del capo lungo del bicipite, con doccia bicipitale vuota e moncone retratto di [___ mm].'),
    ],
    'Labbro glenoideo': [
      N('labbro.norma', 'Nella norma', 'Labbro glenoideo di morfologia e segnale regolari.'),
      P('labbro.lesione', 'Lesione del labbro', 'Lesione del labbro glenoideo a carico del quadrante [antero-inferiore/postero-inferiore/antero-superiore/postero-superiore], [con/senza] distacco dal margine glenoideo.'),
      P('labbro.slap', 'Lesione SLAP', 'Lesione del labbro glenoideo superiore (SLAP) con estensione [anteriore/posteriore/anteriore e posteriore] all\'ancora bicipitale.'),
      O('labbro.cisti', 'Cisti paralabrale', 'Cisti paralabrale in sede [antero-inferiore/postero-inferiore/postero-superiore], di [___ mm].', true),
    ],
    'Articolazione gleno-omerale': [
      N('glenomerale.norma', 'Nella norma', 'Cavità articolare gleno-omerale senza versamento; capsula e legamenti gleno-omerali di spessore e segnale regolari.'),
      P('glenomerale.versamento', 'Versamento', 'Versamento articolare gleno-omerale [lieve/moderato/marcato].'),
    ],
    'Capo omerale e glena': [
      N('ossa.norma', 'Nella norma', 'Segnale del midollo osseo di testa omerale e glena nei limiti, senza edema né lesioni focali.'),
      P('ossa.edema', 'Edema del midollo osseo', 'Edema del midollo osseo [della testa omerale/della glena/del trochite] di tipo [contusivo/da sovraccarico], esteso per [___ mm].'),
      P('ossa.hillsachs', 'Impronta di Hill-Sachs', 'Impronta di Hill-Sachs sul versante postero-superiore della testa omerale, profonda [___ mm].'),
    ],
    'Borsa subacromiale': [
      N('borsa.norma', 'Nella norma', 'Borsa subacromiale-subdeltoidea priva di versamento.'),
      P('borsa.borsite', 'Borsite', 'Distensione fluida della borsa subacromiale-subdeltoidea, con spessore massimo di [___ mm].'),
    ],
    'Acromion-claveare': [
      N('acromion.norma', 'Nella norma', 'Articolazione acromion-claveare di ampiezza conservata, senza segni di artropatia; spazio subacromiale libero.'),
      P('acromion.artropatia', 'Artropatia acromion-claveare', 'Artropatia acromion-claveare con osteofitosi e ispessimento capsulare, con [lieve/moderata/marcata] impronta sulla cuffia dei rotatori.'),
      P('acromion.morfologia', 'Morfologia acromiale', 'Acromion di morfologia [curva/uncinata], con riduzione dello spazio subacromiale.'),
      O('acromion.os', 'Os acromiale', 'Os acromiale di tipo [pre-acromion/meso-acromion/meta-acromion].', true),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame RM della spalla nei limiti della norma.'),
      P('concl.lesione', 'Lesione di cuffia', 'Lesione [parziale/a tutto spessore] del tendine del [sovraspinoso/sottospinoso/sottoscapolare].'),
      P('concl.tendinopatia', 'Tendinopatia di cuffia', 'Tendinopatia della cuffia dei rotatori a carico del [sovraspinoso/sottospinoso/sottoscapolare].'),
      P('concl.bicipite', 'Capo lungo del bicipite', 'Interessamento del capo lungo del bicipite: [tendinopatia/sublussazione/rottura].'),
      P('concl.labbro', 'Lesione labbro', 'Lesione del labbro glenoideo [antero-inferiore/postero-inferiore/superiore].'),
      P('concl.conflitto', 'Conflitto subacromiale', 'Quadro di conflitto subacromiale con [borsite/artropatia acromion-claveare/morfologia acromiale sfavorevole].'),
    ],
  }),

  'RMN ADDOME SUPERIORE': exam('rm-addome-sup', {
    'Tecnica': [
      TECNICA_RM,
      O('tecnica.colangio', 'Colangio-RM', 'Studio colangio-RM con sequenze T2 pesate tridimensionali.'),
      ARTEFATTI,
    ],
    'Fegato': [
      N('fegato.norma', 'Nella norma', 'Fegato di dimensioni e intensità di segnale nei limiti, privo di lesioni focali.'),
      P('fegato.lesione', 'Lesione focale', 'Lesione focale epatica al segmento [___] di [___ mm], [ipointensa/isointensa/iperintensa] in T1 e [ipointensa/isointensa/iperintensa] in T2, di natura da definire.'),
      P('fegato.cisti', 'Lesione cistica', 'Lesione cistica epatica al segmento [___] di [___ mm], a segnale fluido, [con/senza] setti e [con/senza] componente solida captante.'),
      P('fegato.angioma', 'Angioma', 'Lesione al segmento [___] di [___ mm], marcatamente iperintensa in T2, con enhancement periferico nodulare e riempimento centripeto, compatibile con angioma.'),
      P('fegato.multiple', 'Lesioni multiple', 'Multiple lesioni focali epatiche [in entrambi i lobi/nel lobo destro/nel lobo sinistro], la maggiore al segmento [___] di [___ mm].'),
      P('fegato.steatosi', 'Steatosi', 'Calo di segnale nelle sequenze in opposed-phase rispetto alle sequenze in-phase, compatibile con steatosi epatica [lieve/moderata/marcata].'),
      P('fegato.epatopatia', 'Epatopatia cronica', 'Profilo epatico irregolare e lobulato, con rimaneggiamento del parenchima e ipertrofia relativa del lobo caudato, compatibile con epatopatia cronica.'),
      O('fegato.lirads', 'Categoria LI-RADS', 'Categoria LI-RADS: [LR-1/LR-2/LR-3/LR-4/LR-5/LR-M/LR-TIV].', true),
    ],
    'Colecisti': [
      N('colecisti.norma', 'Nella norma', 'Colecisti normodistesa, a pareti sottili, senza calcoli.'),
      P('colecisti.litiasi', 'Litiasi', 'Litiasi colecistica [singola/multipla], con calcolo maggiore di [___ mm].'),
      P('colecisti.parete', 'Ispessimento parietale', 'Ispessimento parietale della colecisti di [___ mm], [con/senza] liquido pericolecistico.'),
    ],
    'Vie biliari': [
      N('vie.norma', 'Non dilatate', 'Vie biliari intra- ed extraepatiche non dilatate.'),
      P('vie.dilatazione', 'Dilatazione', 'Dilatazione delle vie biliari [intraepatiche/extraepatiche/intra- ed extraepatiche], con coledoco del calibro di [___ mm].'),
      P('vie.calcolo', 'Difetto di riempimento', 'Difetto di riempimento endoluminale del coledoco [prossimale/medio/distale] di [___ mm], compatibile con calcolo.'),
      P('vie.stenosi', 'Restringimento', 'Restringimento del dotto [epatico comune/epatico destro/epatico sinistro/coledoco] per un tratto di [___ mm], con dilatazione a monte.'),
    ],
    'Pancreas': [
      N('pancreas.norma', 'Nella norma', 'Pancreas di dimensioni e segnale regolari; dotto di Wirsung non dilatato.'),
      P('pancreas.cistica', 'Lesione cistica', 'Lesione cistica del pancreas a carico [della testa/del processo uncinato/del collo/del corpo/della coda], di [___ mm], [uniloculare/multiloculare], [con/senza] comunicazione con il dotto principale.'),
      P('pancreas.solida', 'Lesione solida', 'Lesione solida del pancreas a carico [della testa/del processo uncinato/del collo/del corpo/della coda], di [___ mm], [ipointensa/isointensa] in T1, [con/senza] dilatazione a monte del dotto di Wirsung.'),
      P('pancreas.wirsung', 'Dilatazione del Wirsung', 'Dilatazione del dotto di Wirsung, con calibro massimo di [___ mm].'),
    ],
    'Milza': [
      N('milza.norma', 'Nella norma', 'Milza di dimensioni e segnale nei limiti della norma.'),
      P('milza.splenomegalia', 'Splenomegalia', 'Splenomegalia, con diametro longitudinale di [___ cm].'),
      P('milza.lesione', 'Lesione focale', 'Lesione focale splenica di [___ mm], con segnale [fluido/tissutale/disomogeneo].'),
    ],
    'Reni e surreni': [
      N('reni.norma', 'Nella norma', 'Reni e surreni di morfologia e segnale regolari.'),
      P('reni.cisti', 'Lesione cistica renale', 'Lesione cistica renale [destra/sinistra] di [___ mm], a segnale fluido, [con/senza] setti.'),
      P('reni.solida', 'Lesione solida renale', 'Lesione solida renale [destra/sinistra] al [polo superiore/terzo medio/polo inferiore] di [___ mm].'),
      P('reni.surrene', 'Nodulo surrenalico', 'Nodulo surrenalico [destro/sinistro] di [___ mm], [con/senza] calo di segnale nelle sequenze in opposed-phase.'),
    ],
    'Linfonodi': [
      N('linfonodi.norma', 'Non linfoadenopatie', 'Non linfoadenopatie di rilievo dimensionale nelle stazioni linfonodali esaminate.'),
      P('linfonodi.aumentati', 'Linfonodi aumentati', 'Linfonodi di dimensioni aumentate in sede [___], il maggiore con asse corto di [___ mm].'),
    ],
    'Versamento': [
      N('versamento.norma', 'Non versamento', 'Non versamento libero in addome.'),
      P('versamento.libero', 'Versamento libero', 'Versamento fluido libero [periepatico/perisplenico/diffuso] di [minima/modesta/abbondante] entità.'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame RM dell\'addome superiore nei limiti della norma.'),
      P('concl.epatica', 'Lesione epatica', 'Lesione epatica focale di [___ mm] al segmento [___], con caratteristiche [compatibili con cisti/compatibili con angioma/di natura da definire].'),
      P('concl.steatosi', 'Steatosi epatica', 'Steatosi epatica [lieve/moderata/marcata].'),
      P('concl.biliare', 'Dilatazione biliare', 'Dilatazione delle vie biliari [intraepatiche/extraepatiche/intra- ed extraepatiche] da [coledocolitiasi/stenosi/causa non determinata].'),
      P('concl.pancreas', 'Lesione pancreatica', 'Lesione [cistica/solida] del pancreas di [___ mm], di natura da definire.'),
      P('concl.litiasi', 'Litiasi biliare', 'Litiasi [colecistica/della via biliare principale/colecistica e della via biliare principale].'),
      CONCL_CONFRONTO,
    ],
  }),

  'RMN BACINO': exam('rm-bacino', {
    'Tecnica': [TECNICA_RM, ARTEFATTI, CONFRONTO],
    'Teste femorali': [
      N('teste.norma', 'Nella norma', 'Teste femorali di segnale conservato, senza segni di necrosi avascolare.'),
      P('teste.osteonecrosi', 'Osteonecrosi', 'Area di alterazione di segnale subcondrale della testa femorale [destra/sinistra/bilaterale], delimitata da una banda ipointensa periferica, compatibile con osteonecrosi, stadio ARCO [I/II/III/IV].'),
      P('teste.collasso', 'Collasso subcondrale', 'Frattura subcondrale con collasso della superficie articolare della testa femorale [destra/sinistra], con depressione di [___ mm].'),
      P('teste.edema', 'Edema transitorio', 'Edema del midollo osseo della testa e del collo femorale [destro/sinistro], senza area di necrosi definita.'),
    ],
    'Midollo osseo e ossa del bacino': [
      N('ossa.norma', 'Nella norma', 'Segnale del midollo osseo delle ossa del bacino e dei femori prossimali nei limiti, senza edema né lesioni focali.'),
      P('ossa.edema', 'Edema del midollo osseo', 'Edema del midollo osseo a carico [del collo femorale/della regione trocanterica/dell\'ala iliaca/dell\'acetabolo/del ramo ileo-pubico/del ramo ischio-pubico], lato [destro/sinistro], esteso per [___ mm].'),
      P('ossa.frattura', 'Frattura occulta', 'Rima lineare ipointensa con edema perilesionale, compatibile con frattura [del collo femorale/della regione trocanterica/del ramo ileo-pubico/del ramo ischio-pubico/del sacro] [destra/sinistra].'),
      P('ossa.lesione', 'Lesione focale', 'Lesione focale del midollo osseo a carico [del bacino/del femore prossimale/del sacro], lato [destro/sinistro], di [___ mm], di natura da definire.'),
      O('ossa.enostosi', 'Isola ossea', 'Isola ossea (enostosi) in sede [___], di [___ mm].', true),
    ],
    'Articolazioni coxo-femorali': [
      N('anche.norma', 'Nella norma', 'Articolazioni coxo-femorali con rapporti conservati, spazio articolare di ampiezza regolare e cartilagine di spessore conservato.'),
      P('anche.versamento', 'Versamento articolare', 'Versamento articolare coxo-femorale [destro/sinistro/bilaterale] di [minima/modesta/abbondante] entità.'),
      P('anche.coxartrosi', 'Coxartrosi', 'Coxartrosi [destra/sinistra/bilaterale] con riduzione dello spazio articolare, osteofitosi e sclerosi subcondrale, di grado [lieve/moderato/marcato].'),
      P('anche.labbro', 'Lesione del labbro', 'Lesione del labbro acetabolare [destro/sinistro] a livello [antero-superiore/postero-superiore/antero-inferiore], [con/senza] cisti paralabrale.'),
      P('anche.fai', 'Conflitto femoro-acetabolare', 'Perdita dell\'offset della giunzione testa-collo femorale [destra/sinistra], compatibile con conflitto femoro-acetabolare di tipo [cam/pincer/misto].'),
    ],
    'Regione trocanterica': [
      N('trocanteri.norma', 'Nella norma', 'Tendini dei glutei medio e piccolo, borse trocanteriche e tessuti molli periarticolari privi di alterazioni di segnale.'),
      P('trocanteri.borsite', 'Borsite trocanterica', 'Borsite trocanterica [destra/sinistra/bilaterale], con distensione fluida della borsa.'),
      P('trocanteri.tendinopatia', 'Tendinopatia glutea', 'Tendinopatia dei glutei medio e piccolo [destra/sinistra/bilaterale], con iperintensità di segnale intratendinea.'),
      P('trocanteri.lesione', 'Lesione tendinea', 'Lesione [parziale/completa] del tendine del [gluteo medio/gluteo piccolo] [destro/sinistro].'),
    ],
    'Sacro-iliache e sinfisi': [
      N('sacroiliache.norma', 'Nella norma', 'Articolazioni sacro-iliache e sinfisi pubica di ampiezza e segnale regolari.'),
      P('sacroiliache.edema', 'Edema sacro-iliaco', 'Edema subcondrale dell\'articolazione sacro-iliaca [destra/sinistra/bilaterale], [con/senza] erosioni.'),
      P('sacroiliache.sinfisi', 'Edema della sinfisi', 'Edema della sinfisi pubica e dei capi ossei adiacenti, [con/senza] versamento.'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame RM del bacino nei limiti della norma.'),
      P('concl.osteonecrosi', 'Osteonecrosi', 'Osteonecrosi della testa femorale [destra/sinistra/bilaterale], stadio ARCO [I/II/III/IV].'),
      P('concl.frattura', 'Frattura occulta', 'Frattura [occulta/da stress] del [collo femorale/ramo ileo-pubico/ramo ischio-pubico/sacro], lato [destro/sinistro].'),
      P('concl.coxartrosi', 'Coxartrosi', 'Coxartrosi [destra/sinistra/bilaterale] di grado [lieve/moderato/marcato].'),
      P('concl.trocanterica', 'Sindrome trocanterica', 'Sindrome dolorosa trocanterica [destra/sinistra/bilaterale] da [borsite/tendinopatia dei glutei/borsite e tendinopatia dei glutei].'),
      CONCL_CONFRONTO,
    ],
  }),

  'RMN RACHIDE CERVICALE': exam('rm-rachide-c', {
    'Tecnica': [TECNICA_RM, ARTEFATTI, CONFRONTO],
    'Allineamento': [
      N('allineamento.norma', 'Nella norma', 'Lordosi cervicale fisiologica; allineamento dei metameri cervicali conservato.'),
      P('allineamento.rettilineizzazione', 'Rettilineizzazione', 'Rettilineizzazione della fisiologica lordosi cervicale.'),
      P('allineamento.inversione', 'Inversione della lordosi', 'Inversione della lordosi cervicale con cifosi segmentaria a livello [C3-C4/C4-C5/C5-C6/C6-C7].'),
      P('allineamento.listesi', 'Listesi', '[Anterolistesi/Retrolistesi] di [___] su [___] di [___ mm].'),
    ],
    'Corpi vertebrali': [
      N('corpi.norma', 'Nella norma', 'Corpi vertebrali cervicali di altezza e segnale regolari, senza alterazioni focali del midollo osseo.'),
      P('corpi.modic', 'Alterazioni Modic', 'Alterazioni del segnale del midollo osseo dei piatti vertebrali adiacenti al disco [C3-C4/C4-C5/C5-C6/C6-C7], di [tipo 1/tipo 2/tipo 3] secondo Modic.'),
      P('corpi.lesione', 'Lesione focale', 'Lesione focale del corpo vertebrale di [___], di [___ mm], con segnale [iperintenso/ipointenso/disomogeneo] nelle sequenze T2 pesate, di natura da definire.'),
      P('corpi.cedimento', 'Cedimento somatico', 'Deformità [a cuneo/a biconcavità] del corpo vertebrale di [___], con riduzione in altezza di [___ mm], [con/senza] edema del midollo osseo.'),
      O('corpi.angioma', 'Angioma vertebrale', 'Angioma vertebrale tipico nel corpo di [___].', true),
    ],
    'Dischi intervertebrali': [
      N('dischi.norma', 'Nella norma', 'Dischi intervertebrali cervicali di segnale e altezza conservati.'),
      P('dischi.discopatia', 'Discopatia degenerativa', 'Disidratazione del disco intervertebrale [C2-C3/C3-C4/C4-C5/C5-C6/C6-C7], con [lieve/moderata/marcata] riduzione di altezza, da riferire a discopatia degenerativa.'),
      P('dischi.protrusione', 'Protrusione discale', 'Protrusione discale [mediana/paramediana destra/paramediana sinistra/a larga base] a livello [C3-C4/C4-C5/C5-C6/C6-C7], con impronta sul sacco durale.'),
      P('dischi.ernia', 'Ernia discale', 'Ernia discale [mediana/paramediana destra/paramediana sinistra/foraminale destra/foraminale sinistra] a livello [C3-C4/C4-C5/C5-C6/C6-C7], [contenuta/estrusa/migrata].'),
      O('dischi.uncoartrosi', 'Uncoartrosi', 'Uncoartrosi con osteofitosi uncovertebrale [destra/sinistra/bilaterale] a livello [C3-C4/C4-C5/C5-C6/C6-C7].', true),
    ],
    'Canale vertebrale e forami': [
      N('canale.norma', 'Nella norma', 'Canale vertebrale di ampiezza conservata, privo di stenosi significative; forami di coniugazione liberi.'),
      P('canale.stenosi', 'Stenosi del canale', 'Stenosi [lieve/moderata/severa] del canale vertebrale a livello [C3-C4/C4-C5/C5-C6/C6-C7], con diametro antero-posteriore del sacco durale di [___ mm].'),
      P('canale.foraminale', 'Stenosi foraminale', 'Stenosi foraminale [destra/sinistra/bilaterale] di grado [lieve/moderato/severo] a livello [C3-C4/C4-C5/C5-C6/C6-C7].'),
      P('canale.conflitto', 'Conflitto radicolare', 'Conflitto con la radice [C5/C6/C7/C8] [destra/sinistra], che appare [dislocata/compressa/ispessita].'),
      P('canale.ollp', 'Ossificazione legamento', 'Ossificazione del legamento longitudinale posteriore a livello [___], con riduzione del diametro del canale a [___ mm].'),
    ],
    'Midollo spinale': [
      N('midollo.norma', 'Nella norma', 'Midollo spinale cervicale di calibro e segnale regolari.'),
      P('midollo.impronta', 'Impronta sul midollo', 'Impronta sul midollo spinale a livello [C3-C4/C4-C5/C5-C6/C6-C7], con [appiattimento/deformazione a mezzaluna] del profilo midollare.'),
      P('midollo.segnale', 'Alterazione di segnale', 'Area di iperintensità di segnale nelle sequenze T2 pesate del midollo spinale a livello [C2-C3/C3-C4/C4-C5/C5-C6/C6-C7], estesa per [___ mm].'),
      P('midollo.siringomielia', 'Cavità siringomielica', 'Cavità siringomielica intramidollare estesa da [___] a [___], di calibro massimo [___ mm].'),
    ],
    'Parti molli': [
      N('molli.norma', 'Nella norma', 'Tessuti molli prevertebrali, legamenti e muscolatura paravertebrale cervicale senza alterazioni di segnale.'),
      P('molli.prevertebrali', 'Edema prevertebrale', 'Edema dei tessuti molli prevertebrali, con spessore massimo di [___ mm] a livello [___].'),
      P('molli.legamenti', 'Alterazione legamentosa', 'Alterazione di segnale del legamento [longitudinale anteriore/longitudinale posteriore/interspinoso/nucale], compatibile con distorsione.'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame RM del rachide cervicale nei limiti della norma.'),
      P('concl.ernia', 'Ernia discale', 'Ernia discale [mediana/paramediana destra/paramediana sinistra/foraminale destra/foraminale sinistra] a livello [C3-C4/C4-C5/C5-C6/C6-C7].'),
      P('concl.stenosi', 'Stenosi del canale', 'Stenosi del canale vertebrale cervicale di grado [lieve/moderato/severo] a livello [___].'),
      P('concl.midollo', 'Compressione midollare', 'Compressione del midollo cervicale a livello [___], [con/senza] alterazione di segnale intramidollare.'),
      P('concl.degenerative', 'Alterazioni degenerative', 'Alterazioni degenerative disco-artrosiche del rachide cervicale, prevalenti a livello [___].'),
      P('concl.radicolare', 'Conflitto disco-radicolare', 'Conflitto disco-radicolare a livello [___] con interessamento della radice [C5/C6/C7/C8] [destra/sinistra].'),
      CONCL_CONFRONTO,
    ],
  }),

  'RMN ENCEFALO': exam('rm-encefalo', {
    'Tecnica': [
      TECNICA_RM,
      O('tecnica.sequenze', 'Sequenze', 'Studio comprendente sequenze T2 pesate, FLAIR, diffusione (DWI con mappa ADC) e sequenze sensibili alla suscettività magnetica.'),
      O('tecnica.angio', 'Angio-RM', 'Completamento con angio-RM dei vasi intracranici con tecnica [time-of-flight/con mezzo di contrasto].'),
      ARTEFATTI,
    ],
    'Parenchima encefalico': [
      N('parenchima.norma', 'Nella norma', 'Non alterazioni di segnale focali del parenchima encefalico sovra- e sottotentoriale.'),
      P('parenchima.vascolari', 'Lesioni vascolari', 'Lesioni iperintense nelle sequenze T2/FLAIR della sostanza bianca sottocorticale e periventricolare, di probabile natura vascolare, di grado Fazekas [1/2/3].'),
      P('parenchima.demielinizzanti', 'Lesioni demielinizzanti', 'Lesioni ovalari iperintense nelle sequenze T2/FLAIR in sede [periventricolare/iuxtacorticale/infratentoriale/periventricolare e iuxtacorticale], in numero di [___], la maggiore di [___ mm], di aspetto compatibile con lesioni demielinizzanti.'),
      P('parenchima.malacia', 'Esiti ischemici', 'Area di gliosi e malacia in sede [___] [destra/sinistra], di [___ mm], da riferire a esiti ischemici.'),
      P('parenchima.espansiva', 'Lesione espansiva', 'Formazione espansiva in sede [___] [destra/sinistra], di [___ x ___ mm], con segnale [disomogeneo/solido/prevalentemente cistico], [con/senza] edema perilesionale.'),
      P('parenchima.emorragia', 'Emorragia', 'Area di emorragia intraparenchimale in sede [___] [destra/sinistra], di [___ mm], in fase [iperacuta/acuta/subacuta/cronica].'),
      P('parenchima.microemorragie', 'Microemorragie', 'Focolai puntiformi di ipointensità di segnale nelle sequenze T2*/SWI in sede [lobare/profonda/infratentoriale], in numero di [___], compatibili con microemorragie.'),
    ],
    'Diffusione': [
      N('diffusione.norma', 'Nella norma', 'Non aree di restrizione della diffusione.'),
      P('diffusione.ischemia', 'Ischemia acuta', 'Area [destra/sinistra] di restrizione della diffusione, con ipointensità nella mappa ADC, in territorio [dell\'arteria cerebrale media/dell\'arteria cerebrale anteriore/dell\'arteria cerebrale posteriore/del circolo posteriore], di [___ mm], compatibile con lesione ischemica acuta.'),
      P('diffusione.multiple', 'Aree multiple', 'Multiple aree di restrizione della diffusione in [più territori vascolari/uno stesso territorio vascolare], la maggiore di [___ mm].'),
    ],
    'Dopo mezzo di contrasto': [
      O('mdc.norma', 'Non enhancement', 'Non aree di anomala impregnazione contrastografica del parenchima e delle meningi.'),
      O('mdc.enhancement', 'Enhancement', 'Impregnazione contrastografica [lineare/nodulare/ad anello/diffusa] in sede [___], di [___ mm].', true),
    ],
    'Sistema ventricolare': [
      N('ventricoli.norma', 'Nella norma', 'Sistema ventricolare in asse, di ampiezza nei limiti della norma per età.'),
      P('ventricoli.idrocefalo', 'Dilatazione ventricolare', 'Dilatazione del sistema ventricolare [sovratentoriale/tetraventricolare], [con/senza] iperintensità periventricolare nelle sequenze T2/FLAIR.'),
      P('ventricoli.atrofia', 'Atrofia', 'Ampliamento degli spazi liquorali periencefalici e del sistema ventricolare, compatibile con atrofia cerebrale [lieve/moderata/marcata].'),
      P('ventricoli.deviazione', 'Deviazione linea mediana', 'Deviazione controlaterale delle strutture della linea mediana di [___ mm], con compressione del sistema ventricolare omolaterale.'),
    ],
    'Spazi extra-assiali': [
      N('extra.norma', 'Nella norma', 'Spazi liquorali extra-assiali e cisterne della base di ampiezza regolare, senza raccolte extra-assiali.'),
      P('extra.raccolta', 'Raccolta extra-assiale', 'Raccolta [subdurale/epidurale] [destra/sinistra] di spessore massimo [___ mm], con segnale [iperintenso/isointenso/ipointenso] in T1.'),
    ],
    'Fossa cranica posteriore': [
      N('fossa.norma', 'Nella norma', 'Tronco encefalico, cervelletto e giunzione cranio-cervicale di morfologia e segnale regolari.'),
      P('fossa.tonsille', 'Discesa tonsillare', 'Discesa delle tonsille cerebellari al di sotto del forame magno di [___ mm].'),
    ],
    'Seni paranasali': [
      O('seni.norma', 'Nella norma', 'Seni paranasali e celle mastoidee ben pneumatizzati, senza ispessimenti mucosali.'),
      O('seni.ispessimento', 'Ispessimento mucoso', 'Ispessimento mucoso [del seno mascellare/dei seni etmoidali/del seno frontale/del seno sfenoidale] [a destra/a sinistra/bilateralmente].', true),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame RM dell\'encefalo nei limiti della norma.'),
      P('concl.vascolare', 'Alterazioni vascolari', 'Alterazioni della sostanza bianca di probabile natura vascolare, di grado Fazekas [1/2/3].'),
      P('concl.ischemia', 'Lesione ischemica acuta', 'Lesione ischemica acuta [destra/sinistra] in territorio [dell\'arteria cerebrale media/dell\'arteria cerebrale anteriore/dell\'arteria cerebrale posteriore/del circolo posteriore].'),
      P('concl.demielinizzante', 'Aspetto demielinizzante', 'Lesioni della sostanza bianca di aspetto compatibile con malattia demielinizzante, localizzate in sede [periventricolare/iuxtacorticale/infratentoriale].'),
      P('concl.espansiva', 'Formazione espansiva', 'Formazione espansiva in sede [___] di [___ mm], di natura da definire.'),
      P('concl.atrofia', 'Atrofia cerebrale', 'Atrofia cerebrale [lieve/moderata/marcata].'),
      CONCL_CONFRONTO,
    ],
  }),

  'RMN PROSTATA MULTIPARAMETRICA': exam('rm-prostata', {
    'Tecnica': [
      N('tecnica', 'Tecnica', 'Esame eseguito con sequenze T2 pesate multiplanari e sequenze di diffusione (DWI con mappa ADC) [senza/con] studio dinamico dopo mezzo di contrasto paramagnetico e.v.'),
      O('tecnica.bobina', 'Bobina', 'Studio eseguito con bobina [phased-array di superficie/endorettale].'),
      O('tecnica.artefatti', 'Artefatti', 'Esame parzialmente limitato da artefatti da [movimento/gas intestinale/materiale metallico].'),
    ],
    'Ghiandola prostatica': [
      N('ghiandola.norma', 'Nella norma', 'Ghiandola prostatica di dimensioni e morfologia regolari.'),
      P('ghiandola.ipertrofia', 'Ipertrofia', 'Ipertrofia della zona di transizione, con aspetto nodulare, [con/senza] protrusione intravescicale del lobo medio.'),
      O('ghiandola.volume', 'Dimensioni e volume', 'Dimensioni della ghiandola: [___ x ___ x ___ mm], volume stimato di [___ cc].'),
      O('ghiandola.cisti', 'Cisti prostatica', 'Cisti prostatica in sede [___], di [___ mm].', true),
    ],
    'Zona periferica': [
      N('zp.norma', 'Nella norma', 'Zona periferica di segnale omogeneamente iperintenso in T2, senza aree di restrizione della diffusione.'),
      P('zp.lesione', 'Lesione', 'Lesione della zona periferica a livello [della base/del terzo medio/dell\'apice], in sede [posteriore/postero-laterale/antero-laterale/anteriore] [destra/sinistra], di [___ mm], [ipointensa/lievemente ipointensa/isointensa] in T2, [con/senza] restrizione della diffusione (valore ADC [___]) e [con/senza] precoce enhancement nello studio dinamico. Categoria PI-RADS v2.1: [1/2/3/4/5].'),
      P('zp.ulteriore', 'Ulteriore lesione', 'Ulteriore lesione della zona periferica a livello [della base/del terzo medio/dell\'apice], in sede [posteriore/postero-laterale/antero-laterale/anteriore] [destra/sinistra], di [___ mm]. Categoria PI-RADS v2.1: [1/2/3/4/5].'),
      P('zp.diffusa', 'Alterazioni diffuse', 'Aree di ipointensità di segnale T2 a chiazze nella zona periferica, [con/senza] restrizione della diffusione, senza lesione focale definita.'),
    ],
    'Zona di transizione': [
      N('zt.norma', 'Nella norma', 'Zona di transizione di segnale e morfologia regolari, senza lesioni focali.'),
      P('zt.lesione', 'Lesione', 'Lesione della zona di transizione a livello [della base/del terzo medio/dell\'apice], in sede [anteriore/posteriore] [destra/sinistra], di [___ mm], [omogeneamente/non omogeneamente] ipointensa in T2, a margini [circoscritti/sfumati], [con/senza] restrizione della diffusione (valore ADC [___]). Categoria PI-RADS v2.1: [1/2/3/4/5].'),
      O('zt.noduli', 'Noduli ipertrofici', 'Noduli ipertrofici ben capsulati della zona di transizione, con segnale [prevalentemente ghiandolare/prevalentemente stromale].', true),
    ],
    'Capsula': [
      N('capsula.norma', 'Nella norma', 'Capsula prostatica regolare, senza segni di estensione extraprostatica; fasci neurovascolari simmetrici.'),
      P('capsula.contatto', 'Contatto capsulare', 'Contatto della lesione con la capsula prostatica per [___ mm], [con/senza] irregolarità del profilo capsulare.'),
      P('capsula.estensione', 'Estensione extraprostatica', 'Segni di estensione extraprostatica a livello [della base/del terzo medio/dell\'apice], lato [destro/sinistro], con [interruzione del profilo capsulare/slargamento del fascio neurovascolare/obliterazione dell\'angolo retto-prostatico].'),
    ],
    'Vescicole seminali': [
      N('vescicole.norma', 'Nella norma', 'Vescicole seminali simmetriche, di segnale e morfologia regolari.'),
      P('vescicole.alterazione', 'Alterazione di segnale', 'Alterazione di segnale e ispessimento parietale [della vescicola seminale destra/della vescicola seminale sinistra/di entrambe le vescicole seminali], con ipointensità in T2.'),
    ],
    'Collo vescicale e retto': [
      N('collo.norma', 'Nella norma', 'Collo vescicale e parete rettale anteriore regolari, con piani di clivaggio conservati.'),
      P('collo.clivaggio', 'Obliterazione del clivaggio', 'Obliterazione del piano di clivaggio con [il collo vescicale/la parete rettale anteriore/lo sfintere uretrale esterno].'),
    ],
    'Linfonodi': [
      N('linfonodi.norma', 'Non linfoadenopatie', 'Non linfoadenopatie di rilievo dimensionale nelle stazioni linfonodali esaminate.'),
      P('linfonodi.aumentati', 'Linfonodi aumentati', 'Linfonodi di dimensioni aumentate in sede [otturatoria/iliaca interna/iliaca esterna/presacrale/inguinale] [destra/sinistra/bilaterale], il maggiore con asse corto di [___ mm].'),
    ],
    'Ossa': [
      N('ossa.norma', 'Nella norma', 'Strutture ossee del bacino incluse nel campo di vista prive di alterazioni di segnale focali.'),
      P('ossa.lesione', 'Lesione ossea', 'Lesione focale ossea a carico di [___], di [___ mm], ipointensa in T1, [con/senza] restrizione della diffusione.'),
    ],
    'Conclusioni': [
      N('concl.norma', 'Nella norma', 'Esame RM della prostata senza lesioni focali nelle zone periferica e di transizione.'),
      P('concl.lesione', 'Lesione prostatica', 'Lesione della zona [periferica/di transizione] in sede [___], di [___ mm], categoria PI-RADS v2.1 [1/2/3/4/5].'),
      P('concl.ipertrofia', 'Ipertrofia prostatica', 'Ipertrofia prostatica con volume ghiandolare di [___ cc].'),
      P('concl.estensione', 'Estensione extraprostatica', 'Estensione extraprostatica [focale/estesa], [con/senza] interessamento delle vescicole seminali.'),
      P('concl.linfonodi', 'Linfonodi pelvici', 'Linfonodi pelvici di dimensioni aumentate in sede [___].'),
      P('concl.ossa', 'Lesione ossea', 'Lesione ossea focale a carico di [___].'),
      CONCL_CONFRONTO,
    ],
  }),
};
