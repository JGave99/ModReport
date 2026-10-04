// Libreria predefinita (frasi di esempio da verificare e adattare: NON validate clinicamente).
// Versione 2 (04/10/2026): ripristina i 33 esami persi il 24/09 e corregge le frasi segnalate
// dalla revisione clinica (presidi "ove presenti", stadiazione in una sola frase, aorta senza diametri…).
// Convenzione per i campi da compilare: [testo] = campo libero, [a/b] = scelta tra opzioni.
// neg: true = reperto patologico / da approfondire.

export const DEFAULTS_VERSION = 2;

const N = (label, text) => ({ label, text, neg: false });
const P = (label, text) => ({ label, text, neg: true });

const TECNICA_TC = N('Tecnica', 'Esame eseguito [senza/senza e con] mezzo di contrasto iodato e.v. ([___] ml di [prodotto]).');
const TECNICA_RM = N('Tecnica', 'Esame eseguito con sequenze multiplanari [senza/senza e con] mezzo di contrasto paramagnetico e.v.');
const FEGATO_ECO = N('Fegato nella norma', 'Fegato di dimensioni ed ecostruttura nei limiti della norma.');
const COLECISTI_ECO = N('Colecisti e vie biliari nella norma', 'Colecisti alitiasica a pareti regolari; vie biliari non dilatate.');
const PANCREAS_ECO = N('Pancreas nella norma', 'Pancreas, per quanto esplorabile, di dimensioni ed ecostruttura regolari.');
const MILZA_ECO = N('Milza nella norma', 'Milza di dimensioni ed ecostruttura nei limiti della norma.');
const RENI_ECO = N('Reni nella norma', 'Reni di dimensioni e morfologia conservate, senza dilatazione delle vie escretrici.');
const VESCICA_ECO = N('Vescica nella norma', 'Vescica a medio riempimento, a pareti regolari, senza alterazioni endoluminali.');

export const DEFAULT_LIBRARY = {
  defaultsVersion: DEFAULTS_VERSION,
  metodiche: ['Ecografia', 'RX', 'TC', 'RMN'],
  esamiByMetodica: {
    'RX': ['RX TORACE 2PR', 'RX TORACE AP supino', 'RX ADDOME', 'RX RACHIDE LOMBOSACRALE', 'RX BACINO', 'RX GINOCCHIO', 'RX SPALLA', 'RX POLSO', 'RX CAVIGLIA', 'RX RACHIDE CERVICALE'],
    'Ecografia': ['ECOGRAFIA ADDOME COMPLETO', 'ECOGRAFIA TIROIDE', 'ECOGRAFIA ADDOME SUPERIORE', 'ECOGRAFIA RENALE E VESCICALE', 'ECOGRAFIA PARTI MOLLI', 'ECOCOLORDOPPLER ARTI INFERIORI VENOSO', 'ECOGRAFIA SCROTALE', 'ECOGRAFIA MAMMARIA'],
    'TC': ['TC TORACE', 'TC ADDOME COMPLETO', 'TC ADDOME SENZA E CON MDC', 'TC TORACE ADDOME PELVI (STADIAZIONE)', 'TC RACHIDE LOMBOSACRALE', 'TC BACINO', 'TC COLONNA CERVICALE', 'TC ANGIOGRAFIA AORTA'],
    'RMN': ['RMN RACHIDE LOMBOSACRALE', 'RMN GINOCCHIO', 'RMN SPALLA', 'RMN ADDOME SUPERIORE', 'RMN BACINO', 'RMN RACHIDE CERVICALE', 'RMN ENCEFALO'],
  },
  indicazioniByEsame: {
    'RX TORACE 2PR': ['Tosse persistente', 'Dispnea', 'Dolore toracico', 'Follow-up oncologico', 'Inquadramento preoperatorio'],
    'RX TORACE AP supino': ['Controllo post-procedurale', 'Paziente non collaborante', 'Monitoraggio in reparto'],
    'RX ADDOME': ['Dolore addominale', 'Sospetta occlusione', 'Ricerca corpo estraneo'],
    'RX RACHIDE LOMBOSACRALE': ['Lombalgia', 'Trauma', 'Sospetto cedimento vertebrale'],
    'RX BACINO': ['Trauma', 'Coxalgia'],
    'RX GINOCCHIO': ['Trauma', 'Gonalgia', 'Sospetta gonartrosi'],
    'RX SPALLA': ['Trauma', 'Dolore', 'Limitazione funzionale'],
    'RX POLSO': ['Trauma', 'Dolore'],
    'RX CAVIGLIA': ['Trauma', 'Dolore'],
    'RX RACHIDE CERVICALE': ['Trauma', 'Cervicalgia'],
    'ECOGRAFIA ADDOME COMPLETO': ['Dolore addominale', 'Alterazione indici epatici', 'Follow-up'],
    'ECOGRAFIA TIROIDE': ['Riscontro di nodulo palpabile', 'Controllo periodico', 'Familiarità per patologia tiroidea'],
    'ECOGRAFIA ADDOME SUPERIORE': ['Dolore ipocondrio destro', 'Alterazione indici epatici'],
    'ECOGRAFIA RENALE E VESCICALE': ['Dolore lombare', 'Ematuria', 'Controllo'],
    'ECOGRAFIA PARTI MOLLI': ['Tumefazione palpabile', 'Dolore localizzato'],
    'ECOCOLORDOPPLER ARTI INFERIORI VENOSO': ['Sospetta trombosi venosa profonda', 'Edema arto'],
    'ECOGRAFIA SCROTALE': ['Dolore scrotale', 'Tumefazione palpabile'],
    'ECOGRAFIA MAMMARIA': ['Riscontro di nodulo palpabile', 'Controllo'],
    'TC TORACE': ['Stadiazione oncologica', 'Sospetta embolia polmonare', 'Dispnea ingravescente'],
    'TC ADDOME COMPLETO': ['Dolore addominale acuto', 'Stadiazione neoplastica', 'Follow-up post-chirurgico'],
    'TC ADDOME SENZA E CON MDC': ['Dolore addominale', 'Sospetta neoplasia'],
    'TC TORACE ADDOME PELVI (STADIAZIONE)': ['Stadiazione oncologica', 'Follow-up oncologico'],
    'TC RACHIDE LOMBOSACRALE': ['Lombalgia', 'Sospetta ernia discale'],
    'TC BACINO': ['Trauma', 'Coxalgia'],
    'TC COLONNA CERVICALE': ['Trauma'],
    'TC ANGIOGRAFIA AORTA': ['Sospetta dissezione aortica', 'Follow-up aneurisma'],
    'RMN RACHIDE LOMBOSACRALE': ['Lombalgia', 'Sciatalgia', 'Sospetta ernia discale'],
    'RMN GINOCCHIO': ['Gonalgia', 'Trauma', 'Sospetta lesione meniscale'],
    'RMN SPALLA': ['Dolore', 'Sospetta lesione della cuffia dei rotatori'],
    'RMN ADDOME SUPERIORE': ['Riscontro incidentale di lesione epatica', 'Studio delle vie biliari'],
    'RMN BACINO': ['Coxalgia', 'Sospetta necrosi avascolare'],
    'RMN RACHIDE CERVICALE': ['Cervicalgia', 'Cervicobrachialgia'],
    'RMN ENCEFALO': ['Cefalea persistente', 'Sospetta lesione ischemica', 'Vertigini'],
  },
  refertoByEsame: {
    'RX TORACE 2PR': {
      'Parenchima': [
        N('Parenchima nella norma', 'Non addensamenti parenchimali a focolaio.'),
        P('Addensamento', 'Addensamento parenchimale [sede], da correlare con il quadro clinico-laboratoristico.'),
      ],
      'Pleura': [
        N('Pleura libera', 'Non versamento pleurico bilateralmente.'),
        N('Non PNX', 'Non segni di pneumotorace.'),
      ],
      'Cuore e mediastino': [
        N('Cuore nella norma', 'Ombra cardiaca di dimensioni e morfologia nei limiti della norma.'),
        N('Mediastino nella norma', 'Mediastino in asse, di ampiezza regolare.'),
      ],
      'Scheletro': [N('Scheletro indenne', 'Non evidenti lesioni ossee focali a carico dello scheletro toracico in esame.')],
    },
    'RX TORACE AP supino': {
      'Parenchima': [N('Nella norma', 'Non evidenti addensamenti parenchimali focali, con i limiti intrinseci della proiezione singola in AP.')],
      'Pleura': [
        N('Non PNX', 'Non segni di pneumotorace apprezzabili nella proiezione in clinostatismo.'),
        N('Non versamento', 'Non evidenti segni di versamento pleurico, con i limiti della proiezione in clinostatismo.'),
      ],
      'Presidi': [
        N('CVC', 'CVC [giugulare/succlavio] [destro/sinistro] con estremità in proiezione [della vena cava superiore/della giunzione cavo-atriale].'),
        N('SNG', 'SNG con decorso lungo la linea mediana, oltre il diaframma, con estremità in proiezione gastrica.'),
        N('Tubo endotracheale', 'Tubo endotracheale con estremità a [___] cm dalla carena.'),
      ],
    },
    'RX ADDOME': {
      'Gas intestinale': [
        N('Non livelli idroaerei', 'Non evidenza di livelli idroaerei significativi.'),
        N('Non aria libera', 'Non evidenza di aria libera sottodiaframmatica nella proiezione in ortostatismo.'),
      ],
      'Calcificazioni': [N('Assenti', 'Non calcificazioni patologiche in proiezione addominale.')],
      'Profili ossei': [N('Nella norma', 'Profili ossei del bacino e del rachide in esame nella norma.')],
    },
    'RX RACHIDE LOMBOSACRALE': {
      'Corpi vertebrali': [N('Nella norma', 'Non evidenti alterazioni di forma e struttura dei corpi vertebrali in esame.')],
    },
    'RX BACINO': {
      'Reperto': [N('Nella norma', 'Non evidenti rime di frattura né alterazioni strutturali a carico del bacino in esame.')],
    },
    'RX GINOCCHIO': {
      'Reperto': [N('Nella norma', 'Non rime di frattura. Rapporti articolari conservati. Non versamento nel recesso sovrapatellare.')],
    },
    'RX SPALLA': {
      'Reperto': [N('Nella norma', 'Non rime di frattura né lussazioni; rapporti gleno-omerali e acromion-claveari conservati.')],
    },
    'RX POLSO': {
      'Reperto': [N('Nella norma', 'Non rime di frattura; rapporti articolari conservati.')],
    },
    'RX CAVIGLIA': {
      'Reperto': [N('Nella norma', 'Non evidenti rime di frattura; mortasa tibio-astragalica congrua.')],
    },
    'RX RACHIDE CERVICALE': {
      'Corpi vertebrali': [N('Nella norma', 'Non evidenti alterazioni di forma e allineamento dei corpi vertebrali cervicali.')],
    },
    'ECOGRAFIA ADDOME COMPLETO': {
      'Fegato': [FEGATO_ECO],
      'Colecisti e vie biliari': [COLECISTI_ECO],
      'Pancreas': [PANCREAS_ECO],
      'Milza': [MILZA_ECO],
      'Reni': [RENI_ECO],
      'Vescica': [VESCICA_ECO],
      'Aorta addominale': [N('Calibro nella norma', 'Aorta addominale di calibro nei limiti della norma nei tratti esplorabili.')],
      'Versamento': [N('Non versamento', 'Non versamento libero in addome.')],
    },
    'ECOGRAFIA TIROIDE': {
      'Parenchima tiroideo': [N('Ecostruttura omogenea', 'Ghiandola tiroidea in sede, di dimensioni nella norma ed ecostruttura omogenea.')],
      'Noduli': [N('Non noduli', 'Non si evidenziano formazioni nodulari focali.')],
      'Linfonodi': [N('Non linfonodi patologici', 'Non linfonodi laterocervicali di aspetto patologico.')],
    },
    'ECOGRAFIA ADDOME SUPERIORE': {
      'Fegato': [FEGATO_ECO],
      'Colecisti e vie biliari': [COLECISTI_ECO],
      'Pancreas': [PANCREAS_ECO],
      'Milza': [MILZA_ECO],
      'Reni': [RENI_ECO],
    },
    'ECOGRAFIA RENALE E VESCICALE': {
      'Reni': [N('Reni nella norma', 'Reni in sede, di dimensioni e morfologia conservate, con regolare spessore parenchimale; non dilatazione delle cavità calico-pieliche né immagini litiasiche.')],
      'Vescica': [VESCICA_ECO],
      'Residuo post-minzionale': [N('Non significativo', 'Residuo post-minzionale non significativo ([___] ml).')],
    },
    'ECOGRAFIA PARTI MOLLI': {
      'Reperto': [N('Nella norma', 'Non evidenti raccolte né lesioni focali nei tessuti molli in esame.')],
    },
    'ECOCOLORDOPPLER ARTI INFERIORI VENOSO': {
      'Asse venoso profondo': [N('Pervio', 'Asse venoso profondo [destro/sinistro/bilateralmente] (vena femorale comune, femorale e poplitea; vene tibiali per quanto esplorabili) pervio e comprimibile, con flusso fasico; non segni di trombosi venosa profonda nei segmenti esaminati.')],
      'Asse venoso superficiale': [N('Pervio', 'Non segni di trombosi venosa superficiale nei tratti esaminati.')],
    },
    'ECOGRAFIA SCROTALE': {
      'Testicoli': [N('Nella norma', 'Testicoli in sede, di dimensioni ed ecostruttura nella norma.')],
      'Vascolarizzazione': [N('Conservata', 'Vascolarizzazione intratesticolare conservata e simmetrica al color-Doppler.')],
      'Epididimi': [N('Nella norma', 'Epididimi di dimensioni ed ecostruttura regolari.')],
      'Versamento': [N('Non idrocele', 'Non idrocele.')],
    },
    'ECOGRAFIA MAMMARIA': {
      'Parenchima ghiandolare': [N('Nella norma', 'Non formazioni focali solide o cistiche di significato patologico bilateralmente.')],
      'Cavi ascellari': [N('Liberi', 'Cavi ascellari privi di linfonodi di aspetto patologico.')],
    },
    'TC TORACE': {
      'Tecnica': [TECNICA_TC],
      'Parenchima polmonare': [N('Nella norma', 'Parenchima polmonare privo di alterazioni densitometriche focali.')],
      'Linfonodi': [N('Non linfoadenopatie', 'Non linfoadenopatie mediastiniche o ilari di rilievo dimensionale.')],
      'Pleura e pericardio': [N('Non versamento', 'Non versamento pleurico né pericardico.')],
    },
    'TC ADDOME COMPLETO': {
      'Tecnica': [TECNICA_TC],
      'Fegato': [N('Nella norma', 'Fegato di dimensioni e densità nei limiti, privo di lesioni focali.')],
      'Milza e pancreas': [N('Nella norma', 'Milza e pancreas di dimensioni e densità nei limiti della norma.')],
      'Reni': [N('Nella norma', 'Reni di dimensioni e morfologia conservate; non dilatazione delle vie escretrici.')],
      'Linfonodi': [N('Non linfoadenopatie', 'Non linfoadenopatie retroperitoneali di rilievo dimensionale.')],
      'Versamento': [N('Non versamento', 'Non versamento libero né raccolte fluide addomino-pelviche.')],
    },
    'TC ADDOME SENZA E CON MDC': {
      'Tecnica': [N('Tecnica', 'Esame eseguito senza e con mezzo di contrasto iodato e.v. ([___] ml di [prodotto]), con acquisizioni in fase [arteriosa/portale/tardiva].')],
      'Fegato': [N('Nella norma', 'Fegato di dimensioni e densità nei limiti, privo di lesioni focali nelle diverse fasi di studio.')],
      'Milza e pancreas': [N('Nella norma', 'Milza e pancreas di dimensioni e densità nei limiti della norma.')],
      'Reni e surreni': [N('Nella norma', 'Reni e surreni di morfologia e impregnazione contrastografica regolari; non dilatazione delle vie escretrici.')],
      'Linfonodi': [N('Non linfoadenopatie', 'Non linfoadenopatie addominali di rilievo dimensionale.')],
      'Versamento': [N('Non versamento', 'Non versamento libero in addome.')],
    },
    'TC TORACE ADDOME PELVI (STADIAZIONE)': {
      'Tecnica': [TECNICA_TC],
      'Torace': [N('Nella norma', 'Non noduli né masse polmonari; non versamento pleurico.')],
      'Fegato': [N('Nella norma', 'Fegato privo di lesioni focali.')],
      'Surreni': [N('Nella norma', 'Surreni di morfologia regolare.')],
      'Linfonodi': [N('Non linfoadenopatie', 'Non linfoadenopatie di significato patologico (asse corto superiore a 10 mm) nelle stazioni toraciche, addominali e pelviche esaminate.')],
      'Scheletro': [N('Nella norma', 'Non lesioni ossee focali di aspetto litico o addensante nei segmenti esaminati.')],
    },
    'TC RACHIDE LOMBOSACRALE': {
      'Reperto': [N('Nella norma', 'Allineamento dei metameri lombosacrali conservato. Non rime di frattura. Canale vertebrale di ampiezza conservata ai livelli esaminati.')],
    },
    'TC BACINO': {
      'Reperto': [N('Nella norma', 'Non rime di frattura; strutture articolari conservate.')],
    },
    'TC COLONNA CERVICALE': {
      'Reperto': [N('Nella norma', 'Non evidenti rime di frattura né dislocazioni vertebrali.')],
    },
    'TC ANGIOGRAFIA AORTA': {
      'Tecnica': [N('Tecnica', 'Angio-TC eseguita con mezzo di contrasto iodato e.v. in fase arteriosa ([___] ml di [prodotto]).')],
      'Diametri': [N('Diametri aortici', 'Diametri aortici massimi (piani doppio-obliqui): radice [___] mm, aorta ascendente [___] mm, arco [___] mm, aorta discendente [___] mm, sovrarenale [___] mm, infrarenale [___] mm.')],
      'Dissezione': [N('Assente', 'Non segni di dissezione né di ematoma intramurale.')],
    },
    'RMN RACHIDE LOMBOSACRALE': {
      'Dischi intervertebrali': [N('Nella norma', 'Dischi intervertebrali di segnale e altezza conservati ai livelli esaminati.')],
      'Canale vertebrale': [N('Pervio', 'Canale vertebrale di ampiezza conservata, privo di stenosi significative.')],
    },
    'RMN GINOCCHIO': {
      'Menischi': [N('Nella norma', 'Non lesioni meniscali (alterazioni di segnale che raggiungono la superficie articolare).')],
      'Legamenti': [N('Nella norma', 'Legamenti crociati e collaterali in continuità.')],
    },
    'RMN SPALLA': {
      'Cuffia dei rotatori': [N('Integra', 'Tendini della cuffia dei rotatori in continuità, senza lesioni a spessore completo né parziale.')],
    },
    'RMN ADDOME SUPERIORE': {
      'Tecnica': [TECNICA_RM],
      'Fegato': [N('Nella norma', 'Fegato di dimensioni e intensità di segnale nei limiti, privo di lesioni focali.')],
      'Vie biliari': [N('Non dilatate', 'Vie biliari intra- ed extraepatiche non dilatate.')],
      'Pancreas': [N('Nella norma', 'Pancreas di dimensioni e segnale regolari; dotto di Wirsung non dilatato.')],
      'Milza': [N('Nella norma', 'Milza di dimensioni e segnale nei limiti della norma.')],
      'Reni e surreni': [N('Nella norma', 'Reni e surreni di morfologia e segnale regolari.')],
    },
    'RMN BACINO': {
      'Teste femorali': [N('Nella norma', 'Teste femorali di segnale conservato, senza segni di necrosi avascolare.')],
    },
    'RMN RACHIDE CERVICALE': {
      'Dischi intervertebrali': [N('Nella norma', 'Dischi intervertebrali cervicali di segnale e altezza conservati.')],
      'Midollo spinale': [N('Nella norma', 'Midollo spinale cervicale di calibro e segnale regolari.')],
    },
    'RMN ENCEFALO': {
      'Tecnica': [TECNICA_RM],
      'Parenchima encefalico': [N('Nella norma', 'Non alterazioni di segnale focali del parenchima encefalico sovra- e sottotentoriale.')],
      'Diffusione': [N('Nella norma', 'Non aree di restrizione della diffusione.')],
      'Sistema ventricolare': [N('Nella norma', 'Sistema ventricolare in asse, di ampiezza nei limiti della norma per età.')],
    },
  },
};

// Frasi predefinite delle versioni precedenti ritenute rischiose: se l'utente le ha ancora
// identiche (cioè non le ha personalizzate), la migrazione le sostituisce con i gruppi indicati.
export const DEPRECATED_DEFAULTS = [
  { esame: 'RX TORACE AP supino', text: 'Presidi (CVC/SNG/drenaggi), ove presenti, in sede regolare.', groups: ['Presidi'] },
  { esame: 'TC TORACE ADDOME PELVI (STADIAZIONE)', text: 'Non evidenza di lesioni secondarie a distanza nei distretti esaminati.', groups: ['Tecnica', 'Torace', 'Fegato', 'Surreni', 'Linfonodi', 'Scheletro'] },
  { esame: 'TC ANGIOGRAFIA AORTA', text: 'Aorta toracica e addominale di calibro regolare, senza segni di dissezione né ectasie significative.', groups: ['Tecnica', 'Diametri', 'Dissezione'] },
  { esame: 'RX GINOCCHIO', text: 'Non evidenti esiti post-traumatici recenti; rime articolari conservate.', groups: ['Reperto'] },
  { esame: 'RX SPALLA', text: 'Non evidenti alterazioni ossee focali; profilo articolare regolare.', groups: ['Reperto'] },
  { esame: 'RMN GINOCCHIO', text: 'Menischi e legamenti crociati privi di alterazioni di segnale significative.', groups: ['Menischi', 'Legamenti'] },
  { esame: 'RMN SPALLA', text: 'Cuffia dei rotatori integra, senza alterazioni di segnale.', groups: ['Cuffia dei rotatori'] },
  { esame: 'RX TORACE 2PR', text: 'Addensamento parenchimale in sede da definire con approfondimento clinico-radiologico.', groups: ['Parenchima'] },
];

// Testi predefiniti di tutte le versioni precedenti (fino alla v1): servono a capire se un esame
// non è mai stato personalizzato, per aggiornarlo alla nuova versione senza toccare le modifiche dell'utente.
export const LEGACY_DEFAULT_TEXTS = {
  "RX TORACE 2PR": [
    "Non addensamenti parenchimali a focolaio.",
    "Addensamento parenchimale in sede da definire con approfondimento clinico-radiologico.",
    "Non versamento pleurico bilateralmente.",
    "Ombra cardiaca di dimensioni e morfologia nei limiti della norma.",
    "Mediastino in asse, di ampiezza regolare.",
    "Non evidenti lesioni ossee focali a carico dello scheletro toracico in esame.",
  ],
  "RX TORACE AP supino": [
    "Non evidenti addensamenti parenchimali focali, con i limiti intrinseci della proiezione singola in AP.",
    "Presidi (CVC/SNG/drenaggi), ove presenti, in sede regolare.",
  ],
  "RX ADDOME": [
    "Non evidenza di livelli idroaerei significativi.",
    "Non calcificazioni patologiche in proiezione addominale.",
    "Profili ossei del bacino e del rachide in esame nella norma.",
  ],
  "RX RACHIDE LOMBOSACRALE": [
    "Non evidenti alterazioni di forma e struttura dei corpi vertebrali in esame.",
  ],
  "RX BACINO": [
    "Non evidenti rime di frattura né alterazioni strutturali a carico del bacino in esame.",
  ],
  "RX GINOCCHIO": [
    "Non evidenti esiti post-traumatici recenti; rime articolari conservate.",
  ],
  "RX SPALLA": [
    "Non evidenti alterazioni ossee focali; profilo articolare regolare.",
  ],
  "RX POLSO": [
    "Non rime di frattura; rapporti articolari conservati.",
  ],
  "RX CAVIGLIA": [
    "Non evidenti rime di frattura; mortasa tibio-astragalica congrua.",
  ],
  "RX RACHIDE CERVICALE": [
    "Non evidenti alterazioni di forma e allineamento dei corpi vertebrali cervicali.",
  ],
  "ECOGRAFIA ADDOME COMPLETO": [
    "Fegato di dimensioni ed ecostruttura nei limiti della norma.",
    "Colecisti alitiasica a pareti regolari; vie biliari non dilatate.",
    "Reni di dimensioni e morfologia conservate, senza dilatazione delle vie escretrici.",
  ],
  "ECOGRAFIA TIROIDE": [
    "Ghiandola tiroidea in sede, di dimensioni nella norma ed ecostruttura omogenea.",
    "Non si evidenziano formazioni nodulari focali.",
  ],
  "ECOGRAFIA ADDOME SUPERIORE": [
    "Fegato, colecisti e vie biliari nei limiti della norma.",
  ],
  "ECOGRAFIA RENALE E VESCICALE": [
    "Reni e vescica nei limiti della norma, senza dilatazione delle vie escretrici.",
  ],
  "ECOGRAFIA PARTI MOLLI": [
    "Non evidenti raccolte né lesioni focali nei tessuti molli in esame.",
  ],
  "ECOCOLORDOPPLER ARTI INFERIORI VENOSO": [
    "Pervietà e comprimibilità conservate dell’asse venoso profondo in esame; non segni di trombosi.",
  ],
  "ECOGRAFIA SCROTALE": [
    "Testicoli in sede, di dimensioni ed ecostruttura nella norma.",
  ],
  "ECOGRAFIA MAMMARIA": [
    "Parenchima ghiandolare privo di formazioni focali sospette.",
  ],
  "TC TORACE": [
    "Parenchima polmonare privo di alterazioni densitometriche focali.",
    "Non linfoadenopatie mediastiniche o ilari di rilievo dimensionale.",
  ],
  "TC ADDOME COMPLETO": [
    "Fegato di dimensioni e densità nei limiti, privo di lesioni focali.",
    "Non linfoadenopatie retroperitoneali di rilievo dimensionale.",
  ],
  "TC ADDOME SENZA E CON MDC": [
    "Fegato, milza, pancreas e reni nei limiti della norma per morfologia e densitometria.",
  ],
  "TC TORACE ADDOME PELVI (STADIAZIONE)": [
    "Non evidenza di lesioni secondarie a distanza nei distretti esaminati.",
  ],
  "TC RACHIDE LOMBOSACRALE": [
    "Non evidenti alterazioni ossee significative; canale vertebrale pervio.",
  ],
  "TC BACINO": [
    "Non rime di frattura; strutture articolari conservate.",
  ],
  "TC COLONNA CERVICALE": [
    "Non evidenti rime di frattura né dislocazioni vertebrali.",
  ],
  "TC ANGIOGRAFIA AORTA": [
    "Aorta toracica e addominale di calibro regolare, senza segni di dissezione né ectasie significative.",
  ],
  "RMN RACHIDE LOMBOSACRALE": [
    "Dischi intervertebrali di segnale e altezza conservati ai livelli esaminati.",
    "Canale vertebrale di ampiezza conservata, privo di stenosi significative.",
  ],
  "RMN GINOCCHIO": [
    "Menischi e legamenti crociati privi di alterazioni di segnale significative.",
  ],
  "RMN SPALLA": [
    "Cuffia dei rotatori integra, senza alterazioni di segnale.",
  ],
  "RMN ADDOME SUPERIORE": [
    "Fegato e vie biliari nei limiti della norma.",
  ],
  "RMN BACINO": [
    "Teste femorali di segnale conservato, senza segni di necrosi avascolare.",
  ],
  "RMN RACHIDE CERVICALE": [
    "Dischi intervertebrali cervicali di segnale e altezza conservati.",
  ],
  "RMN ENCEFALO": [
    "Non alterazioni di segnale focali del parenchima encefalico sovra- e sottotentoriale.",
    "Sistema ventricolare in asse, di ampiezza nei limiti della norma per età.",
  ],
};
