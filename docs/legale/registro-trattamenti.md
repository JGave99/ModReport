# Registro delle attività di trattamento (art. 30.1 GDPR)

**Titolare:** [ragione sociale / nome] — [sede] — P.IVA [ ] — contatto privacy [email]
**DPO:** [non nominato / nome e contatti]
**Data ultimo aggiornamento:** [gg/mm/aaaa]

## 1. Gestione degli account e del servizio
- **Finalità:** creazione e gestione dell'account, autenticazione (anche a due fattori), erogazione delle funzioni (libreria, stampa, team).
- **Base giuridica:** art. 6.1.b (contratto).
- **Interessati:** utenti registrati (medici radiologi, specializzandi).
- **Dati:** email, hash della password, fattore TOTP, nome e cognome (facoltativi), libreria di frasi, carte intestate (PDF), appartenenza ai team, messaggi.
- **Destinatari:** Supabase Pte. Ltd. (responsabile, art. 28); hosting del sito [fornitore]; fornitore email [fornitore].
- **Trasferimenti extra UE:** Supabase (Singapore) e GitHub (USA): clausole contrattuali standard; DPF per i fornitori USA aderenti.
- **Conservazione:** fino alla cancellazione dell'account; backup del fornitore entro i cicli ordinari (≈30 giorni).
- **Misure di sicurezza:** TLS; RLS per utente su tutte le tabelle; funzioni server con controllo dei permessi; MFA facoltativa (obbligatoria lato database per chi la attiva); sessione solo nella scheda e uscita per inattività sulle postazioni condivise; CSP e header di sicurezza; nessun dato dei pazienti nel cloud per progetto (archivio referti solo locale, filtro dei dati identificativi nell'importazione).

## 2. Consensi e accettazione dei documenti
- **Finalità:** prova dell'accettazione di Termini e clausole (artt. 1341-1342 c.c.) e della presa visione dell'informativa.
- **Base giuridica:** art. 6.1.c / 6.1.f (difesa dei diritti).
- **Dati:** id utente, versione dei documenti, data, user agent.
- **Conservazione:** durata del rapporto; dopo la cancellazione solo identificativo pseudonimo, data e versione per 10 anni.

## 3. Sicurezza e prevenzione degli abusi
- **Finalità:** log tecnici, limiti di utilizzo, indagine su incidenti.
- **Base giuridica:** art. 6.1.f (legittimo interesse).
- **Dati:** IP, user agent, orari, eventi di autenticazione (registrati dal fornitore).
- **Conservazione:** secondo il fornitore, max 90 giorni.

## 4. Verifica specializzandi *(quando attiva — Step 7)*
- **Finalità:** applicare la tariffa riservata agli specializzandi.
- **Base giuridica:** art. 6.1.b.
- **Dati:** email istituzionale universitaria e data di verifica (preferibile al caricamento di documenti).
- **Conservazione:** fino a scadenza dell'idoneità; eventuali documenti caricati: cancellati entro 30 giorni dall'esito.

## 5. Pagamenti e fatturazione *(quando attivi — Step 7)*
- **Finalità:** incasso degli abbonamenti, emissione e conservazione delle fatture.
- **Base giuridica:** art. 6.1.b e 6.1.c.
- **Dati:** dati di fatturazione, id cliente Stripe, stato dell'abbonamento (i dati della carta li tratta solo Stripe).
- **Destinatari:** Stripe Payments Europe Ltd.; intermediario di fatturazione elettronica; commercialista.
- **Conservazione:** 10 anni (art. 2220 c.c.).

## Trattamenti NON effettuati (per progetto)
- Dati sanitari dei pazienti: i referti restano nel browser dell'utente; l'archivio è locale; i campi del paziente per la stampa non vengono salvati.
- Audio della dettatura: elaborato dal servizio vocale del browser (Google/Microsoft/Apple) nell'ambito del rapporto tra utente e fornitore del browser; ModReport non lo riceve.
- Profilazione, marketing senza consenso, cessione di dati.
