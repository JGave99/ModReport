import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authErrorMessage, isExistingUserSignup, readAuthErrorFromHash } from '../../js/lib/auth-messages.js';
import { escapeHtml } from '../../js/lib/dom.js';

test('errori Supabase tradotti per codice e per testo', () => {
  assert.equal(authErrorMessage({ code: 'invalid_credentials' }), 'Email o password non corretti.');
  assert.equal(authErrorMessage({ message: 'Invalid login credentials' }), 'Email o password non corretti.');
  assert.match(authErrorMessage({ message: 'Failed to fetch' }), /Connessione/);
  assert.match(authErrorMessage({ code: 'qualcosa_di_nuovo', message: 'x' }), /qualcosa_di_nuovo/);
});

test('registrazione con email già esistente riconosciuta', () => {
  assert.equal(isExistingUserSignup({ user: { identities: [] } }), true);
  assert.equal(isExistingUserSignup({ user: { identities: [{}] } }), false);
});

test('errore nel fragment del link di conferma', () => {
  assert.match(readAuthErrorFromHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'), /scaduto/);
  assert.equal(readAuthErrorFromHash('#access_token=abc&type=signup'), null);
});

test('escapeHtml protegge anche le virgolette negli attributi', () => {
  assert.equal(escapeHtml('a"b\'c<d>&'), 'a&quot;b&#39;c&lt;d&gt;&amp;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(12), '12');
});
