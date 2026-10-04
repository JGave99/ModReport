# Valutazione d'impatto sulla protezione dei dati — bozza (art. 35 GDPR)

**Stato:** bozza tecnica del 04/10/2026, da completare con il titolare e un consulente privacy.

## 1. Descrizione del trattamento
Servizio web per radiologi che compongono referti con frasi personalizzabili. Dati nel cloud: account, profilo, libreria di frasi, carte intestate, team e messaggi, consensi. I referti restano nel browser; l'archivio è locale (IndexedDB); la dettatura usa il servizio del browser.

## 2. Necessità della DPIA
Il trattamento non rientra pienamente nell'elenco del Garante (provv. 467/2018), ma riguarda professionisti sanitari in un contesto in cui dati di pazienti potrebbero essere inseriti per errore: la DPIA è **consigliata** e diventa necessaria se si offre il servizio a strutture con dati dei pazienti.

## 3. Necessità e proporzionalità
- Minimizzazione: nessun dato dei pazienti nel cloud per progetto; nome e cognome facoltativi; niente analytics di terze parti.
- Limitazione della conservazione: vedi informativa e registro.
- Trasparenza: informativa completa; avviso alla prima dettatura; avvisi nell'importazione.
- Diritti: cancellazione e portabilità self-service.

## 4. Rischi e misure
| Rischio | Probabilità | Gravità | Misure | Rischio residuo |
|---|---|---|---|---|
| Dati di pazienti inseriti nella libreria o nella chat | Media | Alta | Divieto nei Termini; filtro automatico nell'importazione; avvisi in chat; archivio solo locale | Medio-basso |
| Accesso di altri utenti ai dati (policy errate) | Bassa | Alta | RLS su tutte le tabelle, funzioni server, test automatici delle regole, Security Advisor | Basso |
| Postazioni condivise (sessione lasciata aperta) | Media | Media | Modalità "postazione condivisa": sessione solo nella scheda, uscita per inattività; "Esci" azzera il referto | Basso |
| Furto di credenziali | Media | Media | Password ≥ 12 caratteri, MFA, conferma della password per le azioni sensibili | Basso |
| Audio dettato con dati di pazienti inviato al fornitore del browser | Media | Alta | Avviso al primo uso, possibilità di disattivare, indicazione nei Termini | Medio (dipende dall'utente) |
| Compromissione della catena di fornitura (librerie, CDN) | Bassa | Alta | Librerie in locale con versione fissa, CSP, nessuno script inline | Basso |
| Indisponibilità/perdita della libreria | Bassa | Media | Salvataggio con controllo dei conflitti, export, backup del fornitore (piano Pro) | Basso |

## 5. Conclusione
[da completare: rischio residuo accettabile? Necessità di consultazione preventiva (art. 36)? Data e firma del titolare; parere del DPO se nominato.]
