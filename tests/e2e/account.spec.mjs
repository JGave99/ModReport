import { test, expect } from '@playwright/test';
import { login } from './helpers.mjs';

test('libreria: modifica in linea salvata, esame scelto mantenuto', async ({ page }) => {
  await login(page);
  await page.goto('account.html#libreria');
  await page.locator('.lib-tree__item', { hasText: 'TC TORACE' }).first().click();
  await expect(page.locator('.lib-detail__head h3')).toHaveText('TC TORACE');
  await page.getByRole('button', { name: 'Aggiungi indicazione' }).click();
  await page.locator('.lib-section input[aria-label^="Indicazione"]').last().fill('Prima');
  await expect(page.locator('#lib-status')).toHaveText('Libreria salvata ✓');
  await expect(page.locator('.lib-detail__head h3')).toHaveText('TC TORACE');
  const saved = await page.evaluate(() => window.__fakeSupabase.db.tables.user_data[0].data.indicazioniByEsame['TC TORACE']);
  expect(saved).toContain('Prima');
});

test('libreria non caricata: modifiche bloccate finché non si riprova', async ({ page }) => {
  await login(page);
  await page.evaluate(() => sessionStorage.setItem('fake-supabase-fail', JSON.stringify({ 'user_data:select': 'rete giù' })));
  await page.goto('account.html#libreria');
  await expect(page.locator('#panel-libreria [data-lib-banner]')).toBeVisible();
  await expect(page.locator('#btn-reset-data')).toBeDisabled();
  expect(await page.evaluate(() => document.getElementById('library-editor').inert)).toBe(true);
  await page.locator('#panel-libreria [data-lib-retry]').click();
  await expect(page.locator('#btn-reset-data')).toBeEnabled();
  expect(await page.evaluate(() => document.getElementById('library-editor').inert)).toBe(false);
});

test('importazione: le frasi con dati del paziente non si possono includere', async ({ page }) => {
  await login(page);
  await page.goto('account.html#importa');
  await page.fill('#ai-report-text', 'RX TORACE 2PR\nPaziente: ROSSI MARIO nato il 01/02/1950\nNon addensamenti parenchimali a focolaio. Aria libera in addome.');
  await page.click('#ai-analyze-btn');
  await expect(page.locator('#ai-pii-warning')).toContainText('dati identificativi');
  const cards = page.locator('#ai-voci-list .import-voce');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).locator('button')).toBeDisabled();
  await expect(cards.nth(2).locator('select')).toHaveValue('patologico');
  await cards.nth(1).locator('button').click();
  await expect(page.locator('#ai-add-message')).toContainText('aggiunta alla libreria');
});

test('versioni: salva, modifica, ripristina', async ({ page }) => {
  await login(page);
  await page.goto('account.html#libreria');
  await page.click('#lib-versions');
  await page.fill('#version-label', 'Prima');
  await page.locator('#version-form button[type=submit]').click();
  await expect(page.locator('#versions-message')).toHaveText('Versione salvata.');
  await expect(page.locator('#versions-list .version-row', { hasText: 'Prima' })).toHaveCount(1);
  await page.locator('#versions-dialog [data-close]').click();
  await page.locator('.lib-tree__item', { hasText: 'TC TORACE' }).first().click();
  await page.getByRole('button', { name: 'Aggiungi indicazione' }).click();
  await page.locator('.lib-section input[aria-label^="Indicazione"]').last().fill('Modificata');
  await expect(page.locator('#lib-status')).toHaveText('Libreria salvata ✓');
  await page.click('#lib-versions');
  await page.locator('#versions-list .version-row', { hasText: 'Prima' }).locator('[data-restore]').click();
  await page.locator('dialog.dialog[open] button[type=submit]', { hasText: 'Ripristina' }).click();
  await expect(page.locator('#versions-dialog')).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__fakeSupabase.db.tables.user_data[0].data.indicazioniByEsame['TC TORACE'])).not.toContain('Modificata');
  const versions = await page.evaluate(() => window.__fakeSupabase.db.tables.library_versions.map((v) => v.reason));
  expect(versions).toEqual(expect.arrayContaining(['manuale', 'ripristino']));
});
