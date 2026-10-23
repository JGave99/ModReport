import { test, expect } from '@playwright/test';
import { login, openFake } from './helpers.mjs';

const LUCA = { id: '33333333-3333-4333-8333-333333333333', email: 'luca@studio.test', password: 'password-luca-1234' };

async function loginAs(page, who) {
  await page.evaluate(() => sessionStorage.removeItem('fake-supabase-session'));
  await openFake(page, 'app.html');
  await page.fill('#login-email', who.email);
  await page.fill('#login-password', who.password);
  await page.click('#btn-signin');
  const consent = page.locator('#view-consent');
  await page.waitForFunction(() => !document.getElementById('view-consent').hidden || !document.getElementById('app-root').classList.contains('hidden'));
  if (await consent.isVisible()) {
    await page.check('#consent-terms');
    await page.check('#consent-clauses');
    await page.click('#btn-consent');
  }
  await expect(page.locator('body[data-ready]')).toHaveCount(1);
  if (await page.locator('#onboarding').isVisible()) await page.click('#onb-skip');
}

test('team: impostazioni, approvazione, qualifica, canale Avvisi (issue #4)', async ({ page }) => {
  await login(page);
  await page.evaluate((l) => {
    const f = window.__fakeSupabase;
    f.db.users.push({ id: l.id, email: l.email, password: l.password, confirmed: true, user_metadata: { nome: 'Luca' }, created_at: new Date().toISOString() });
    f.save();
  }, LUCA);
  await page.goto('team.html');
  await page.fill('#create-team-name', 'Radiologia SM');
  await page.selectOption('#create-team-tipo', 'reparto');
  await page.fill('#create-team-sede', 'Ospedale San Marco');
  await page.click('#btn-create-team');
  await expect(page.locator('.channel-item .chname')).toHaveText(['avvisi', 'generale']);
  // Impostazioni (proprietario): approvazione obbligatoria, sedi e tipi di turno
  await page.click('#btn-settings');
  await expect(page.locator('#team-sede')).toHaveValue('Ospedale San Marco');
  await page.check('#team-approvazione');
  await page.click('#team-save');
  await expect(page.locator('#team-msg')).toHaveText('Salvato.');
  await page.fill('#cfg-sedi', 'Pronto Soccorso\nTC');
  await page.click('#cfg-add-tipo');
  await page.locator('#cfg-tipi input[type=text]').fill('Notte PS');
  await page.click('#cfg-save');
  await expect(page.locator('#cfg-msg')).toHaveText('Salvato.');
  await page.locator('#settings-panel [data-close]').click();
  // Invito
  await page.click('#btn-invite');
  await page.click('#invite-generate');
  const link = await page.locator('#invite-link').textContent();
  const code = new URL(link).searchParams.get('invite');
  // Luca entra: resta in attesa
  await loginAs(page, LUCA);
  await page.goto('team.html?invite=' + code);
  await page.click('#btn-join-code');
  await expect(page.locator('#join-msg')).toContainText('Richiesta inviata');
  await expect(page.locator('#pending-box')).toContainText('Radiologia SM');
  // Il proprietario accetta
  await loginAs(page, { email: 'demo@modreport.test', password: 'password-demo-123' });
  await page.goto('team.html');
  await page.click('#btn-members');
  await expect(page.locator('#pending-requests')).toContainText('Richieste di ingresso (1)');
  await page.locator('#pending-requests button', { hasText: 'Accetta' }).click();
  await expect(page.locator('#members-list')).toContainText('Luca');
  // Luca è membro: non vede le impostazioni, non scrive negli Avvisi, imposta la qualifica
  await loginAs(page, LUCA);
  await page.goto('team.html');
  await expect(page.locator('#btn-settings')).toBeHidden();
  await expect(page.locator('#btn-new-channel')).toBeHidden();
  await page.locator('.channel-item', { hasText: 'avvisi' }).click();
  await expect(page.locator('#composer')).toBeHidden();
  await expect(page.locator('#composer-note')).toBeVisible();
  await page.locator('.channel-item', { hasText: 'generale' }).click();
  await expect(page.locator('#composer')).toBeVisible();
  await page.click('#btn-members');
  await page.locator('#members-list select[aria-label="La tua qualifica nel team"]').selectOption('specializzando');
  await expect(page.locator('#members-msg')).toHaveText('Qualifica salvata.');
});

test('team: il proprietario elimina il team scrivendone il nome', async ({ page }) => {
  await login(page);
  await page.goto('team.html');
  await page.fill('#create-team-name', 'Da eliminare');
  await page.click('#btn-create-team');
  await page.click('#btn-settings');
  await page.click('#btn-delete-team');
  const dialog = page.locator('dialog.dialog[open]').last();
  await dialog.locator('input').fill('nome sbagliato');
  await dialog.locator('button[type=submit]').click();
  await expect(dialog.locator('.msg')).toHaveText('Il nome non coincide.');
  await dialog.locator('input').fill('da eliminare');
  await dialog.locator('button[type=submit]').click();
  await expect(page.locator('#setup-gate')).toBeVisible();
});
