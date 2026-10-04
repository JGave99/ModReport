# Configurazione da fare nelle dashboard (Supabase, Stripe)

Queste impostazioni non stanno nel codice: vanno fatte a mano da chi ha accesso ai progetti.

## 1. Email di autenticazione (urgente)

Dal 26/09/2024 il server email predefinito di Supabase invia **solo agli indirizzi dei membri del team del progetto**, al massimo 2 email l'ora. Senza un SMTP proprio, chi si registra dall'esterno non riceve la conferma.

1. **Authentication → Emails → SMTP Settings**: attivare "Custom SMTP" con un fornitore UE che firmi un DPA (es. Brevo, Amazon SES in regione UE). Mittente su un sottodominio dedicato (es. `auth.<dominio>`) con SPF, DKIM e DMARC.
2. **Authentication → Rate Limits**: dopo l'SMTP, alzare il limite delle email (es. 30/ora).
3. **Authentication → Logs**: cercare `email_address_not_authorized` e `over_email_send_rate_limit` per capire quante registrazioni sono già fallite.
4. **Authentication → Emails → Templates**: tradurre in italiano i modelli "Confirm signup", "Reset password", "Change email".

## 2. URL di ritorno dei link (urgente)

**Authentication → URL Configuration**:
- **Site URL**: `https://jgave99.github.io/ModReport/app.html` (poi il dominio definitivo).
- **Redirect URLs**: `https://jgave99.github.io/ModReport/**` e, per lo sviluppo, `http://127.0.0.1:8765/**`.

Il codice ora passa `emailRedirectTo`/`redirectTo` verso `app.html`, che gestisce conferma email, recupero password e link scaduti. `index.html` inoltra comunque ad `app.html` i link che atterrano sulla home.

## 3. Chiavi API (entro fine 2026)

Supabase dismette le chiavi `anon`/`service_role` legacy entro fine 2026.
1. **Project Settings → API Keys**: creare la chiave **publishable** (`sb_publishable_…`).
2. Incollarla in `js/config.js` (unico punto del codice in cui compare).
3. Aggiornare le edge function che usano la `service_role` passando alla chiave **secret**.
4. Solo dopo aver verificato che tutto funziona, disattivare le chiavi legacy.

## 4. Pagamenti del 18-24/09/2026

Il checkout Stripe è stato attivo 6 giorni e poi tolto solo dalle pagine.
1. **Stripe (modalità live) → Payments, Customers, Subscriptions** dal 18/09/2026: se ci sono abbonamenti attivi, annullarli e rimborsare (oppure regolarizzare con il commercialista) e avvisare gli utenti.
2. **Supabase → Edge Functions**: eliminare o disattivare `create-checkout-session` e `create-portal-session` finché non sarà pronto il nuovo flusso (Step 7).
3. **Stripe → Developers**: revocare chiavi segrete e webhook non più usati; usare solo la modalità test fino al lancio.

## 5. Da verificare

- **Project Settings → General**: regione del progetto (deve essere UE, es. Francoforte) e piano (Free mette in pausa i progetti inattivi e non ha backup).
- **Database → Backups**: con il piano Pro, backup giornalieri attivi.
