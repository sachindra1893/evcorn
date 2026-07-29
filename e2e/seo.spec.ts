import { test, expect } from '@playwright/test';
import { expectHttpOk, waitForSettledContent } from './helpers/page-guards';

const CRITICAL_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/evs', name: 'Browse EVs' },
  { path: '/articles', name: 'Articles' },
  { path: '/search', name: 'Search' },
  { path: '/compare', name: 'Compare' },
  { path: '/ev/tata-motors/nexon-ev', name: 'Vehicle Detail' },
  { path: '/articles/local-art-windsor-vs-punch', name: 'Article Detail' }
];

test.describe('SEO validation (critical routes)', () => {
  for (const route of CRITICAL_ROUTES) {
    test(`${route.name} (${route.path}) has title, meta, canonical, OG, Twitter, H1`, async ({
      page
    }) => {
      await expectHttpOk(page, route.path);
      await waitForSettledContent(page, 'h1, body');

      // Allow SeoService to update head after route resolve.
      await page.waitForTimeout(800);

      const title = await page.title();
      expect(title.trim().length, `${route.name} title blank`).toBeGreaterThan(3);
      expect(title.toLowerCase()).not.toBe('undefined');
      expect(title).toMatch(/EVCorn|Electric|EV|Nexon|Article|Search|Compare|Browse/i);

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.trim().length || 0, `${route.name} meta description`).toBeGreaterThan(20);

      const canonicalEl = page.locator('link[rel="canonical"]');
      const canonicalCount = await canonicalEl.count();
      const canonical = canonicalCount ? await canonicalEl.getAttribute('href') : null;
      if (route.path.startsWith('/ev/') || route.path.startsWith('/articles/')) {
        expect(canonical, `${route.name} canonical`).toBeTruthy();
      }

      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle?.trim().length || 0, `${route.name} og:title`).toBeGreaterThan(3);

      const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
      expect(ogDesc?.trim().length || 0, `${route.name} og:description`).toBeGreaterThan(10);

      const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
      expect(twitterCard).toBeTruthy();

      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${route.name} should have at least one H1`).toBeGreaterThanOrEqual(1);

      // Structured data: at least one JSON-LD script on page (static or dynamic).
      const ldCount = await page.locator('script[type="application/ld+json"]').count();
      expect(ldCount, `${route.name} JSON-LD`).toBeGreaterThanOrEqual(1);
    });
  }

  test('no duplicate blank titles across critical routes', async ({ page }) => {
    const titles: string[] = [];
    for (const route of CRITICAL_ROUTES) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const title = (await page.title()).trim();
      expect(title.length).toBeGreaterThan(0);
      titles.push(title);
    }
    // Home and other pages may share site default briefly; ensure not ALL identical blanks.
    const unique = new Set(titles);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });
});
