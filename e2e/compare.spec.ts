import { test, expect } from '@playwright/test';
import {
  attachConsoleErrorCollector,
  expectHttpOk,
  expectNoBlankScreen,
  waitForSettledContent
} from './helpers/page-guards';

test.describe('Compare EVs flow (Phase 5.1)', () => {
  test('Home CTA navigates to Compare (no tray on Home)', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/');
    await waitForSettledContent(page, 'h1, .hero-compare-cta');
    await expect(page.locator('.hero-compare-cta')).toBeVisible();
    await expect(page.locator('app-compare-tray .compare-tray-wrapper')).toHaveCount(0);
    await page.locator('.hero-compare-cta').click();
    await expect(page).toHaveURL(/\/compare/);
    await waitForSettledContent(page, 'h1, app-compare');
    await expect(page.locator('.loading-overlay, .state-panel .spinner')).toHaveCount(0, { timeout: 30000 });
    await expect(page.locator('app-compare-tray .compare-tray-wrapper')).toHaveCount(0);
    await expectNoBlankScreen(page);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Browse → select 2 → floating Compare → comparison sections', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/evs');
    await waitForSettledContent(page, '.model-card, app-browse-evs');

    // Top-range cards (default browse view) expose Compare without needing a brand filter.
    const compareButtons = page.locator('.model-card .compare-btn');
    await expect(compareButtons.first()).toBeVisible({ timeout: 20000 });

    const count = await compareButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await compareButtons.nth(0).click();
    const trayBtn = page.locator('.compare-now-btn');
    await expect(trayBtn).toBeVisible({ timeout: 5000 });
    await expect(trayBtn).toContainText(/Select one more EV to compare/);
    await expect(trayBtn).toBeDisabled();

    await compareButtons.nth(1).click();
    await expect(trayBtn).toContainText(/Compare \(2\)/);
    await expect(trayBtn).toBeEnabled();
    await trayBtn.click();

    await expect(page).toHaveURL(/\/compare\?ids=/);
    await waitForSettledContent(page, 'h1, .compare-results, .spec-category');
    await expect(page.locator('.loading-overlay')).toHaveCount(0);
    await expect(page.locator('.spec-category').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('h2').filter({ hasText: /Battery|Performance|Safety|Overview/i }).first()).toBeVisible();
    await expectNoBlankScreen(page);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Empty compare shows Browse CTA guidance (not blank / not infinite load)', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/compare');
    await waitForSettledContent(page, 'h1, app-compare');
    await expect(page.locator('.state-panel .spinner')).toHaveCount(0, { timeout: 30000 });
    await expect(page.locator('.loading-overlay')).toHaveCount(0);
    // Either pickers ready with empty guidance, or catalog empty-state.
    const emptyOrPickers = page.locator('app-empty-state, .picker-grid');
    await expect(emptyOrPickers.first()).toBeVisible({ timeout: 15000 });
    const browseCta = page.locator('.app-empty-state-action');
    if (await browseCta.count()) {
      await expect(browseCta.first()).toContainText(/Browse EVs/i);
    }
    await expectNoBlankScreen(page);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Shareable ids deep link loads comparison', async ({ page, request }) => {
    const vehiclesRes = await request.get('http://127.0.0.1:3000/api/vehicles?status=Published&light=true');
    expect(vehiclesRes.ok()).toBeTruthy();
    const vehicles = await vehiclesRes.json();
    const list = Array.isArray(vehicles) ? vehicles : vehicles?.data || [];
    expect(list.length).toBeGreaterThanOrEqual(2);
    const ids = [list[0].id, list[1].id].filter(Boolean);
    expect(ids.length).toBe(2);

    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, `/compare?ids=${ids.join(',')}`);
    await waitForSettledContent(page, 'h1, app-compare');
    await expect(page.locator('.state-panel .spinner')).toHaveCount(0, { timeout: 30000 });
    await expect(page.locator('.spec-category').first()).toBeVisible({ timeout: 20000 });

    // Preselected vehicles must hydrate Brand / Model / Variant selectors.
    const brand0 = page.locator('#brand-0');
    const model0 = page.locator('#model-0');
    const variant0 = page.locator('#variant-0');
    await expect(brand0).not.toHaveValue('', { timeout: 15000 });
    await expect(model0).not.toHaveValue('');
    await expect(variant0).toHaveValue(ids[0]);
    await expect(page.locator('#brand-1')).not.toHaveValue('');
    await expect(page.locator('#variant-1')).toHaveValue(ids[1]);
    await expect(page.locator('.picked-preview').first()).toBeVisible();

    // Spec cells must be human-readable — never packed DB encodings.
    const specText = await page.locator('.spec-value').allTextContents();
    for (const cell of specText) {
      expect(cell, cell.slice(0, 80)).not.toMatch(/\|\|/);
      expect(cell, cell.slice(0, 80)).not.toMatch(/data:image/i);
      expect(cell, cell.slice(0, 80)).not.toMatch(/base64/i);
      expect(cell.length).toBeLessThan(200);
    }

    await expectNoBlankScreen(page);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Browse tray preselect hydrates selectors without re-picking', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/evs');
    await waitForSettledContent(page, '.model-card, app-browse-evs');

    const compareButtons = page.locator('.model-card .compare-btn');
    await expect(compareButtons.first()).toBeVisible({ timeout: 20000 });
    await compareButtons.nth(0).click();
    await compareButtons.nth(1).click();
    await page.locator('.compare-now-btn').click();

    await expect(page).toHaveURL(/\/compare\?ids=/);
    await waitForSettledContent(page, 'h1, .compare-results, .spec-category');
    await expect(page.locator('.state-panel .spinner')).toHaveCount(0, { timeout: 30000 });

    await expect(page.locator('#brand-0')).not.toHaveValue('', { timeout: 15000 });
    await expect(page.locator('#model-0')).not.toHaveValue('');
    await expect(page.locator('#variant-0')).not.toHaveValue('');
    await expect(page.locator('#brand-1')).not.toHaveValue('');
    await expect(page.locator('#variant-1')).not.toHaveValue('');
    await expect(page.locator('.picked-preview')).toHaveCount(2);

    const bodyText = await page.locator('.compare-results').innerText();
    expect(bodyText).not.toMatch(/\|\|/);
    expect(bodyText).not.toMatch(/data:image/i);
    expect(bodyText).not.toMatch(/base64,/i);

    await expectNoBlankScreen(page);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Compare mobile viewport stays usable without blank screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/compare');
    await waitForSettledContent(page, 'h1, app-compare');
    await expect(page.locator('.state-panel .spinner')).toHaveCount(0, { timeout: 30000 });
    await expect(page.locator('h1')).toBeVisible();
    // No forced horizontal overflow from a giant spreadsheet.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 8);
    await expectNoBlankScreen(page);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });
});
