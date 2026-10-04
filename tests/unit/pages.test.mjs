// Controlli statici sulle pagine: CSP presente e coerente, niente script inline o CDN esterni.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
const config = readFileSync(new URL('js/config.js', root), 'utf8');
const supabaseHost = new URL(config.match(/SUPABASE_URL:\s*'([^']+)'/)[1]).host;
const headers = readFileSync(new URL('_headers', root), 'utf8');

test('ogni pagina ha la CSP con l\'host Supabase configurato', () => {
  for (const p of pages) {
    const html = readFileSync(new URL(p, root), 'utf8');
    const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
    assert.ok(csp, p + ': CSP mancante');
    assert.ok(csp.includes('https://' + supabaseHost) && csp.includes('wss://' + supabaseHost), p + ': connect-src non allineato a js/config.js');
    assert.ok(headers.includes(csp), p + ': CSP diversa da quella in _headers');
  }
});

test('nessuno script inline e nessuna risorsa da CDN o Google Fonts', () => {
  for (const p of pages) {
    const html = readFileSync(new URL(p, root), 'utf8');
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), p + ': script inline');
    assert.ok(!/(cdn\.jsdelivr|cdnjs|unpkg|googleapis|gstatic)/i.test(html), p + ': risorsa esterna');
    assert.ok(!/\son[a-z]+="/i.test(html), p + ': gestore di eventi inline');
  }
});
