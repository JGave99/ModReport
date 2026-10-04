// Controlli prima della pubblicazione o dell'attivazione dei pagamenti. Uso: npm run check:lancio
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const results = [];
const check = (ok, label, hint = '') => results.push({ ok, label, hint });

const sandbox = {};
new Function('window', read('js/legal-config.js'))(sandbox);
const L = sandbox.MR_LEGAL || {};
for (const [key, label] of [['TITOLARE', 'Titolare / ragione sociale'], ['FORMA', 'Forma giuridica'], ['SEDE', 'Sede'], ['PIVA', 'Partita IVA'], ['EMAIL', 'Email di contatto'], ['FORO', 'Foro competente'], ['SUPABASE_REGIONE', 'Regione dei server Supabase'], ['EMAIL_PROVIDER', 'Fornitore SMTP delle email']]) {
  check(!!String(L[key] || '').trim(), label, 'js/legal-config.js → ' + key);
}
check(!/github pages/i.test(L.HOSTING || ''), 'Hosting diverso da GitHub Pages (i termini di GitHub vietano un SaaS commerciale)', 'js/legal-config.js → HOSTING e _headers');

check(!/github\.io/.test(read('index.html') + read('sitemap.xml') + read('robots.txt')), 'Dominio definitivo in canonical, Open Graph, sitemap.xml e robots.txt', 'index.html, sitemap.xml, robots.txt');

const cfg = read('js/config.js');
check(!/SUPABASE_KEY:\s*'eyJ/.test(cfg), 'Chiave Supabase "publishable" al posto della chiave anon legacy (dismessa a fine 2026)', 'js/config.js');
check(existsSync(new URL('_headers', root)), 'Header di sicurezza (_headers)');
for (const f of ['supabase/migrations/20261004120200_security.sql', 'supabase/migrations/20261004130000_privacy.sql']) {
  check(existsSync(new URL(f, root)), 'Migrazione presente: ' + f, 'applicarla in produzione (supabase/README.md)');
}

const missing = results.filter((r) => !r.ok);
for (const r of results) console.log((r.ok ? '✔' : '✘') + ' ' + r.label + (r.ok || !r.hint ? '' : '  (' + r.hint + ')'));
console.log('\n' + (missing.length ? missing.length + ' punti da completare prima del lancio.' : 'Tutto pronto.'));
console.log('Restano da verificare a mano nelle dashboard: SMTP, URL di ritorno, migrazioni applicate, MFA attiva (docs/SUPABASE.md).');
process.exitCode = missing.length ? 1 : 0;
