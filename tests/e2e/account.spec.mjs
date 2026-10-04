import { test, expect } from '@playwright/test';
import { login } from './helpers.mjs';

test('libreria: i menu restano sull\'esame scelto e il salvataggio è confermato', async ({ page }) => {
  await login(page);
  await page.goto('account.html');
  await page.click('[data-tab=tab-personalizza]');
  await page.selectOption('#new-indicazione-esame', 'TC TORACE');
  await page.fill('#new-indicazione-text', 'Prima');
  await page.click('#add-indicazione-btn');
  await expect(page.locator('#new-indicazione-esame')).toHaveValue('TC TORACE');
  await expect(page.locator('#lib-status')).toHaveText('Libreria salvata ✓');
});

test('libreria non caricata: modifiche bloccate finché non si riprova', async ({ page }) => {
  await login(page);
  await page.evaluate(() => sessionStorage.setItem('fake-supabase-fail', JSON.stringify({ 'user_data:select': 'rete giù' })));
  await page.goto('account.html');
  await page.click('[data-tab=tab-personalizza]');
  await expect(page.locator('#add-metodica-btn')).toBeDisabled();
  await page.locator('#tab-personalizza [data-lib-retry]').click();
  await expect(page.locator('#add-metodica-btn')).toBeEnabled();
});

test('importazione: le frasi con dati del paziente non si possono includere', async ({ page }) => {
  await login(page);
  await page.goto('account.html');
  await page.click('[data-tab=tab-import]');
  await page.fill('#ai-report-text', 'RX TORACE 2PR\nPaziente: ROSSI MARIO nato il 01/02/1950\nNon addensamenti parenchimali a focolaio. Aria libera in addome.');
  await page.click('#ai-analyze-btn');
  await expect(page.locator('#ai-pii-warning')).toContainText('dati identificativi');
  const cards = page.locator('#ai-voci-list .settings-section');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).locator('button')).toBeDisabled();
  await expect(cards.nth(2).locator('select')).toHaveValue('patologico');
  await cards.nth(1).locator('button').click();
  await expect(page.locator('#ai-add-message')).toContainText('aggiunta alla libreria');
});
