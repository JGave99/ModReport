// Genera le icone PNG (apple-touch, PWA) da assets/logo.svg con Chromium di Playwright. Uso: npm run render-icons
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const svg = readFileSync(join(root, 'assets/logo.svg'), 'utf8');
const out = join(root, 'assets/icons');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const shots = [
  ['apple-touch-icon.png', 180, 1, '#0b1120'],
  ['icon-192.png', 192, 1, 'transparent'],
  ['icon-512.png', 512, 1, 'transparent'],
  ['icon-maskable-512.png', 512, 0.72, '#0b1120'],
  ['favicon-32.png', 32, 1, 'transparent'],
  ['og-logo-512.png', 512, 0.6, '#0b0f14'],
];
for (const [name, size, scale, bg] of shots) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${bg};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
    <div style="width:${Math.round(size * scale)}px;height:${Math.round(size * scale)}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  await page.screenshot({ path: join(out, name), omitBackground: bg === 'transparent' });
  console.log('ok', name);
}
await browser.close();
