import { test, expect } from '@playwright/test';
import { expectHttpOk, waitForSettledContent } from './helpers/page-guards';

const CRITICAL_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/evs', name: 'Browse EVs' },
  { path: '/articles', name: 'Articles' },
  { path: '/search', name: 'Search' },
  { path: '/compare', name: 'Compare' },
  { path: '/faqs', name: 'FAQs' },
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
      expect(title).toMatch(/EVCorn|Electric|EV|Nexon|Article|Search|Compare|Browse|FAQ|About/i);
      // No duplicated site suffix.
      expect(title.match(/\| EVCorn/g)?.length || 0).toBeLessThanOrEqual(1);

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.trim().length || 0, `${route.name} meta description`).toBeGreaterThan(20);
      expect((description || '').length, `${route.name} meta description max`).toBeLessThanOrEqual(170);

      const canonicalEl = page.locator('link[rel="canonical"]');
      await expect(canonicalEl).toHaveCount(1);
      const canonical = await canonicalEl.getAttribute('href');
      expect(canonical, `${route.name} canonical`).toMatch(/^https:\/\/evcorn\.com\//);

      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots || '', `${route.name} robots`).toMatch(/index/i);

      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle?.trim().length || 0, `${route.name} og:title`).toBeGreaterThan(3);

      const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
      expect(ogDesc?.trim().length || 0, `${route.name} og:description`).toBeGreaterThan(10);

      const ogLocale = await page.locator('meta[property="og:locale"]').getAttribute('content');
      expect(ogLocale || 'en_IN').toMatch(/en/i);

      const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
      expect(twitterCard).toBeTruthy();

      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${route.name} should have at least one H1`).toBeGreaterThanOrEqual(1);

      const ldCount = await page.locator('script[type="application/ld+json"]').count();
      expect(ldCount, `${route.name} JSON-LD`).toBeGreaterThanOrEqual(1);
    });
  }

  test('FAQ page exposes FAQPage JSON-LD', async ({ page }) => {
    await expectHttpOk(page, '/faqs');
    await page.waitForTimeout(800);
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    let hasFaq = false;
    for (let i = 0; i < count; i++) {
      const text = (await scripts.nth(i).textContent()) || '';
      if (text.includes('FAQPage')) {
        hasFaq = true;
        break;
      }
    }
    expect(hasFaq).toBeTruthy();
  });

  test('vehicle detail exposes BreadcrumbList + Car/Product schema', async ({ page }) => {
    await expectHttpOk(page, '/ev/tata-motors/nexon-ev');
    await waitForSettledContent(page, 'h1');
    await page.waitForTimeout(1000);
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    const joined: string[] = [];
    for (let i = 0; i < count; i++) {
      joined.push((await scripts.nth(i).textContent()) || '');
    }
    const blob = joined.join('\n');
    expect(blob).toContain('BreadcrumbList');
    expect(blob.includes('"Car"') || blob.includes('Product')).toBeTruthy();
  });

  test('search with query is noindex', async ({ page }) => {
    await page.goto('/search?q=nexon', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots || '').toMatch(/noindex/i);
  });

  test('robots.txt disallows admin and points to sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toMatch(/Disallow:\s*\/admin/i);
    expect(body).toMatch(/Sitemap:\s*https:\/\/evcorn\.com\/sitemap\.xml/i);
  });

  test('sitemap.xml excludes admin and includes public hubs', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('<urlset');
    expect(body).toContain('https://evcorn.com/evs');
    expect(body).not.toContain('/admin');
    expect(body).not.toContain('/charging');
  });

  test('no duplicate blank titles across critical routes', async ({ page }) => {
    const titles: string[] = [];
    for (const route of CRITICAL_ROUTES) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const title = (await page.title()).trim();
      expect(title.length).toBeGreaterThan(0);
      titles.push(title);
    }
    const unique = new Set(titles);
    expect(unique.size).toBeGreaterThanOrEqual(4);
  });
});
