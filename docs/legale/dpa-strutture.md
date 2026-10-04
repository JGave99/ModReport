# Accordo sul trattamento dei dati (art. 28 GDPR) — schema per strutture sanitarie

Da usare solo se una struttura (studio, poliambulatorio, casa di cura) acquista ModReport per i propri medici. Struttura = titolare; fornitore di ModReport = responsabile del trattamento. Da far redigere/validare da un legale.

## Contenuti minimi (art. 28.3)
1. **Oggetto e durata:** fornitura del servizio ModReport per la durata del contratto.
2. **Natura e finalità:** gestione degli account dei medici della struttura, libreria condivisa, carte intestate, team.
3. **Tipi di dati e interessati:** dati degli utenti (medici). Clausola esplicita: *il servizio non è destinato ai dati dei pazienti*; la struttura istruisce i propri medici a non inserirli (in alternativa: edizione "solo locale" installata nella rete della struttura).
4. **Istruzioni documentate** del titolare; obbligo di informarlo se un'istruzione viola il GDPR.
5. **Riservatezza** del personale autorizzato.
6. **Misure di sicurezza (art. 32):** allegato tecnico (RLS, MFA, cifratura in transito e a riposo, backup, CSP, gestione degli incidenti).
7. **Sub-responsabili:** elenco (Supabase, hosting, email, Stripe) e preavviso di 30 giorni per le modifiche, con diritto di opposizione.
8. **Assistenza** per l'esercizio dei diritti degli interessati e per DPIA/consultazioni.
9. **Violazioni dei dati:** notifica al titolare senza ingiustificato ritardo (entro 24-48 ore).
10. **Fine del contratto:** restituzione (export) e cancellazione dei dati entro 30 giorni.
11. **Audit:** documentazione e questionari; audit in loco con preavviso ragionevole.
12. **Trasferimenti extra UE:** solo con garanzie adeguate (SCC/DPF).

## Note per la PA
Per ASL/AO/IRCCS pubblici serve la qualificazione dei servizi cloud dell'Agenzia per la Cybersicurezza Nazionale (ACN), oggi non disponibile: valutare l'edizione "solo locale".
