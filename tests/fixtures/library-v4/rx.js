// Libreria predefinita — RX. BOZZA da validare clinicamente (revisione di 2-3 radiologi prima del lancio).
import { N, P, O, exam } from './helpers.js';

export const METODICA = 'RX';

export const ESAMI = [
  'RX TORACE 2PR',
  'RX TORACE AP supino',
  'RX ADDOME',
  'RX RACHIDE LOMBOSACRALE',
  'RX BACINO',
  'RX GINOCCHIO',
  'RX SPALLA',
  'RX POLSO',
  'RX CAVIGLIA',
  'RX RACHIDE CERVICALE',
  'RX MANO',
  'RX PIEDE',
];

export const INDICAZIONI = {
  'RX TORACE 2PR': ['Tosse persistente', 'Dispnea', 'Dolore toracico', 'Follow-up oncologico', 'Inquadramento preoperatorio', 'Febbre', 'Sospetta polmonite', 'Trauma toracico'],
  'RX TORACE AP supino': ['Controllo post-procedurale', 'Paziente non collaborante', 'Monitoraggio in reparto', 'Controllo dei presidi', 'Insufficienza respiratoria', 'Febbre'],
  'RX ADDOME': ['Dolore addominale', 'Sospetta occlusione', 'Ricerca corpo estraneo', 'Sospetta perforazione', 'Stipsi ostinata', 'Colica renale'],
  'RX RACHIDE LOMBOSACRALE': ['Lombalgia', 'Trauma', 'Sospetto cedimento vertebrale', 'Lombosciatalgia', 'Osteoporosi', 'Controllo post-chirurgico'],
  'RX BACINO': ['Trauma', 'Coxalgia', 'Sospetta coxartrosi', 'Caduta accidentale', "Controllo protesi d'anca"],
  'RX GINOCCHIO': ['Trauma', 'Gonalgia', 'Sospetta gonartrosi', 'Tumefazione articolare', 'Controllo protesi di ginocchio'],
  'RX SPALLA': ['Trauma', 'Dolore', 'Limitazione funzionale', 'Sospetta lussazione', 'Controllo post-riduzione'],
  'RX POLSO': ['Trauma', 'Dolore', 'Controllo in apparecchio gessato', 'Sospetta frattura dello scafoide', 'Controllo post-chirurgico'],
  'RX CAVIGLIA': ['Trauma', 'Dolore', 'Trauma distorsivo', 'Controllo in apparecchio gessato', 'Controllo post-chirurgico'],
  'RX RACHIDE CERVICALE': ['Trauma', 'Cervicalgia', 'Cervicobrachialgia', 'Trauma distorsivo', 'Limitazione funzionale'],
  'RX MANO': ['Trauma', 'Dolore', 'Tumefazione articolare', 'Sospetta artropatia infiammatoria', 'Ricerca corpo estraneo'],
  'RX PIEDE': ['Trauma', 'Dolore', 'Alluce valgo', 'Metatarsalgia', 'Ricerca corpo estraneo'],
};

export const REFERTI = {
  'RX TORACE 2PR': exam('rx-torace-2p', {
    'Parenchima': [
      N('parenchima.norma', 'Nella norma', 'Non addensamenti parenchimali a focolaio.'),
      P('parenchima.addensamento', 'Addensamento', 'Addensamento parenchimale [sede], da correlare con il quadro clinico-laboratoristico.'),
      P('parenchima.atelettasia', 'Atelettasia', 'Opacità [lamellare/segmentaria/lobare] [sede], da riferire in prima ipotesi ad atelettasia.'),
      P('parenchima.nodulo', 'Nodulo', 'Opacità nodulare [sede] di circa [___ mm], a margini [regolari/irregolari/sfumati].'),
      O('parenchima.strie', 'Strie', 'Strie [fibrotiche/disventilatorie] [sede].', true),
    ],
    'Interstizio e circolo': [
      N('circolo.norma', 'Nella norma', 'Trama interstiziale e disegno vascolare polmonare nei limiti della norma.'),
      P('circolo.interstizio', 'Accentuazione interstizio', 'Accentuazione della trama interstiziale [diffusa/a prevalenza basale/a prevalenza perilare].'),
      P('circolo.congestione', 'Congestione', 'Ridistribuzione del disegno vascolare verso i campi polmonari superiori, compatibile con congestione del piccolo circolo.'),
      P('circolo.edema', 'Edema', 'Ispessimento dei setti interlobulari (linee B di Kerley) e cuffie peribronchiali [con/senza] opacità alveolari perilari, compatibili con edema polmonare.'),
    ],
    'Versamento pleurico': [
      N('versamento.norma', 'Assente', 'Non versamento pleurico bilateralmente.'),
      P('versamento.presente', 'Versamento', 'Versamento pleurico [destro/sinistro/bilaterale] di [minima/modesta/moderata/abbondante] entità.'),
      P('versamento.seno', 'Seno obliterato', 'Obliterazione del seno costofrenico [destro/sinistro/bilaterale], da riferire a [minimo versamento/esiti pleurici].'),
    ],
    'Pneumotorace': [
      N('pnx.norma', 'Assente', 'Non segni di pneumotorace.'),
      P('pnx.presente', 'PNX', "Pneumotorace [destro/sinistro] con falda aerea di [___ mm] [all'apice/in sede laterale]."),
    ],
    'Cuore': [
      N('cuore.norma', 'Nella norma', 'Ombra cardiaca di dimensioni e morfologia nei limiti della norma.'),
      P('cuore.ingrandito', 'Cardiomegalia', "Ingrandimento [lieve/moderato/marcato] dell'ombra cardiaca."),
    ],
    'Mediastino': [
      N('mediastino.norma', 'Nella norma', 'Mediastino in asse, di ampiezza regolare.'),
      P('mediastino.slargato', 'Slargamento', "Slargamento dell'ombra mediastinica [superiore/in toto], da correlare con il quadro clinico."),
      P('mediastino.dislocato', 'Dislocazione', 'Dislocazione del mediastino e della trachea verso [destra/sinistra].'),
      O('mediastino.aorta', 'Aorta ateromasica', 'Aorta toracica elongata, con calcificazioni parietali ateromasiche.', true),
    ],
    'Diaframma': [
      N('diaframma.norma', 'Nella norma', 'Emidiaframmi in sede, a profili regolari.'),
      P('diaframma.sopraelevato', 'Sopraelevazione', "Sopraelevazione dell'emidiaframma [destro/sinistro]."),
      P('diaframma.iperinsufflazione', 'Iperinsufflazione', 'Appiattimento degli emidiaframmi e ampliamento dello spazio aereo retrosternale, compatibili con iperinsufflazione polmonare.'),
    ],
    'Scheletro': [
      N('scheletro.norma', 'Nella norma', 'Non evidenti lesioni ossee focali a carico dello scheletro toracico in esame.'),
      P('scheletro.frattura-costale', 'Frattura costale', "Frattura [composta/scomposta] dell'arco [anteriore/laterale/posteriore] della [___] costa [destra/sinistra]."),
      P('scheletro.cedimento', 'Cedimento vertebrale', 'Riduzione in altezza del corpo vertebrale di [___], compatibile con cedimento somatico.'),
      O('scheletro.spondilosi', 'Spondilosi dorsale', 'Alterazioni degenerative spondilosiche del rachide dorsale.', true),
    ],
    'Presidi': [
      O('presidi.pacemaker', 'Pacemaker', 'Pacemaker con generatore in regione pettorale [sinistra/destra] ed elettrocateteri con estremità in proiezione [___].'),
      O('presidi.port', 'Port', 'Catetere venoso centrale tipo port con reservoir in regione pettorale [destra/sinistra] ed estremità in proiezione [della vena cava superiore/della giunzione cavo-atriale].'),
      O('presidi.sternotomia', 'Esiti di sternotomia', 'Esiti di sternotomia mediana con fili metallici di cerchiaggio sternale.'),
    ],
  }),

  'RX TORACE AP supino': exam('rx-torace-ap', {
    'Parenchima': [
      N('parenchima.norma', 'Nella norma', 'Non evidenti addensamenti parenchimali focali, con i limiti intrinseci della proiezione singola in AP.'),
      P('parenchima.addensamento', 'Addensamento', 'Addensamento parenchimale [sede], da correlare con il quadro clinico-laboratoristico.'),
      P('parenchima.atelettasia', 'Atelettasia', 'Opacità [lamellare/segmentaria/lobare] [sede], da riferire in prima ipotesi ad atelettasia.'),
      P('parenchima.ipoespansione', 'Ipoespansione basale', 'Ridotta espansione delle basi polmonari con strie disventilatorie [bilaterali/a destra/a sinistra].'),
    ],
    'Interstizio e circolo': [
      N('circolo.norma', 'Nella norma', 'Disegno vascolare polmonare nei limiti, per quanto valutabile in clinostatismo.'),
      P('circolo.congestione', 'Congestione', 'Accentuazione del disegno vascolare e interstiziale, compatibile con congestione del piccolo circolo.'),
      P('circolo.edema', 'Edema', 'Opacità alveolari confluenti a distribuzione perilare bilaterale, compatibili con edema polmonare.'),
    ],
    'Versamento pleurico': [
      N('versamento.norma', 'Assente', 'Non evidenti segni di versamento pleurico, con i limiti della proiezione in clinostatismo.'),
      P('versamento.presente', 'Versamento', "Velatura [dell'emitorace destro/dell'emitorace sinistro/di entrambi gli emitoraci] con disegno vascolare visibile, compatibile con versamento pleurico declive."),
    ],
    'Pneumotorace': [
      N('pnx.norma', 'Assente', 'Non segni di pneumotorace apprezzabili nella proiezione in clinostatismo.'),
      P('pnx.presente', 'PNX', "Pneumotorace [destro/sinistro] con falda aerea di [___ mm] [all'apice/in sede laterale]."),
      P('pnx.solco', 'Solco profondo', 'Iperdiafania del seno costofrenico [destro/sinistro] (segno del solco profondo), sospetta per pneumotorace anteriore.'),
      O('pnx.enfisema', 'Enfisema sottocutaneo', 'Enfisema dei tessuti molli sottocutanei [della parete toracica destra/della parete toracica sinistra/del collo].', true),
    ],
    'Cuore': [
      N('cuore.norma', 'Nella norma', 'Ombra cardiaca di dimensioni nei limiti, per quanto valutabile in proiezione AP.'),
      P('cuore.ingrandito', 'Cardiomegalia', "Ombra cardiaca ingrandita, pur considerando l'effetto di magnificazione della proiezione AP."),
    ],
    'Mediastino': [
      N('mediastino.norma', 'Nella norma', 'Mediastino in asse.'),
      P('mediastino.slargato', 'Slargamento', "Slargamento dell'ombra mediastinica [superiore/in toto], da correlare con il quadro clinico."),
      P('mediastino.dislocato', 'Dislocazione', 'Dislocazione del mediastino e della trachea verso [destra/sinistra].'),
    ],
    'Presidi': [
      O('presidi.cvc', 'CVC', 'CVC [giugulare/succlavio] [destro/sinistro] con estremità in proiezione [della vena cava superiore/della giunzione cavo-atriale].'),
      O('presidi.picc', 'PICC', "PICC dall'arto superiore [destro/sinistro] con estremità in proiezione [della vena cava superiore/della giunzione cavo-atriale]."),
      O('presidi.sng', 'SNG', 'SNG con decorso lungo la linea mediana, oltre il diaframma, con estremità in proiezione gastrica.'),
      O('presidi.tubo', 'Tubo endotracheale', 'Tubo endotracheale con estremità a [___] cm dalla carena.'),
      O('presidi.drenaggio', 'Drenaggio toracico', 'Drenaggio toracico [destro/sinistro] con estremità in proiezione [apicale/medio-basale].'),
    ],
  }),

  'RX ADDOME': exam('rx-addome', {
    'Anse intestinali': [
      N('anse.norma', 'Nella norma', 'Regolare distribuzione del gas intestinale, senza distensione delle anse.'),
      P('anse.tenue', 'Distensione del tenue', 'Distensione gassosa di anse del tenue, con calibro massimo di circa [___ mm].'),
      P('anse.colon', 'Distensione del colon', 'Distensione gassosa del colon, con calibro massimo di circa [___ mm] a livello [del cieco/del trasverso/del sigma].'),
      P('anse.ileo', 'Distensione diffusa', 'Distensione gassosa diffusa di anse del tenue e del colon, da riferire in prima ipotesi a ileo adinamico.'),
    ],
    'Livelli idroaerei': [
      N('livelli.norma', 'Assenti', 'Non evidenza di livelli idroaerei significativi.'),
      P('livelli.presenti', 'Livelli idroaerei', 'Livelli idroaerei [del tenue/colici/del tenue e colici] in sede [___].'),
    ],
    'Aria libera': [
      N('aria.norma', 'Assente', 'Non evidenza di aria libera sottodiaframmatica nella proiezione in ortostatismo.'),
      P('aria.pneumoperitoneo', 'Pneumoperitoneo', 'Falce aerea sottodiaframmatica [destra/sinistra/bilaterale], compatibile con pneumoperitoneo.'),
    ],
    'Contenuto fecale': [
      N('feci.norma', 'Nella norma', 'Contenuto fecale del colon nei limiti della norma.'),
      P('feci.coprostasi', 'Coprostasi', "Abbondante contenuto fecale [nel colon/nel colon destro/nell'ampolla rettale], come da coprostasi."),
      P('feci.fecaloma', 'Fecaloma', "Voluminosa formazione a contenuto fecale [nell'ampolla rettale/nel sigma], compatibile con fecaloma."),
    ],
    'Calcificazioni': [
      N('calcificazioni.norma', 'Assenti', 'Non calcificazioni patologiche in proiezione addominale.'),
      P('calcificazioni.urinario', 'Calcolo urinario', "Immagine calcifica di circa [___ mm] in proiezione [dell'area renale destra/dell'area renale sinistra/del decorso ureterale destro/del decorso ureterale sinistro/vescicale], compatibile con calcolo."),
      P('calcificazioni.biliare', 'Calcoli biliari', "Immagini calcifiche in proiezione dell'area colecistica, compatibili con calcoli biliari radiopachi."),
      O('calcificazioni.vascolari', 'Calcificazioni vascolari', "Calcificazioni parietali ateromasiche [dell'aorta addominale/degli assi iliaci/dell'aorta addominale e degli assi iliaci].", true),
      O('calcificazioni.fleboliti', 'Fleboliti', 'Fleboliti in sede pelvica.'),
    ],
    'Corpi estranei': [
      O('corpi-estranei.assenti', 'Assenti', 'Non evidenti corpi estranei radiopachi.'),
      O('corpi-estranei.presente', 'Corpo estraneo', 'Immagine radiopaca di circa [___ mm] in proiezione [sede], compatibile con corpo estraneo.', true),
    ],
    'Profili ossei': [
      N('ossa.norma', 'Nella norma', 'Profili ossei del bacino e del rachide in esame nella norma.'),
      P('ossa.degenerative', 'Alterazioni degenerative', 'Alterazioni degenerative spondiloartrosiche del rachide lombare in esame.'),
    ],
  }),

  'RX RACHIDE LOMBOSACRALE': exam('rx-rachide-ls', {
    'Curve': [
      N('curve.norma', 'Nella norma', 'Lordosi lombare fisiologica.'),
      P('curve.lordosi', 'Lordosi alterata', 'Lordosi lombare [ridotta/rettilineizzata/accentuata].'),
      P('curve.scoliosi', 'Scoliosi', 'Curva scoliotica lombare a convessità [destra/sinistra].'),
    ],
    'Allineamento': [
      N('allineamento.norma', 'Conservato', 'Allineamento dei corpi vertebrali conservato.'),
      P('allineamento.anterolistesi', 'Anterolistesi', 'Anterolistesi di [___] su [___] di grado [I/II/III/IV] secondo Meyerding.'),
      P('allineamento.retrolistesi', 'Retrolistesi', 'Retrolistesi di [___] su [___] di circa [___ mm].'),
    ],
    'Corpi vertebrali': [
      N('corpi.norma', 'Nella norma', 'Non evidenti alterazioni di forma e struttura dei corpi vertebrali in esame.'),
      P('corpi.cedimento', 'Cedimento', 'Cedimento somatico di [___] con deformazione [a cuneo anteriore/biconcava/a schiacciamento globale] di grado [lieve/moderato/marcato].'),
      P('corpi.frattura', 'Frattura', 'Frattura [del corpo vertebrale/del processo trasverso] di [___].'),
      P('corpi.lesione', 'Lesione focale', 'Area di [osteolisi/osteoaddensamento] a carico del corpo vertebrale di [___], da correlare con il quadro clinico.'),
      O('corpi.osteopenia', 'Osteopenia', 'Diffusa rarefazione della trama ossea, come da osteopenia.', true),
      O('corpi.sintesi', 'Mezzi di sintesi', 'Esiti di artrodesi [___] con mezzi di sintesi metallici.'),
    ],
    'Spazi intersomatici': [
      N('spazi.norma', 'Conservati', 'Spazi intersomatici di ampiezza conservata.'),
      P('spazi.discopatia', 'Discopatia', 'Riduzione in ampiezza dello spazio intersomatico [___], con sclerosi delle limitanti somatiche, come da discopatia degenerativa.'),
      P('spazi.spondilosi', 'Spondilosi', 'Osteofitosi marginale dei corpi vertebrali, come da spondilosi [diffusa/a più livelli].'),
    ],
    'Articolazioni interapofisarie': [
      N('interapofisarie.norma', 'Nella norma', 'Articolazioni interapofisarie nei limiti della norma.'),
      P('interapofisarie.artrosi', 'Artrosi interapofisaria', 'Artrosi interapofisaria [___].'),
      P('interapofisarie.lisi', 'Spondilolisi', "Soluzione di continuo dell'istmo di [___] [a destra/a sinistra/bilateralmente], compatibile con spondilolisi."),
    ],
  }),

  'RX BACINO': exam('rx-bacino', {
    'Segmenti ossei': [
      N('ossa.norma', 'Nella norma', 'Non evidenti rime di frattura né alterazioni strutturali a carico del bacino in esame.'),
      P('ossa.frattura-collo', 'Frattura collo femore', 'Frattura [sottocapitata/mediocervicale] del collo del femore [destro/sinistro], tipo [I/II/III/IV] secondo Garden.'),
      P('ossa.frattura-trocanterica', 'Frattura trocanterica', 'Frattura [basicervicale/pertrocanterica/sottotrocanterica] del femore [destro/sinistro], [composta/scomposta].'),
      P('ossa.frattura-branche', 'Frattura branche pubiche', 'Frattura [composta/scomposta] della branca [ileo-pubica/ischio-pubica] [destra/sinistra].'),
      P('ossa.frattura-altra', 'Altra frattura', 'Frattura [composta/scomposta] [sede].'),
      O('ossa.osteopenia', 'Osteopenia', 'Diffusa rarefazione della trama ossea, come da osteopenia.', true),
    ],
    'Articolazioni coxofemorali': [
      N('anche.norma', 'Nella norma', 'Articolazioni coxofemorali con rime articolari di ampiezza conservata e rapporti articolari regolari.'),
      P('anche.coxartrosi', 'Coxartrosi', 'Coxartrosi [destra/sinistra/bilaterale] di grado [lieve/moderato/marcato], con riduzione della rima articolare, osteofitosi marginale e sclerosi subcondrale.'),
      P('anche.lussazione', 'Lussazione', "Lussazione [posteriore/anteriore] dell'anca [destra/sinistra]."),
      O('anche.protesi', "Protesi d'anca", "Protesi [totale/parziale] dell'anca [destra/sinistra], senza evidenti segni radiografici di mobilizzazione."),
    ],
    'Articolazioni sacroiliache': [
      N('sacroiliache.norma', 'Nella norma', 'Articolazioni sacroiliache nei limiti della norma.'),
      P('sacroiliache.artrosi', 'Artrosi', 'Alterazioni artrosiche delle articolazioni sacroiliache [a destra/a sinistra/bilateralmente].'),
      P('sacroiliache.sacroileite', 'Sacroileite', 'Erosioni e sclerosi subcondrale delle articolazioni sacroiliache [a destra/a sinistra/bilateralmente], compatibili con sacroileite, da correlare con il quadro clinico.'),
    ],
  }),

  'RX GINOCCHIO': exam('rx-ginocchio', {
    'Segmenti ossei': [
      N('ossa.norma', 'Nella norma', 'Non evidenti rime di frattura.'),
      P('ossa.frattura-piatto', 'Frattura piatto tibiale', 'Frattura [composta/scomposta] del piatto tibiale [mediale/laterale].'),
      P('ossa.frattura-rotula', 'Frattura rotula', 'Frattura [trasversa/longitudinale/pluriframmentaria] della rotula, [composta/scomposta].'),
      P('ossa.avulsione', 'Avulsione', 'Piccolo frammento osseo [sede], compatibile con frattura da avulsione.'),
      P('ossa.frattura-altra', 'Altra frattura', 'Frattura [composta/scomposta] [sede].'),
    ],
    'Rapporti articolari': [
      N('rapporti.norma', 'Conservati', 'Rapporti articolari conservati.'),
      P('rapporti.rotula-sublussata', 'Rotula sublussata', 'Rotula [sublussata/lussata] lateralmente.'),
      P('rapporti.rotula-altezza', 'Rotula alta/bassa', 'Rotula in posizione [alta/bassa].'),
    ],
    'Spazio articolare': [
      N('spazio.norma', 'Conservato', 'Rime articolari femoro-tibiali di ampiezza conservata.'),
      P('spazio.gonartrosi', 'Gonartrosi', 'Gonartrosi [lieve/moderata/marcata], con riduzione in ampiezza della rima articolare femoro-tibiale [mediale/laterale], osteofitosi marginale e sclerosi subcondrale.'),
      P('spazio.femoro-rotulea', 'Artrosi femoro-rotulea', 'Artrosi femoro-rotulea [lieve/moderata/marcata].'),
      P('spazio.condrocalcinosi', 'Condrocalcinosi', 'Calcificazioni [del menisco mediale/del menisco laterale/di entrambi i menischi], compatibili con condrocalcinosi.'),
      O('spazio.corpi-liberi', 'Corpi liberi', 'Corpi liberi endoarticolari calcifici [sede].', true),
      O('spazio.protesi', 'Protesi', 'Protesi [totale/monocompartimentale] di ginocchio, senza evidenti segni radiografici di mobilizzazione.'),
    ],
    'Versamento': [
      N('versamento.norma', 'Assente', 'Non versamento nel recesso sovrapatellare.'),
      P('versamento.presente', 'Versamento', 'Distensione del recesso sovrapatellare, come da versamento articolare [modesto/moderato/abbondante].'),
      P('versamento.lipoemartro', 'Lipoemartro', 'Livello liquido-adiposo nel recesso sovrapatellare, compatibile con lipoemartro.'),
    ],
    'Parti molli': [
      O('molli.tumefazione', 'Tumefazione', 'Tumefazione dei tessuti molli [prerotulei/periarticolari].', true),
      O('molli.corpo-estraneo', 'Corpo estraneo', 'Immagine radiopaca di circa [___ mm] nei tessuti molli [sede], compatibile con corpo estraneo.', true),
    ],
  }),

  'RX SPALLA': exam('rx-spalla', {
    'Segmenti ossei': [
      N('ossa.norma', 'Nella norma', 'Non evidenti rime di frattura.'),
      P('ossa.frattura-omero', 'Frattura omero prossimale', "Frattura [composta/scomposta] dell'omero prossimale, a carico [del collo chirurgico/del trochite/del collo anatomico]."),
      P('ossa.frattura-clavicola', 'Frattura clavicola', 'Frattura [composta/scomposta] della clavicola al terzo [mediale/medio/laterale].'),
      P('ossa.frattura-scapola', 'Frattura scapola', "Frattura [composta/scomposta] [della glena/del corpo della scapola/dell'acromion/del processo coracoideo]."),
      P('ossa.hill-sachs', 'Hill-Sachs', 'Impronta sul profilo postero-laterale della testa omerale, compatibile con lesione di Hill-Sachs.'),
    ],
    'Rapporti articolari': [
      N('rapporti.norma', 'Conservati', 'Rapporti gleno-omerali e acromion-claveari conservati.'),
      P('rapporti.lussazione-go', 'Lussazione gleno-omerale', 'Lussazione gleno-omerale [anteriore/posteriore].'),
      P('rapporti.lussazione-ac', 'Lussazione acromion-claveare', "Diastasi dell'articolazione acromion-claveare con sopraelevazione dell'estremo distale della clavicola, compatibile con lussazione acromion-claveare."),
      P('rapporti.risalita', 'Risalita testa omerale', "Risalita della testa omerale con riduzione dello spazio acromion-omerale (circa [___ mm]), da riferire in prima ipotesi a lesione cronica della cuffia dei rotatori."),
    ],
    'Alterazioni degenerative': [
      N('degenerative.norma', 'Assenti', 'Non significative alterazioni degenerative articolari.'),
      P('degenerative.omartrosi', 'Omartrosi', 'Omartrosi [lieve/moderata/marcata], con riduzione della rima gleno-omerale e osteofitosi marginale della testa omerale.'),
      P('degenerative.ac', 'Artrosi acromion-claveare', 'Artrosi acromion-claveare con osteofitosi marginale.'),
    ],
    'Parti molli': [
      N('molli.norma', 'Nella norma', 'Non calcificazioni nei tessuti molli periarticolari.'),
      P('molli.calcifica', 'Tendinopatia calcifica', 'Calcificazione di circa [___ mm] in proiezione del tendine [sovraspinato/sottospinato/sottoscapolare], compatibile con tendinopatia calcifica.'),
    ],
  }),

  'RX POLSO': exam('rx-polso', {
    'Radio e ulna': [
      N('radio-ulna.norma', 'Nella norma', "Non evidenti rime di frattura del radio e dell'ulna distali."),
      P('radio-ulna.radio', 'Frattura radio distale', "Frattura metaepifisaria distale del radio, [extra-articolare/articolare], [composta/con dislocazione dorsale del frammento distale/con dislocazione volare del frammento distale]."),
      P('radio-ulna.stiloide', 'Frattura stiloide ulnare', "Frattura della stiloide ulnare [alla base/all'apice]."),
      P('radio-ulna.salter-harris', 'Distacco epifisario', 'Distacco epifisario del radio distale, tipo [I/II/III/IV/V] secondo Salter-Harris.'),
      P('radio-ulna.consolidazione', 'In consolidazione', 'Frattura [sede] in via di consolidazione, con allineamento dei monconi [conservato/modificato rispetto al precedente controllo].'),
    ],
    'Carpo': [
      N('carpo.norma', 'Nella norma', 'Ossa del carpo di regolare morfologia, senza evidenti rime di frattura.'),
      P('carpo.scafoide', 'Frattura scafoide', 'Frattura dello scafoide a livello [del polo prossimale/della vita/del polo distale], [composta/scomposta].'),
      P('carpo.piramidale', 'Frattura piramidale', 'Piccolo frammento osseo dorsale in prossimità del piramidale, compatibile con frattura da avulsione.'),
    ],
    'Rapporti articolari': [
      N('rapporti.norma', 'Conservati', 'Rapporti articolari conservati.'),
      P('rapporti.scafo-lunata', 'Diastasi scafo-lunata', 'Diastasi scafo-lunata di circa [___ mm], compatibile con dissociazione scafo-lunata.'),
      P('rapporti.lussazione', 'Lussazione', 'Lussazione [perilunare/del semilunare].'),
    ],
    'Spazi articolari': [
      N('spazi.norma', 'Conservati', 'Spazi articolari radio-carpici e intercarpici di ampiezza conservata.'),
      P('spazi.rizoartrosi', 'Rizoartrosi', 'Rizoartrosi [lieve/moderata/marcata].'),
      P('spazi.radio-carpica', 'Artrosi radio-carpica', 'Alterazioni artrosiche radio-carpiche.'),
      P('spazi.condrocalcinosi', 'Condrocalcinosi', 'Calcificazioni della fibrocartilagine triangolare, compatibili con condrocalcinosi.'),
    ],
    'Parti molli': [
      O('molli.tumefazione', 'Tumefazione', 'Tumefazione dei tessuti molli [dorsali/volari/periarticolari].', true),
    ],
  }),

  'RX CAVIGLIA': exam('rx-caviglia', {
    'Segmenti ossei': [
      N('ossa.norma', 'Nella norma', 'Non evidenti rime di frattura.'),
      P('ossa.peroneale', 'Frattura malleolo peroneale', 'Frattura [composta/scomposta] del malleolo peroneale, tipo [A/B/C] secondo Weber.'),
      P('ossa.tibiale', 'Frattura malleolo tibiale', 'Frattura [composta/scomposta] del malleolo tibiale.'),
      P('ossa.bi-trimalleolare', 'Frattura bi-trimalleolare', 'Frattura [bimalleolare/trimalleolare], [composta/scomposta].'),
      P('ossa.avulsione', 'Avulsione', "Piccolo frammento osseo [all'apice del malleolo peroneale/all'apice del malleolo tibiale/dorsale all'astragalo], compatibile con frattura da avulsione."),
      O('ossa.accessori', 'Ossicino accessorio', 'Ossicino accessorio [os trigonum/os subfibulare/os tibiale esterno], variante anatomica.'),
    ],
    'Rapporti articolari': [
      N('rapporti.norma', 'Mortasa congrua', 'Mortasa tibio-astragalica congrua.'),
      P('rapporti.incongrua', 'Mortasa incongrua', 'Mortasa tibio-astragalica incongrua, con allargamento dello spazio articolare [mediale/laterale] (circa [___ mm]).'),
      P('rapporti.sindesmosi', 'Diastasi sindesmosi', 'Diastasi della sindesmosi tibio-peroneale distale.'),
    ],
    'Spazio articolare': [
      N('spazio.norma', 'Conservato', 'Rima articolare tibio-astragalica di ampiezza conservata.'),
      P('spazio.artrosi', 'Artrosi', 'Alterazioni artrosiche tibio-astragaliche con riduzione della rima articolare e osteofitosi marginale.'),
    ],
    'Parti molli': [
      O('molli.tumefazione', 'Tumefazione', 'Tumefazione dei tessuti molli perimalleolari [laterali/mediali].', true),
      O('molli.entesofita', 'Entesofita calcaneare', 'Entesofita [plantare/posteriore] del calcagno.', true),
    ],
  }),

  'RX RACHIDE CERVICALE': exam('rx-rachide-c', {
    'Curve': [
      N('curve.norma', 'Nella norma', 'Lordosi cervicale fisiologica.'),
      P('curve.lordosi', 'Lordosi alterata', 'Lordosi cervicale [ridotta/rettilineizzata/invertita].'),
    ],
    'Allineamento': [
      N('allineamento.norma', 'Conservato', 'Allineamento dei corpi vertebrali cervicali conservato.'),
      P('allineamento.listesi', 'Listesi', '[Anterolistesi/Retrolistesi] di [___] su [___] di circa [___ mm].'),
    ],
    'Corpi vertebrali': [
      N('corpi.norma', 'Nella norma', 'Non evidenti alterazioni di forma e struttura dei corpi vertebrali cervicali.'),
      P('corpi.frattura', 'Frattura', 'Frattura [del corpo vertebrale/del processo spinoso] di [___].'),
      O('corpi.dente', 'Dente epistrofeo', "Dente dell'epistrofeo in asse, senza evidenti rime di frattura (proiezione transorale)."),
    ],
    'Spazi intersomatici': [
      N('spazi.norma', 'Conservati', 'Spazi intersomatici di ampiezza conservata.'),
      P('spazi.discoartrosi', 'Discoartrosi', 'Riduzione in ampiezza degli spazi intersomatici [___], con osteofitosi marginale somatica, come da discoartrosi.'),
      P('spazi.uncoartrosi', 'Uncoartrosi', 'Uncoartrosi [___] con osteofiti uncovertebrali [a destra/a sinistra/bilateralmente].'),
    ],
    'Parti molli prevertebrali': [
      N('molli.norma', 'Nella norma', 'Parti molli prevertebrali di spessore regolare.'),
      P('molli.ispessite', 'Ispessimento', 'Ispessimento delle parti molli prevertebrali (circa [___ mm] a livello di [___]), da correlare con il quadro clinico.'),
    ],
  }),

  'RX MANO': exam('rx-mano', {
    'Segmenti ossei': [
      N('ossa.norma', 'Nella norma', 'Non evidenti rime di frattura.'),
      P('ossa.metacarpo', 'Frattura metacarpale', 'Frattura [composta/scomposta] [della base/della diafisi/del collo/della testa] del [I/II/III/IV/V] metacarpo.'),
      P('ossa.falange', 'Frattura falange', 'Frattura [composta/scomposta] della falange [prossimale/intermedia/distale] del [I/II/III/IV/V] dito.'),
      P('ossa.avulsione', 'Avulsione', 'Piccolo frammento osseo [volare alla base della falange intermedia/dorsale alla base della falange distale] del [II/III/IV/V] dito, compatibile con frattura da avulsione.'),
      P('ossa.lesione', 'Lesione focale', 'Area osteolitica a margini netti [sede], da correlare con il quadro clinico.'),
    ],
    'Mineralizzazione ossea': [
      N('mineralizzazione.norma', 'Conservata', 'Mineralizzazione ossea conservata.'),
      P('mineralizzazione.osteopenia', 'Osteopenia', 'Osteopenia [diffusa/iuxta-articolare].'),
    ],
    'Rapporti articolari': [
      N('rapporti.norma', 'Conservati', 'Rapporti articolari conservati.'),
      P('rapporti.lussazione', 'Lussazione', "Lussazione [dorsale/volare] dell'articolazione [metacarpo-falangea/interfalangea prossimale/interfalangea distale] del [I/II/III/IV/V] dito."),
    ],
    'Spazi articolari': [
      N('spazi.norma', 'Conservati', 'Spazi articolari di ampiezza conservata.'),
      P('spazi.interfalangea', 'Artrosi interfalangea', 'Artrosi delle articolazioni interfalangee [distali/prossimali/prossimali e distali], con riduzione delle rime articolari e osteofitosi marginale.'),
      P('spazi.rizoartrosi', 'Rizoartrosi', 'Rizoartrosi [lieve/moderata/marcata].'),
      P('spazi.erosioni', 'Erosioni marginali', 'Erosioni ossee marginali [sede], da correlare con il quadro clinico-laboratoristico.'),
    ],
    'Parti molli': [
      O('molli.assenza-ce', 'Non corpi estranei', 'Non evidenti corpi estranei radiopachi nei tessuti molli.'),
      O('molli.corpo-estraneo', 'Corpo estraneo', 'Immagine radiopaca di circa [___ mm] nei tessuti molli [sede], compatibile con corpo estraneo.', true),
      O('molli.tumefazione', 'Tumefazione', 'Tumefazione dei tessuti molli [sede].', true),
    ],
  }),

  'RX PIEDE': exam('rx-piede', {
    'Segmenti ossei': [
      N('ossa.norma', 'Nella norma', 'Non evidenti rime di frattura.'),
      P('ossa.metatarso', 'Frattura metatarsale', 'Frattura [composta/scomposta] [della base/della diafisi/del collo/della testa] del [I/II/III/IV/V] metatarso.'),
      P('ossa.base-v', 'Frattura base V metatarso', 'Frattura della base del V metatarso [alla tuberosità/alla giunzione metafiso-diafisaria].'),
      P('ossa.falange', 'Frattura falange', 'Frattura [composta/scomposta] della falange [prossimale/intermedia/distale] del [I/II/III/IV/V] dito.'),
      P('ossa.stress', 'Frattura da stress', 'Reazione periostale della diafisi del [II/III/IV] metatarso, compatibile con frattura da stress.'),
      O('ossa.accessori', 'Ossicino accessorio', 'Ossicino accessorio [os tibiale esterno/os peroneum/os trigonum], variante anatomica.'),
      O('ossa.entesofita', 'Entesofita calcaneare', 'Entesofita [plantare/posteriore] del calcagno.', true),
    ],
    'Rapporti articolari': [
      N('rapporti.norma', 'Conservati', 'Rapporti articolari conservati.'),
      P('rapporti.lisfranc', 'Diastasi Lisfranc', "Diastasi tra la base del I e del II metatarso (circa [___ mm]), sospetta per lesione dell'articolazione di Lisfranc."),
      P('rapporti.lussazione', 'Lussazione', "Lussazione dell'articolazione [metatarso-falangea/interfalangea] del [I/II/III/IV/V] dito."),
    ],
    'Spazi articolari': [
      N('spazi.norma', 'Conservati', 'Spazi articolari di ampiezza conservata.'),
      P('spazi.alluce', 'Artrosi alluce', 'Artrosi della I articolazione metatarso-falangea, con riduzione della rima articolare e osteofitosi marginale.'),
      P('spazi.tarso', 'Artrosi tarsale', 'Alterazioni artrosiche [tarso-metatarsali/intertarsali/astragalo-scafoidee].'),
      P('spazi.erosioni', 'Erosioni marginali', 'Erosioni ossee marginali [sede], da correlare con il quadro clinico-laboratoristico.'),
    ],
    'Allineamento': [
      N('allineamento.norma', 'Conservati', 'Morfologia e allineamento del piede conservati.'),
      P('allineamento.alluce-valgo', 'Alluce valgo', 'Alluce valgo, con angolo metatarso-falangeo di circa [___]° e angolo intermetatarsale I-II di circa [___]°.'),
      P('allineamento.piede-piatto', 'Piede piatto', 'Appiattimento della volta plantare longitudinale.'),
    ],
    'Parti molli': [
      O('molli.assenza-ce', 'Non corpi estranei', 'Non evidenti corpi estranei radiopachi nei tessuti molli.'),
      O('molli.corpo-estraneo', 'Corpo estraneo', 'Immagine radiopaca di circa [___ mm] nei tessuti molli [sede], compatibile con corpo estraneo.', true),
      O('molli.tumefazione', 'Tumefazione', 'Tumefazione dei tessuti molli [sede].', true),
    ],
  }),
};
