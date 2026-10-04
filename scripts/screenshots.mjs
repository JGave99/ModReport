// Genera le immagini della landing (screenshot reale dell'editor) e l'immagine Open Graph.
// Usa il backend finto: nessun dato reale. Uso: npm run screenshots
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const out = join(root, 'assets/img');
mkdirSync(out, { recursive: true });
const PORT = 8767;
const server = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const base = 'http://127.0.0.1:' + PORT + '/';

const browser = await chromium.launch();
try {
  for (const theme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: 1360, height: 820 }, deviceScaleFactor: 1 });
    await page.route(/supabase\.co/, (r) => r.abort());
    await page.addInitScript((t) => { localStorage.setItem('mr-theme', t); }, theme);
    await page.goto(base + 'app.html?fake=1');
    await page.fill('#login-email', 'demo@modreport.test');
    await page.fill('#login-password', 'password-demo-123');
    await page.click('#btn-signin');
    const consent = page.locator('#view-consent');
    await page.waitForTimeout(400);
    if (await consent.isVisible()) { await page.check('#consent-terms'); await page.check('#consent-clauses'); await page.click('#btn-consent'); }
    await page.waitForSelector('#app-root:not(.hidden)');
    await page.locator('#metodica-row .chip', { hasText: 'RX' }).first().click();
    await page.locator('#esame-body .chip', { hasText: 'RX TORACE 2PR' }).click();
    await page.locator('#indicazione-body .chip', { hasText: 'Dispnea' }).click();
    await page.click('#btn-non-precedenti');
    for (const label of ['Parenchima nella norma', 'Pleura libera', 'Non PNX', 'Cuore nella norma', 'Mediastino nella norma', 'Scheletro indenne']) {
      await page.locator('#referto-body .phrase', { hasText: label }).click();
    }
    await page.evaluate(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); document.querySelector('.builder').scrollTop = 0; });
    await page.screenshot({ path: join(out, 'editor-' + theme + '.png') });
    console.log('ok editor-' + theme + '.png');
    await page.close();
  }

  // Immagine per le anteprime dei link (1200×630)
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(base + 'index.html');
  const logo = readFileSync(join(root, 'assets/logo.svg'), 'utf8');
  const font = base + 'assets/fonts/inter-latin-wght-normal.woff2';
  await og.setContent(`<html><head><style>
    @font-face{ font-family:Inter; src:url(${font}) format('woff2'); font-weight:100 900; }
    body{ margin:0; width:1200px; height:630px; background:#0b0f14; color:#d9e1ea; font-family:Inter, sans-serif; display:flex; flex-direction:column; justify-content:center; padding:0 90px; box-sizing:border-box; }
    .logo{ width:96px; height:96px; margin-bottom:36px; }
    h1{ font-size:64px; line-height:1.1; margin:0 0 22px; color:#fff; letter-spacing:-0.01em; }
    p{ font-size:28px; color:#94a3b8; margin:0; }
    .accent{ color:#4fb3d9; }
  </style></head><body><div class="logo">${logo.replace('<svg ', '<svg width="96" height="96" ')}</div>
  <h1>Il tuo frasario radiologico,<br><span class="accent">sopra qualunque RIS.</span></h1>
  <p>Componi, detta, copia o stampa su carta intestata.</p></body></html>`, { waitUntil: 'load' });
  await og.waitForTimeout(300);
  await og.screenshot({ path: join(out, 'og-image.png') });
  console.log('ok og-image.png');
} finally {
  await browser.close();
  server.kill();
}
