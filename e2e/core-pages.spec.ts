import { test, expect } from '@playwright/test';
import {
  attachConsoleErrorCollector,
  expectHttpOk,
  expectNoBlankScreen,
  waitForSettledContent
} from './helpers/page-guards';

test.describe('Core page smoke (HTTP + content + no infinite load)', () => {
  test('Home', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/');
    await waitForSettledContent(page, 'h1, [class*="hero"], app-home, main');
    await expectNoBlankScreen(page);
    await expect(page.locator('body')).toContainText(/EV|Electric|Corn/i);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Browse EVs', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/evs');
    await waitForSettledContent(page, 'h1, .model-card, app-browse-evs, main');
    await expectNoBlankScreen(page);
    await expect(page.locator('body')).toContainText(/EV|Browse|Electric|Vehicle|Tata|Model/i);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Vehicle Detail (Tata Nexon EV)', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    // brand = slugify("Tata Motors"), model = slugify("Nexon EV")
    await expectHttpOk(page, '/ev/tata-motors/nexon-ev');
    await waitForSettledContent(page, 'h1, app-vehicle-detail, main');
    await expectNoBlankScreen(page);
    await expect(page.locator('body')).toContainText(/Nexon/i);
    await expect(page.locator('.loading-overlay')).toHaveCount(0);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Articles list', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/articles');
    await waitForSettledContent(page, 'h1, app-articles, main, article, .article-card');
    await expectNoBlankScreen(page);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Article Detail', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/articles/local-art-windsor-vs-punch');
    await waitForSettledContent(page, 'h1, app-article-detail, main, article');
    await expectNoBlankScreen(page);
    await expect(page.locator('body')).toContainText(/Windsor|Punch|EV/i);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Search', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/search?q=nexon');
    await waitForSettledContent(page, 'h1, app-search, main, input, .result-card');
    await expectNoBlankScreen(page);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Compare', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);
    await expectHttpOk(page, '/compare');
    await waitForSettledContent(page, 'h1, app-compare, main');
    await expectNoBlankScreen(page);
    // Must leave loading state (Compare loading regression).
    await expect(page.locator('.loading-overlay')).toHaveCount(0);
    expect(console.errors, console.errors.join('\n')).toEqual([]);
  });

  test('Health endpoint (API)', async ({ request }) => {
    const live = await request.get('http://127.0.0.1:3000/api/health/live');
    expect(live.status()).toBe(200);
    const body = await live.json();
    expect(body.status).toMatch(/UP|READY|OK/i);

    const health = await request.get('http://127.0.0.1:3000/api/health');
    expect(health.status()).toBe(200);
    expect(health.headers()['x-request-id']).toBeTruthy();
  });
});
