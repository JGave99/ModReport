import { test, expect } from '@playwright/test';
import { login } from './helpers.mjs';

test('team: creazione, messaggio con nome deciso dal server, invito con scadenza', async ({ page }) => {
  await login(page);
  await page.goto('team.html');
  await page.fill('#create-team-name', 'Studio Rossi');
  await page.click('#btn-create-team');
  await expect(page.locator('#page-root')).toBeVisible();
  await expect(page.locator('.channel-item .chname')).toHaveText(['generale']);
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
