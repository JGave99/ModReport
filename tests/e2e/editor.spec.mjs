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
  await chip(page, '#indicazione-body', 'Tosse');
  await chip(page, '#indicazione-body', 'Dispnea');
  await page.click('#btn-urgenza-toggle');
  const text = await page.inputValue('#report-text');
  expect(text.match(/indicazione clinica/g)).toHaveLength(1);
  expect(text).toContain("Esame eseguito in regime d'urgenza con indicazione clinica: Tosse; Dispnea");
  await page.locator('#workspace-tabs button', { hasText: '2' }).click();
  await expect(page.locator('#report-text')).toHaveValue('');
  await page.locator('#workspace-tabs button', { hasText: '1' }).click();
  await expect(page.locator('#report-text')).toHaveValue(text);
});

test('Svuota si può annullare; la bozza sopravvive al ricaricamento', async ({ page }) => {
  await login(page);
  await chip(page, '#metodica-row', 'RX');
  await chip(page, '#esame-body', 'RX TORACE 2PR');
  await page.locator('#referto-body .phrase', { hasText: 'Cardiomegalia' }).click();
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

test('configurazione guidata: le metodiche non scelte spariscono', async ({ page }) => {
  // Accesso senza helper login
  await openFake(page, 'app.html');
  await page.fill('#login-email', DEMO.email);
  await page.fill('#login-password', DEMO.password);
  await page.click('#btn-signin');
  const consent = page.locator('#view-consent');
  await expect(consent.or(page.locator('#app-root:not(.hidden)'))).toBeVisible();
  if (await consent.isVisible()) {
    await page.check('#consent-terms');
    await page.check('#consent-clauses');
    await page.click('#btn-consent');
  }
  const onboarding = page.locator('#onboarding');
  await expect(onboarding).toBeVisible();
  await page.click('#onb-next');
  // Rimuove la spunta alla casella con value 'RMN'
  await page.locator('#onb-metodiche input[value="RMN"]').uncheck();
  await page.click('#onb-next');
  await page.click('#onb-next');
  await expect(onboarding).not.toBeVisible();
  await expect(page.locator('#metodica-row button', { hasText: 'RMN' })).toHaveCount(0);
  await expect(page.locator('#metodica-row button', { hasText: 'RX' })).toHaveCount(1);
});

test('referto strutturato: negativo, variante, campi con Tab, controlli, copia per sezione, Ctrl+K', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await login(page);
  await chip(page, '#metodica-row', 'RX');
  await chip(page, '#esame-body', 'RX TORACE 2PR');
  await expect(page.locator('#referto-body')).not.toContainText('Conclusioni');
  await expect(page.locator('#dose-row')).toHaveCount(0);
  await page.click('#btn-negativo');
  const ta = page.locator('#report-text');
  // Referto negativo proposto dalla libreria predefinita per questo esame
  await expect(ta).toHaveValue(/Non addensamenti parenchimali a focolaio né versamento pleurico\.\nProfilo cardiomediastinico nei limiti\./);
  const normal = await ta.inputValue();
  expect(normal).not.toContain('Conclusioni');
  // La variante patologica sostituisce la frase normale dello stesso distretto
  await page.locator('#referto-body .phrase--abnormal', { hasText: 'Cardiomegalia' }).first().click();
  const withVariant = await ta.inputValue();
  expect(withVariant.split('\n').length).toBe(normal.split('\n').length);
  expect(withVariant).toMatch(/\[[^\]]+\]/);
  // Tab porta al campo; la barra propone le scelte; un numero sceglie
  await ta.click();
  await ta.press('Control+Home');
  await ta.press('Tab');
  const selected = await ta.evaluate((t) => t.value.slice(t.selectionStart, t.selectionEnd));
  expect(selected).toMatch(/^(\[.+\]|_{3,})$/);
  // Con campi ancora da compilare, copiare chiede conferma
  await page.click('#btn-copy');
  await expect(page.locator('dialog[open]')).toContainText(/camp[oi] da compilare/);
  await page.locator('dialog[open] button[type=submit]').click();
  await expect(page.locator('.toast').last()).toContainText('Copiato');
  // Copia solo il referto, senza indicazione
  await page.click('#btn-copy-more');
  await expect(page.locator('#copy-menu [data-copy="conclusioni"]')).toHaveCount(0);
  await page.click('#copy-menu [data-copy="referto"]');
  await page.locator('dialog[open] button[type=submit]').click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('Ingrandimento');
  // Ricerca rapida
  await page.keyboard.press('Control+k');
  await expect(page.locator('#palette')).toBeVisible();
  await page.fill('#palette-input', 'tc encefalo');
  await page.keyboard.press('Enter');
  await expect(page.locator('#report-context')).toContainText('TC ENCEFALO');
});

test('referto negativo personalizzato: si scelgono le frasi, si salvano nella libreria, si torna ai predefiniti', async ({ page }) => {
  await login(page);
  await chip(page, '#metodica-row', 'RX');
  await chip(page, '#esame-body', 'RX TORACE 2PR');
  await page.click('#btn-negativo-config');
  const dialog = page.locator('#negativo-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#negativo-esame')).toHaveText('RX TORACE 2PR');
  // Tengo solo la frase del versamento pleurico
  const boxes = dialog.locator('input[type=checkbox]');
  const count = await boxes.count();
  for (let i = 0; i < count; i++) await boxes.nth(i).uncheck();
  await dialog.locator('label', { hasText: 'Non versamento pleurico.' }).locator('input').check();
  await page.click('#negativo-save');
  await expect(dialog).not.toBeVisible();
  await page.click('#btn-negativo');
  const ta = page.locator('#report-text');
  await expect(ta).toHaveValue(/Non versamento pleurico\./);
  expect((await ta.inputValue()).split('\n').filter((l) => l.trim()).length).toBe(2); // esame + una frase
  // La scelta resta dopo il ricaricamento (salvata nella libreria)
  await page.reload();
  await page.waitForSelector('body[data-ready="1"]');
  await chip(page, '#metodica-row', 'RX');
  await chip(page, '#esame-body', 'RX TORACE 2PR');
  await page.click('#btn-negativo-config');
  await expect(dialog.locator('input:checked')).toHaveCount(1);
  await page.click('#negativo-default');
  await expect(dialog).not.toBeVisible();
  await page.click('#btn-negativo-config');
  await expect(dialog.locator('input:checked')).toHaveCount(2); // la proposta della libreria predefinita
});
