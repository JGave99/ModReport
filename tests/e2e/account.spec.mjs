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

test('ordine delle sezioni: si trascina in un elenco a parte, resta salvato e vale nell\'editor (issue #2)', async ({ page }) => {
  await login(page);
  await page.goto('account.html#libreria');
  await page.locator('.lib-tree__item', { hasText: 'RX TORACE 2PR' }).first().click();
  const items = page.locator('.order-list .order-item');
  await expect(items).toHaveCount(11);
  await expect(page.locator('.lib-section__head [aria-label="Sposta il gruppo su"]')).toHaveCount(0);
  // Da tastiera: Pneumotorace in cima
  await items.filter({ hasText: 'Pneumotorace' }).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('Alt+ArrowUp');
  await expect(items.first()).toContainText('Pneumotorace');
  await expect(page.locator('.order-item:focus')).toContainText('Pneumotorace');
  // Col mouse: Cuore sopra Parenchima (seconda posizione)
  const from = await items.filter({ hasText: 'Cuore' }).boundingBox();
  const to = await items.nth(1).boundingBox();
  await page.mouse.move(from.x + 40, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, to.y + 4, { steps: 8 });
  await page.mouse.up();
  const order = ['Pneumotorace', 'Cuore', 'Parenchima', 'Interstizio e circolo', 'Pleura', 'Mediastino', 'Diaframma', 'Scheletro', 'Altro', 'Device', 'Tecnica'];
  await expect(items).toHaveText(order.map((n) => new RegExp('^' + n)));
  await expect(page.locator('#lib-status')).toHaveText('Libreria salvata ✓');
  // Il database (jsonb) riordina le chiavi: l'ordine voluto è salvato a parte.
  const saved = await page.evaluate(() => window.__fakeSupabase.db.tables.user_data[0].data);
  expect(Object.keys(saved.refertoByEsame['RX TORACE 2PR'])[0]).toBe('Altro'); // jsonb: per lunghezza e poi alfabetico
  expect(saved.ordineGruppi['RX TORACE 2PR']).toEqual(order);
  // Dopo il ricaricamento l'ordine resta
  await page.reload();
  await page.locator('.lib-tree__item', { hasText: 'RX TORACE 2PR' }).first().click();
  await expect(items).toHaveText(order.map((n) => new RegExp('^' + n)));
  // Nell'editor: pulsanti nello stesso ordine; frasi in fondo nell'ordine dei clic; referto negativo nell'ordine delle sezioni
  await page.goto('app.html');
  await page.waitForSelector('body[data-ready="1"]');
  await page.locator('#metodica-row button', { hasText: 'RX' }).first().click();
  await page.locator('#esame-body button', { hasText: 'RX TORACE 2PR' }).first().click();
  await expect(page.locator('#referto-body .group__label')).toHaveText(order);
  const group = (name) => page.locator('#referto-body .group', { has: page.locator('.group__label', { hasText: name }) });
  await group('Diaframma').locator('.phrase').first().click();
  await group('Pneumotorace').locator('.phrase').first().click();
  const ta = page.locator('#report-text');
  let text = await ta.inputValue();
  const lines = text.trim().split('\n').slice(-2);
  expect(lines[1]).toMatch(/pneumotorace/i);
  await page.click('#btn-negativo');
  text = await ta.inputValue();
  const body = text.trim().split('\n');
  const idx = (re) => body.findIndex((l) => re.test(l));
  expect(idx(/pneumotorace/i)).toBeGreaterThan(idx(/diaframm/i));
  // Referto negativo proposto (Parenchima e Cuore), nell'ordine delle sezioni: prima Cuore, poi Parenchima
  expect(idx(/profilo cardiomediastinico/i)).toBeGreaterThan(idx(/pneumotorace/i));
  expect(idx(/addensament/i)).toBeGreaterThan(idx(/profilo cardiomediastinico/i));
});

test('confronto con precedenti (punto 04): pulsanti personalizzabili, uguali per tutti gli esami', async ({ page }) => {
  await login(page);
  await page.goto('account.html#libreria');
  const editor = page.locator('#confronti-editor');
  await expect(editor.locator('.lib-phrase')).toHaveCount(3);
  await editor.locator('input').first().fill('Confronto TC');
  await editor.locator('textarea').first().fill('Confronto con precedente TC del [data].');
  await editor.locator('button', { hasText: 'Aggiungi pulsante' }).click();
  await editor.locator('input').last().fill('Esterno');
  await editor.locator('textarea').last().fill('Confronto con esame esterno del [data], visionato su CD.');
  await editor.locator('[aria-label="Elimina il pulsante"]').nth(1).click(); // via "Presa visione"
  await expect(page.locator('#lib-status')).toHaveText('Libreria salvata ✓');
  await page.goto('app.html');
  await page.waitForSelector('body[data-ready="1"]');
  await expect(page.locator('#confronti-row .chip')).toHaveText(['Confronto TC', 'Non precedenti', 'Esterno']);
  await page.locator('#metodica-row button', { hasText: 'TC' }).first().click();
  await page.locator('#confronti-row .chip', { hasText: 'Esterno' }).click();
  await expect(page.locator('#report-text')).toHaveValue(/Confronto con esame esterno del \[data\], visionato su CD\./);
  // Si torna ai predefiniti
  await page.goto('account.html#libreria');
  await page.locator('#confronti-editor button', { hasText: 'Ripristina i predefiniti' }).click();
  await page.locator('dialog[open] button[type=submit]').click();
  await expect(page.locator('#confronti-editor .lib-phrase')).toHaveCount(3);
});
