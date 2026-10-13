// Controlli statici sulle pagine: CSP presente e coerente, niente script inline o CDN esterni.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
const config = readFileSync(new URL('js/config.js', root), 'utf8');
// Tutti i progetti Supabase configurati (produzione e prova) devono essere ammessi dalla CSP.
const supabaseHosts = [...config.matchAll(/SUPABASE_URL:\s*'([^']+)'/g)].map((m) => new URL(m[1]).host);
const headers = readFileSync(new URL('_headers', root), 'utf8');

test('ogni pagina ha la CSP con l\'host Supabase configurato', () => {
  for (const p of pages) {
    const html = readFileSync(new URL(p, root), 'utf8');
    const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
    assert.ok(csp, p + ': CSP mancante');
    for (const host of supabaseHosts) {
      assert.ok(csp.includes('https://' + host) && csp.includes('wss://' + host), p + ': connect-src non allineato a js/config.js (' + host + ')');
    }
    assert.ok(headers.includes(csp), p + ': CSP diversa da quella in _headers');
  }
});

test('nessuno script inline e nessuna risorsa da CDN o Google Fonts', () => {
  for (const p of pages) {
    const html = readFileSync(new URL(p, root), 'utf8');
    // Unica eccezione: i dati strutturati JSON-LD, che il browser non esegue.
    assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(html), p + ': script inline');
    assert.ok(!/(cdn\.jsdelivr|cdnjs|unpkg|googleapis|gstatic)/i.test(html), p + ': risorsa esterna');
    assert.ok(!/\son[a-z]+="/i.test(html), p + ': gestore di eventi inline');
  }
});

test('i dati strutturati JSON-LD sono JSON valido', () => {
  for (const p of pages) {
    const html = readFileSync(new URL(p, root), 'utf8');
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(m[1]), p + ': JSON-LD non valido');
    }
  }
});
