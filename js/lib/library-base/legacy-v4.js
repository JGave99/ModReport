// Libreria predefinita v4 (16/10/2026): solo metodiche, esami e indicazioni, senza le frasi.
// Serve all'aggiornamento alla libreria successiva per riconoscere ciò che era della base e ora non c'è più
// (esami, indicazioni, metodiche): si toglie agli utenti solo se non l'hanno personalizzato. Non modificare.
export const V4_BASE = {
  "metodiche": [
    "Ecografia",
    "RX",
    "TC",
    "RMN"
  ],
  "esamiByMetodica": {
    "Ecografia": [
      "ECOGRAFIA ADDOME COMPLETO",
      "ECOGRAFIA TIROIDE",
      "ECOGRAFIA ADDOME SUPERIORE",
      "ECOGRAFIA RENALE E VESCICALE",
      "ECOGRAFIA PARTI MOLLI",
      "ECOCOLORDOPPLER ARTI INFERIORI VENOSO",
      "ECOGRAFIA SCROTALE",
      "ECOGRAFIA MAMMARIA",
      "ECOCOLORDOPPLER TSA"
    ],
    "RX": [
      "RX TORACE 2PR",
      "RX TORACE AP supino",
      "RX ADDOME",
      "RX RACHIDE LOMBOSACRALE",
      "RX BACINO",
      "RX GINOCCHIO",
      "RX SPALLA",
      "RX POLSO",
      "RX CAVIGLIA",
      "RX RACHIDE CERVICALE",
      "RX MANO",
      "RX PIEDE"
    ],
    "TC": [
      "TC TORACE",
      "TC ADDOME COMPLETO",
      "TC ADDOME SENZA E CON MDC",
      "TC TORACE ADDOME PELVI (STADIAZIONE)",
      "TC RACHIDE LOMBOSACRALE",
      "TC BACINO",
      "TC COLONNA CERVICALE",
      "TC ANGIOGRAFIA AORTA",
      "TC ENCEFALO"
    ],
    "RMN": [
      "RMN RACHIDE LOMBOSACRALE",
      "RMN GINOCCHIO",
      "RMN SPALLA",
      "RMN ADDOME SUPERIORE",
      "RMN BACINO",
      "RMN RACHIDE CERVICALE",
      "RMN ENCEFALO",
      "RMN PROSTATA MULTIPARAMETRICA"
    ]
  },
  "indicazioniByEsame": {
    "ECOGRAFIA ADDOME COMPLETO": [
      "Dolore addominale",
      "Alterazione indici epatici",
      "Follow-up",
      "Sospetta colelitiasi",
      "Dispepsia",
      "Calo ponderale"
    ],
    "ECOGRAFIA TIROIDE": [
      "Riscontro di nodulo palpabile",
      "Controllo periodico",
      "Familiarità per patologia tiroidea",
      "Alterazione della funzionalità tiroidea",
      "Tumefazione cervicale"
    ],
    "ECOGRAFIA ADDOME SUPERIORE": [
      "Dolore ipocondrio destro",
      "Alterazione indici epatici",
      "Sospetta colelitiasi",
      "Dispepsia",
      "Follow-up"
    ],
    "ECOGRAFIA RENALE E VESCICALE": [
      "Dolore lombare",
      "Ematuria",
      "Controllo",
      "Colica renale",
      "Infezioni urinarie ricorrenti",
      "Disturbi minzionali"
    ],
    "ECOGRAFIA PARTI MOLLI": [
      "Tumefazione palpabile",
      "Dolore localizzato",
      "Sospetta ernia",
      "Sospetta raccolta",
      "Linfonodo palpabile"
    ],
    "ECOCOLORDOPPLER ARTI INFERIORI VENOSO": [
      "Sospetta trombosi venosa profonda",
      "Edema arto",
      "Varici arti inferiori",
      "Insufficienza venosa cronica",
      "Follow-up di trombosi venosa"
    ],
    "ECOGRAFIA SCROTALE": [
      "Dolore scrotale",
      "Tumefazione palpabile",
      "Sospetto varicocele",
      "Infertilità di coppia",
      "Trauma scrotale"
    ],
    "ECOGRAFIA MAMMARIA": [
      "Riscontro di nodulo palpabile",
      "Controllo",
      "Integrazione di mammografia",
      "Mastodinia",
      "Secrezione dal capezzolo"
    ],
    "ECOCOLORDOPPLER TSA": [
      "Fattori di rischio cardiovascolari",
      "Soffio carotideo",
      "Pregresso TIA o ictus",
      "Vertigini",
      "Controllo di stenosi carotidea nota"
    ],
    "RX TORACE 2PR": [
      "Tosse persistente",
      "Dispnea",
      "Dolore toracico",
      "Follow-up oncologico",
      "Inquadramento preoperatorio",
      "Febbre",
      "Sospetta polmonite",
      "Trauma toracico"
    ],
    "RX TORACE AP supino": [
      "Controllo post-procedurale",
      "Paziente non collaborante",
      "Monitoraggio in reparto",
      "Controllo dei presidi",
      "Insufficienza respiratoria",
      "Febbre"
    ],
    "RX ADDOME": [
      "Dolore addominale",
      "Sospetta occlusione",
      "Ricerca corpo estraneo",
      "Sospetta perforazione",
      "Stipsi ostinata",
      "Colica renale"
    ],
    "RX RACHIDE LOMBOSACRALE": [
      "Lombalgia",
      "Trauma",
      "Sospetto cedimento vertebrale",
      "Lombosciatalgia",
      "Osteoporosi",
      "Controllo post-chirurgico"
    ],
    "RX BACINO": [
      "Trauma",
      "Coxalgia",
      "Sospetta coxartrosi",
      "Caduta accidentale",
      "Controllo protesi d'anca"
    ],
    "RX GINOCCHIO": [
      "Trauma",
      "Gonalgia",
      "Sospetta gonartrosi",
      "Tumefazione articolare",
      "Controllo protesi di ginocchio"
    ],
    "RX SPALLA": [
      "Trauma",
      "Dolore",
      "Limitazione funzionale",
      "Sospetta lussazione",
      "Controllo post-riduzione"
    ],
    "RX POLSO": [
      "Trauma",
      "Dolore",
      "Controllo in apparecchio gessato",
      "Sospetta frattura dello scafoide",
      "Controllo post-chirurgico"
    ],
    "RX CAVIGLIA": [
      "Trauma",
      "Dolore",
      "Trauma distorsivo",
      "Controllo in apparecchio gessato",
      "Controllo post-chirurgico"
    ],
    "RX RACHIDE CERVICALE": [
      "Trauma",
      "Cervicalgia",
      "Cervicobrachialgia",
      "Trauma distorsivo",
      "Limitazione funzionale"
    ],
    "RX MANO": [
      "Trauma",
      "Dolore",
      "Tumefazione articolare",
      "Sospetta artropatia infiammatoria",
      "Ricerca corpo estraneo"
    ],
    "RX PIEDE": [
      "Trauma",
      "Dolore",
      "Alluce valgo",
      "Metatarsalgia",
      "Ricerca corpo estraneo"
    ],
    "TC TORACE": [
      "Stadiazione oncologica",
      "Sospetta embolia polmonare",
      "Dispnea ingravescente",
      "Follow-up oncologico",
      "Controllo di nodulo polmonare noto",
      "Trauma toracico"
    ],
    "TC ADDOME COMPLETO": [
      "Dolore addominale acuto",
      "Stadiazione neoplastica",
      "Follow-up post-chirurgico",
      "Sospetta occlusione intestinale",
      "Sospetta appendicite",
      "Sospetta colica renale"
    ],
    "TC ADDOME SENZA E CON MDC": [
      "Dolore addominale",
      "Sospetta neoplasia",
      "Caratterizzazione di lesione epatica",
      "Caratterizzazione di lesione renale",
      "Follow-up oncologico"
    ],
    "TC TORACE ADDOME PELVI (STADIAZIONE)": [
      "Stadiazione oncologica",
      "Follow-up oncologico",
      "Rivalutazione dopo terapia",
      "Sospetta recidiva",
      "Ricerca di neoplasia primitiva"
    ],
    "TC RACHIDE LOMBOSACRALE": [
      "Lombalgia",
      "Sospetta ernia discale",
      "Lombosciatalgia",
      "Trauma",
      "Sospetto cedimento vertebrale"
    ],
    "TC BACINO": [
      "Trauma",
      "Coxalgia",
      "Sospetta frattura del femore prossimale",
      "Controllo post-chirurgico"
    ],
    "TC COLONNA CERVICALE": [
      "Trauma",
      "Cervicalgia",
      "Cervicobrachialgia",
      "Controllo post-chirurgico"
    ],
    "TC ANGIOGRAFIA AORTA": [
      "Sospetta dissezione aortica",
      "Follow-up aneurisma",
      "Dolore toracico acuto",
      "Controllo dopo endoprotesi aortica",
      "Sospetta rottura di aneurisma"
    ],
    "TC ENCEFALO": [
      "Trauma cranico",
      "Sospetto ictus",
      "Cefalea acuta",
      "Deficit neurologico focale",
      "Alterazione dello stato di coscienza"
    ],
    "RMN RACHIDE LOMBOSACRALE": [
      "Lombalgia",
      "Sciatalgia",
      "Sospetta ernia discale",
      "Lombocruralgia",
      "Claudicatio neurogena",
      "Controllo post-chirurgico"
    ],
    "RMN GINOCCHIO": [
      "Gonalgia",
      "Trauma",
      "Sospetta lesione meniscale",
      "Sospetta lesione legamentosa",
      "Blocco articolare",
      "Controllo post-chirurgico"
    ],
    "RMN SPALLA": [
      "Dolore",
      "Sospetta lesione della cuffia dei rotatori",
      "Trauma",
      "Instabilità gleno-omerale",
      "Limitazione funzionale"
    ],
    "RMN ADDOME SUPERIORE": [
      "Riscontro incidentale di lesione epatica",
      "Studio delle vie biliari",
      "Sospetta coledocolitiasi",
      "Caratterizzazione di lesione pancreatica",
      "Sorveglianza in epatopatia cronica"
    ],
    "RMN BACINO": [
      "Coxalgia",
      "Sospetta necrosi avascolare",
      "Trauma",
      "Sospetta frattura occulta",
      "Dolore trocanterico"
    ],
    "RMN RACHIDE CERVICALE": [
      "Cervicalgia",
      "Cervicobrachialgia",
      "Parestesie agli arti superiori",
      "Sospetta mielopatia",
      "Trauma"
    ],
    "RMN ENCEFALO": [
      "Cefalea persistente",
      "Sospetta lesione ischemica",
      "Vertigini",
      "Deficit neurologico focale",
      "Sospetta malattia demielinizzante",
      "Crisi epilettica"
    ],
    "RMN PROSTATA MULTIPARAMETRICA": [
      "Rialzo del PSA",
      "Esplorazione rettale sospetta",
      "Pregressa biopsia negativa",
      "Sorveglianza attiva",
      "Stadiazione locale di neoplasia prostatica"
    ]
  }
};
