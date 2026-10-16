# Modelli delle email di Supabase (in italiano)

Da incollare in Supabase → **Authentication → Emails → Templates**, in entrambi i progetti, produzione e prova.
Per ogni modello si compilano due campi: *Subject* e *Message body*, nella vista "Source".
Le parti tra `{{ }}` le compila Supabase: non vanno modificate.

## Confirm signup

**Subject:** `Conferma il tuo account ModReport`

```html
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2933;max-width:520px">
  <p><strong>ModReport</strong></p>
  <p>Ciao,</p>
  <p>per completare la registrazione conferma il tuo indirizzo email:</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2f6fb2;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Conferma l'email</a></p>
  <p style="font-size:13px;color:#52606d">Se non hai chiesto tu di registrarti, ignora questa email: senza conferma l'account non viene attivato.</p>
</div>
```

## Reset password

**Subject:** `Reimposta la password di ModReport`

```html
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2933;max-width:520px">
  <p><strong>ModReport</strong></p>
  <p>Ciao,</p>
  <p>abbiamo ricevuto una richiesta di reimpostazione della password per {{ .Email }}.</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2f6fb2;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Scegli una nuova password</a></p>
  <p style="font-size:13px;color:#52606d">Il link vale per poco tempo e una sola volta. Se non l'hai chiesto tu, ignora questa email: la password attuale resta valida.</p>
</div>
```

## Change email address

**Subject:** `Conferma il nuovo indirizzo email`

```html
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2933;max-width:520px">
  <p><strong>ModReport</strong></p>
  <p>Ciao,</p>
  <p>hai chiesto di cambiare l'email del tuo account da {{ .Email }} a {{ .NewEmail }}. Per confermare:</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2f6fb2;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Conferma il nuovo indirizzo</a></p>
  <p style="font-size:13px;color:#52606d">Se non l'hai chiesto tu, ignora questa email e cambia la password del tuo account.</p>
</div>
```
