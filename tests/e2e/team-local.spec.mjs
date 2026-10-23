import { test, expect } from '@playwright/test';
import { login } from './helpers.mjs';

test('team: creazione, messaggio con nome deciso dal server, invito con scadenza', async ({ page }) => {
  await login(page);
  await page.goto('team.html');
  await page.fill('#create-team-name', 'Studio Rossi');
  await page.click('#btn-create-team');
  await expect(page.locator('#page-root')).toBeVisible();
  await expect(page.locator('.channel-item .chname')).toHaveText(['avvisi', 'generale']);
  await page.locator('.channel-item', { hasText: 'generale' }).click();
  await page.fill('#msg-input', 'Buongiorno');
  await page.click('#btn-send');
  await expect(page.locator('.chat-msg .msg-name')).toHaveText('Maria Rossi');
  await page.click('#btn-invite');
  await page.click('#invite-generate');
  await expect(page.locator('#invite-link')).toContainText('team.html?invite=');
  await expect(page.locator('#invite-list .list-item')).toHaveCount(1);
});

test('modalità locale: si usa senza account e i dati restano nel browser', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort());
  await page.goto('app.html');
  await page.click('#btn-local-mode');
  await expect(page.locator('#app-root')).not.toHaveClass(/hidden/);
  await expect(page.locator('#local-badge')).toBeVisible();
  await expect(page.locator('#link-team')).toBeHidden();
  await page.goto('account.html');
  await expect(page.locator('#local-card')).toBeVisible();
  await expect(page.locator('#mfa-card')).toBeHidden();
});

test('libreria del team: l\'amministratore la crea, l\'editor la usa', async ({ page }) => {
  await login(page);
  await page.goto('team.html');
  await page.fill('#create-team-name', 'Studio Rossi');
  await page.click('#btn-create-team');
  await expect(page.locator('#page-root')).toBeVisible();
  await page.goto('account.html#libreria');
  await expect(page.locator('#lib-source-box')).toBeVisible();
  await page.selectOption('#lib-source', { index: 1 });
  await page.click('#lib-team-create');
  await expect(page.locator('#lib-source-note')).toContainText('Studio Rossi');
  await expect.poll(() => page.evaluate(() => window.__fakeSupabase.db.tables.team_libraries.length)).toBe(1);
  await page.locator('.lib-tree__item', { hasText: 'RX TORACE 2PR' }).first().click();
  await page.getByRole('button', { name: 'Aggiungi indicazione' }).click();
  await page.locator('.lib-section input[aria-label^="Indicazione"]').last().fill('Indicazione del team');
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__fakeSupabase.db.tables.team_libraries[0].data))).toContain('Indicazione del team');
  const personal = await page.evaluate(() => JSON.stringify((window.__fakeSupabase.db.tables.user_data[0] || {}).data || {}));
  expect(personal).not.toContain('Indicazione del team');
  await page.goto('app.html');
  await expect(page.locator('#lib-source-editor-box')).toBeVisible();
  await page.selectOption('#lib-source-editor', { label: 'Studio Rossi' });
  await page.locator('#metodica-row .chip', { hasText: 'RX' }).click();
  await page.locator('#esame-body .chip', { hasText: 'RX TORACE 2PR' }).click();
  await expect(page.locator('#indicazione-body .chip', { hasText: 'Indicazione del team' })).toBeVisible();
});
