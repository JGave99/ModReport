import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort());
});

test('landing: la registrazione si apre direttamente dal pulsante principale', async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('#beta-plan')).toBeVisible();
  await expect(page.locator('#plans')).toBeHidden();
  await page.locator('.hero a', { hasText: 'Crea un account gratuito' }).click();
  await expect(page.locator('#view-signup')).toBeVisible();
});

test('landing: "Prova senza account" apre l\'editor in modalità locale', async ({ page }) => {
  await page.goto('index.html');
  await page.locator('.hero a', { hasText: 'Prova senza account' }).click();
  await expect(page.locator('#app-root')).not.toHaveClass(/hidden/);
  await expect(page.locator('#local-badge')).toBeVisible();
});
