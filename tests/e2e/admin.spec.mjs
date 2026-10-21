import { test, expect } from '@playwright/test';
import { login, DEMO } from './helpers.mjs';

const LUCA = '22222222-2222-4222-8222-222222222222';

test('admin: elimina l\'account di un altro utente, file compresi (issue #3)', async ({ page }) => {
  await login(page);
  await page.evaluate(({ luca }) => {
    const f = window.__fakeSupabase;
    const me = f.db.users[0].id;
    f.db.tables.app_admins.push({ user_id: me });
    f.db.users.push({ id: luca, email: 'luca@studio.test', password: 'password-luca-1234', confirmed: true, user_metadata: {}, created_at: new Date().toISOString() });
    f.db.tables.user_data.push({ user_id: luca, data: { metodiche: [] }, updated_at: new Date().toISOString() });
    f.db.storage['letterheads/' + luca + '/carta.pdf'] = { b64: 'JVBERi0=', type: 'application/pdf' };
    f.save();
  }, { luca: LUCA });
  await page.goto('admin.html?fake=1');
  await page.click('[data-view="users"]');
  const cards = page.locator('#users-list .req-card');
  await expect(cards).toHaveCount(2);
  // Il proprio account (amministratore) non ha il pulsante
  await expect(cards.filter({ hasText: DEMO.email }).locator('button', { hasText: 'Elimina account' })).toHaveCount(0);
  await cards.filter({ hasText: 'luca@studio.test' }).locator('button', { hasText: 'Elimina account' }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.locator('input').fill('sbagliata@studio.test');
  await dialog.locator('button[type=submit]').click();
  await expect(dialog.locator('.msg')).toHaveText('L\'email non coincide.');
  await dialog.locator('input').fill('Luca@Studio.test');
  await dialog.locator('button[type=submit]').click();
  await expect(page.locator('.toast').last()).toContainText('eliminato');
  await expect(cards).toHaveCount(1);
  const left = await page.evaluate((luca) => ({
    users: window.__fakeSupabase.db.users.filter((u) => u.id === luca).length,
    data: window.__fakeSupabase.db.tables.user_data.filter((r) => r.user_id === luca).length,
    files: Object.keys(window.__fakeSupabase.db.storage).filter((k) => k.includes(luca)).length,
  }), LUCA);
  expect(left).toEqual({ users: 0, data: 0, files: 0 });
});
