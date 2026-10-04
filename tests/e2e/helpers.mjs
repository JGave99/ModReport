import { expect } from '@playwright/test';

export const DEMO = { email: 'demo@modreport.test', password: 'password-demo-123' };

// Apre una pagina con il backend finto; si ferma se per errore stesse usando Supabase reale.
export async function openFake(page, path = 'app.html') {
  await page.route(/supabase\.co/, (route) => route.abort());
  await page.goto(path + (path.includes('?') ? '&' : '?') + 'fake=1');
  await expect.poll(() => page.evaluate(() => !!window.__fakeSupabase)).toBe(true);
}

export async function login(page, { shared = false } = {}) {
  await openFake(page, 'app.html');
  await page.fill('#login-email', DEMO.email);
  await page.fill('#login-password', DEMO.password);
  if (shared) await page.check('#login-shared');
  await page.click('#btn-signin');
  const consent = page.locator('#view-consent');
  await expect(consent.or(page.locator('#app-root:not(.hidden)'))).toBeVisible();
  if (await consent.isVisible()) {
    await page.check('#consent-terms');
    await page.check('#consent-clauses');
    await page.click('#btn-consent');
  }
  await expect(page.locator('#app-root')).not.toHaveClass(/hidden/);
}

export async function chip(page, container, text) {
  await page.locator(container + ' button', { hasText: text }).first().click();
}
