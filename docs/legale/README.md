# Documenti di conformità (uso interno)

Modelli da completare e far verificare a un legale/consulente privacy prima del lancio. Non sono collegati dalle pagine del sito, ma il repository è pubblico: non inserirvi dati riservati (contratti firmati, registro delle violazioni compilato) finché il repository resta pubblico.

| Documento | A cosa serve | Obbligo |
|---|---|---|
| [registro-trattamenti.md](registro-trattamenti.md) | Registro delle attività di trattamento del titolare | Art. 30 GDPR (consigliato anche sotto i 250 dipendenti: tratta dati di professionisti sanitari in modo non occasionale) |
| [procedura-data-breach.md](procedura-data-breach.md) | Cosa fare in caso di violazione dei dati | Artt. 33-34 GDPR (notifica al Garante entro 72 ore) |
| [dpia-bozza.md](dpia-bozza.md) | Valutazione d'impatto sui rischi per gli interessati | Art. 35 GDPR (da valutare; consigliata per il contesto sanitario) |
| [dpa-strutture.md](dpa-strutture.md) | Accordo sul trattamento da proporre alle strutture sanitarie clienti | Art. 28 GDPR (solo per la vendita B2B) |
| [destinazione-uso.md](destinazione-uso.md) | Perché ModReport non è un dispositivo medico e cosa non aggiungere | Reg. (UE) 2017/745, MDCG 2019-11 |

I dati del titolare si inseriscono una sola volta in `js/legal-config.js` (usati da informativa, termini e piè di pagina). `npm run check:lancio` segnala ciò che manca.
