import { test, expect } from '@playwright/test';
import { login, openFake, chip, DEMO } from './helpers.mjs';

test('accesso: password sbagliata, poi uscita che azzera referto e campi', async ({ page }) => {
  await openFake(page);
  await page.fill('#login-email', DEMO.email);
  await page.fill('#login-password', 'sbagliata');
  await page.click('#btn-signin');
  await expect(page.locator('#login-error')).toHaveText('Email o password non corretti.');
  await login(page);
  await page.fill('#report-text', 'Referto del collega');
  await page.click('#user-menu-btn');
  await page.click('#btn-logout');
  await expect(page.locator('#login-overlay')).not.toHaveClass(/hidden/);
  await expect(page.locator('#login-email')).toHaveValue('');
  await page.fill('#login-email', DEMO.email);
  await page.fill('#login-password', DEMO.password);
  await page.click('#btn-signin');
  await expect(page.locator('#report-text')).toHaveValue('');
});

test('composizione: schede indipendenti, intestazione senza doppioni, cambio esame', async ({ page }) => {
  await login(page);
  await chip(page, '#metodica-row', 'RX');
  await chip(page, '#esame-body', 'RX TORACE 2PR');
  await chip(page, '#esame-body', 'RX ADDOME');
  await expect(page.locator('#report-text')).toHaveValue('RX ADDOME\n');
  await chip(page, '#esame-body', 'RX TORACE 2PR');
  await chip(page, '#indicazione-body', 'Tosse persistente');
  await chip(page, '#indicazione-body', 'Dispnea');
  await page.click('#btn-urgenza-toggle');
  const text = await page.inputValue('#report-text');
  expect(text.match(/indicazione clinica/g)).toHaveLength(1);
  expect(text).toContain("Esame eseguito in regime d'urgenza con indicazione clinica: Tosse persistente; Dispnea");
  await page.locator('#workspace-tabs button', { hasText: '2' }).click();
  await expect(page.locator('#report-text')).toHaveValue('');
  await page.locator('#workspace-tabs button', { hasText: '1' }).click();
  await expect(page.locator('#report-text')).toHaveValue(text);
});

test('Svuota si può annullare; la bozza sopravvive al ricaricamento', async ({ page }) => {
  await login(page);
  await chip(page, '#metodica-row', 'RX');
  await chip(page, '#esame-body', 'RX TORACE 2PR');
  await page.locator('#referto-body .phrase', { hasText: 'Pleura libera' }).click();
  const full = await page.inputValue('#report-text');
  await page.click('#btn-reset');
  await expect(page.locator('#report-text')).toHaveValue('RX TORACE 2PR\n');
  await page.locator('.toast button', { hasText: 'Annulla' }).click();
  await expect(page.locator('#report-text')).toHaveValue(full);
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.locator('#report-text')).toHaveValue(full);
});

test('stampa: anteprima PDF su più pagine con caratteri speciali', async ({ page }) => {
  await login(page);
  await page.fill('#report-text', 'Nodulo ≥ 10 mm → controllo\n' + Array.from({ length: 80 }, (_, i) => 'Riga ' + i).join('\n'));
  await page.click('#btn-open-print');
  await expect(page.locator('#print-signature-info')).toContainText('Dott. Maria Rossi');
  await page.click('#print-generate-btn');
  await expect(page.locator('#print-preview')).toBeVisible();
  await expect(page.locator('#print-warning')).toContainText('pagine');
  await expect(page.locator('#print-message')).toHaveText('');
  const href = await page.getAttribute('#print-download', 'href');
  expect(href).toMatch(/^blob:/);
});

test('archivio: il referto si salva solo su questo computer', async ({ page }) => {
  await login(page);
  await page.fill('#report-text', 'RX TORACE 2PR\nNon addensamenti parenchimali a focolaio.');
  await page.click('#btn-archive');
  await page.locator('dialog[open] button', { hasText: 'Salva' }).click();
  await expect(page.locator('.toast')).toContainText('archivio di questo computer');
  await page.goto('archivio.html');
  await expect(page.locator('.archive-item')).toHaveCount(1);
  const cloud = await page.evaluate(() => window.__fakeSupabase.db.tables.report_archive.length);
  expect(cloud).toBe(0);
});
