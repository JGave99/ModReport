import { test, expect } from '@playwright/test';
import { login } from './helpers.mjs';

test('turni: inserimento con ripetizione, modifica, condivisione con il team, .ics e link per Google (issue #4)', async ({ page }) => {
  await login(page);
  await page.goto('team.html');
  await page.fill('#create-team-name', 'Radiologia');
  await page.click('#btn-create-team');
  await expect(page.locator('#page-root')).toBeVisible();
  await page.goto('account.html#turni');
  await expect(page.locator('#cal-grid .cal__row')).not.toHaveCount(0);
  // Nuovo turno di notte, ripetuto per 1 settimana
  await page.click('#cal-add');
  await page.fill('#shift-tipo', 'Notte');
  await page.locator('#shift-tipo').dispatchEvent('change');
  await expect(page.locator('#shift-start')).toHaveValue('20:00');
  await page.fill('#shift-sede', 'Pronto Soccorso');
  await page.fill('#shift-note', 'reperibile TC');
  await page.selectOption('#shift-repeat', '1');
  await page.click('#shift-save');
  await expect(page.locator('#shift-dialog')).toBeHidden();
  const saved = await page.evaluate(() => window.__fakeSupabase.db.tables.shifts.map((s) => [s.tipo, s.sede, (new Date(s.ends_at) - new Date(s.starts_at)) / 36e5]));
  expect(saved).toEqual([['Notte', 'Pronto Soccorso', 12], ['Notte', 'Pronto Soccorso', 12]]);
  // Modifica dal calendario
  await page.locator('.shift-chip').first().click();
  await page.fill('#shift-sede', 'TC');
  await page.click('#shift-save');
  await expect(page.locator('.shift-chip').first()).toHaveAttribute('title', /TC/);
  // Condivisione con il team e vista del team
  await page.locator('#share-list input[type=checkbox]').check();
  await expect(page.locator('.toast').last()).toContainText('condivisi con Radiologia');
  // .ics
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#ics-download')]);
  expect(download.suggestedFilename()).toBe('turni-modreport.ics');
  // Link per Google: si vede una volta, poi si può disattivare
  await page.click('#feed-create');
  await expect(page.locator('#feed-link')).toContainText('/functions/v1/turni-ics?token=');
  await expect(page.locator('#feed-box')).toContainText('Link attivo dal');
  await page.goto('team.html?vista=turni');
  await expect(page.locator('#turni-view')).toBeVisible();
  await expect(page.locator('#turni-hint')).toContainText('Vedi i turni dei colleghi');
});
