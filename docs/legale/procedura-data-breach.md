# Procedura di gestione delle violazioni dei dati (artt. 33-34 GDPR)

**Responsabile della procedura:** [nome] — **sostituto:** [nome] — telefono/email di emergenza: [ ]

## 1. Rilevare (ora 0)
Possibili segnali: avviso di Supabase/GitHub/Stripe, segnalazione di un utente, accessi anomali nei log (Supabase → Logs), Security Advisor con nuove criticità, codice modificato senza revisione su `main`.
Annotare subito nel registro (sezione 6): data e ora della scoperta, chi l'ha scoperta, cosa si sa.

## 2. Contenere (entro poche ore)
| Situazione | Azione |
|---|---|
| Chiave o account amministrativo compromesso | Ruotare le chiavi API (Supabase → API Keys), cambiare password e MFA degli account GitHub/Supabase/Stripe, revocare i token |
| Sessioni utente compromesse | Supabase → Authentication: disconnettere gli utenti interessati (o tutti) |
| Policy di accesso errata | Applicare la correzione via migrazione; in emergenza rimuovere i permessi della tabella al ruolo `authenticated` |
| Codice malevolo pubblicato sul sito | Ripristinare l'ultima versione buona (git revert + pubblicazione); in emergenza mettere offline il sito |
| File esposti nello Storage | Rendere privato il bucket, revocare i link firmati, rimuovere i file |

## 3. Valutare il rischio (entro 48 ore)
- Quali dati (account, libreria, carte intestate, messaggi, consensi; eventuali dati di pazienti inseriti dagli utenti)?
- Quanti interessati? Quali conseguenze (furto di identità, discredito professionale, esposizione di dati sanitari)?
- Livello: **nessun rischio** (solo registro) · **rischio** (notifica al Garante) · **rischio elevato** (notifica + comunicazione agli interessati).

## 4. Notificare il Garante (entro 72 ore dalla scoperta)
Se la violazione presenta un rischio per gli interessati: notifica tramite il servizio online del Garante (www.garanteprivacy.it → Data breach). Se non tutte le informazioni sono disponibili, notificare comunque e integrare in seguito.

## 5. Comunicare agli interessati (senza ingiustificato ritardo)
In caso di rischio elevato: email agli utenti coinvolti con descrizione chiara, conseguenze probabili, misure adottate e consigli (es. cambiare password, attivare la verifica in due passaggi). Avviso anche nell'app.

## 6. Registro delle violazioni (art. 33.5) — da compilare per OGNI evento, anche se non notificato
| Data scoperta | Descrizione | Dati e interessati coinvolti | Valutazione del rischio | Misure adottate | Notifica Garante (data) | Comunicazione interessati (data) | Note |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## 7. Dopo l'incidente
Analisi delle cause, correzioni (test automatici che riproducono il problema), aggiornamento di questa procedura e della DPIA.
