import { test, expect } from '@playwright/test';
import {
  attachConsoleErrorCollector,
  expectHttpOk,
  waitForSettledContent
} from './helpers/page-guards';

/**
 * Permanent E2E regression guards for bugs fixed in Phase 1/2.
 * Keep these lightweight and deterministic against file-DB seed data.
 */
test.describe('Permanent regression guards (E2E)', () => {
  test('Vehicle Detail does not infinite-load (race / empty Published)', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/ev/tata-motors/nexon-ev');
    // Prefer app-vehicle-detail / h1 — `body` alone matches before data settles.
    await waitForSettledContent(page, 'app-vehicle-detail h1, app-vehicle-detail');

    // After settle: either real vehicle content OR an explicit error/empty state —
    // never a perpetual spinner. Use count(0) (same pattern as Search guard) to
    // avoid :visible races while the overlay is detaching.
    await expect(page.locator('app-vehicle-detail .loading-overlay')).toHaveCount(0, {
      timeout: 25_000
    });

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Nexon|Not Found|could not|offline|timeout|retry|Vehicle/i);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Search navigates and renders results or empty state (no blank)', async ({ page }) => {
    await expectHttpOk(page, '/search?q=tata');
    await waitForSettledContent(page, 'app-search, main, h1');
    const text = (await page.locator('body').innerText()).trim();
    expect(text.length).toBeGreaterThan(30);
    // Should not stay on a forever-loading placeholder alone.
    await expect(page.locator('.loading-overlay')).toHaveCount(0);
  });

  test('Compare page settles without endless loader', async ({ page }) => {
    await expectHttpOk(page, '/compare');
    await waitForSettledContent(page, 'app-compare, main, h1');
    await page.waitForTimeout(500);
    await expect(page.locator('.loading-overlay')).toHaveCount(0);
  });

  test('Article detail renders title content', async ({ page }) => {
    await expectHttpOk(page, '/articles/local-art-windsor-vs-punch');
    await waitForSettledContent(page, 'h1');
    await expect(page.locator('h1').first()).not.toBeEmpty();
  });

  test('Navigation between core routes works', async ({ page }) => {
    await expectHttpOk(page, '/');
    await waitForSettledContent(page, 'body');

    await page.goto('/evs');
    await waitForSettledContent(page, 'body');
    await expect(page).toHaveURL(/\/evs/);

    await page.goto('/articles');
    await waitForSettledContent(page, 'body');
    await expect(page).toHaveURL(/\/articles/);

    await page.goto('/search');
    await waitForSettledContent(page, 'body');
    await expect(page).toHaveURL(/\/search/);
  });
});
