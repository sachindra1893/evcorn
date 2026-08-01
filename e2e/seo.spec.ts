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

  test('vehicle detail entity linking: Brand @id, Product @id, no duplicate Product/FAQ', async ({
    page
  }) => {
    await expectHttpOk(page, '/ev/tata-motors/nexon-ev');
    await waitForSettledContent(page, 'h1');
    await page.waitForTimeout(1500);

    const parsed = await page.evaluate(() => {
      const scripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      return scripts.map((s) => {
        try {
          return JSON.parse(s.textContent || '{}');
        } catch {
          return null;
        }
      }).filter(Boolean) as Record<string, unknown>[];
    });

    const typeOf = (node: Record<string, unknown>): string[] => {
      const t = node['@type'];
      if (Array.isArray(t)) return t.map(String);
      return t ? [String(t)] : [];
    };

    const products = parsed.filter((n) => {
      const t = typeOf(n);
      return t.includes('Product') || t.includes('Car');
    });
    const brands = parsed.filter((n) => typeOf(n).includes('Brand'));
    const faqs = parsed.filter((n) => typeOf(n).includes('FAQPage'));
    const articles = parsed.filter((n) => typeOf(n).includes('Article'));
    const breadcrumbs = parsed.filter((n) => typeOf(n).includes('BreadcrumbList'));

    // Existing Phase 7.1 schemas present; exactly one Product/Car (no dups).
    expect(products.length).toBe(1);
    expect(faqs.length).toBeLessThanOrEqual(1);
    expect(articles.length).toBe(0);
    expect(breadcrumbs.length).toBeGreaterThanOrEqual(1);

    const product = products[0];
    expect(String(product['@id'] || '')).toMatch(/\/ev\/tata-motors\/nexon-ev/i);

    // Brand entity linking when graph available (CMS brand on page).
    if (brands.length > 0) {
      expect(brands.length).toBe(1);
      const brand = brands[0];
      expect(brand['name']).toBeTruthy();
      expect(String(brand['@id'] || '')).toMatch(/evs\?category=/i);
      expect(brand['sameAs']).toBeUndefined();
      expect(brand['address']).toBeUndefined();
    }

    // Caps: isRelatedTo vehicles ≤6, articles ≤4 when present.
    const related = product['isRelatedTo'];
    if (Array.isArray(related)) {
      expect(related.length).toBeGreaterThan(0);
      const vehicleRelated = related.filter((r: any) => {
        const t = Array.isArray(r['@type']) ? r['@type'] : [r['@type']];
        return t.includes('Product') || t.includes('Car');
      });
      const articleRelated = related.filter((r: any) => {
        const t = Array.isArray(r['@type']) ? r['@type'] : [r['@type']];
        return t.includes('Article');
      });
      expect(vehicleRelated.length).toBeLessThanOrEqual(6);
      expect(articleRelated.length).toBeLessThanOrEqual(4);
      // No empty relationship arrays serialized as empty
      expect(related.length).toBeGreaterThan(0);
    }

    // Breadcrumb brand crumb keeps entity-href category query when present.
    const crumb = breadcrumbs[0];
    const items = (crumb['itemListElement'] as any[]) || [];
    const brandCrumb = items.find(
      (i) => typeof i?.item === 'string' && i.item.includes('category=')
    );
    if (brandCrumb) {
      expect(brandCrumb.item).toMatch(/evs\?category=/i);
    }
  });

  test('article detail entity linking: Article @id, no duplicate Article/FAQ', async ({
    page
  }) => {
    await expectHttpOk(page, '/articles/local-art-windsor-vs-punch');
    await waitForSettledContent(page, 'h1');
    await page.waitForTimeout(1500);

    const parsed = await page.evaluate(() => {
      const scripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      return scripts.map((s) => {
        try {
          return JSON.parse(s.textContent || '{}');
        } catch {
          return null;
        }
      }).filter(Boolean) as Record<string, unknown>[];
    });

    const typeOf = (node: Record<string, unknown>): string[] => {
      const t = node['@type'];
      if (Array.isArray(t)) return t.map(String);
      return t ? [String(t)] : [];
    };

    const articles = parsed.filter((n) => typeOf(n).includes('Article'));
    const faqs = parsed.filter((n) => typeOf(n).includes('FAQPage'));
    const products = parsed.filter((n) => {
      const t = typeOf(n);
      return t.includes('Product') || t.includes('Car');
    });

    // Exactly one Article schema for the page (no dups); FAQ ≤1.
    expect(articles.length).toBe(1);
    expect(faqs.length).toBeLessThanOrEqual(1);
    // Article page must not emit a standalone Product/Car duplicate of related vehicles.
    expect(products.length).toBe(0);

    const article = articles[0];
    expect(String(article['@id'] || '')).toMatch(/\/articles\//i);

    const about = article['about'];
    if (Array.isArray(about)) {
      expect(about.length).toBeGreaterThan(0);
      const vehicleAbout = about.filter((r: any) => {
        const t = Array.isArray(r['@type']) ? r['@type'] : [r['@type']];
        return t.includes('Product') || t.includes('Car');
      });
      expect(vehicleAbout.length).toBeLessThanOrEqual(6);
    }

    const mentions = article['mentions'];
    if (Array.isArray(mentions)) {
      expect(mentions.length).toBeLessThanOrEqual(4);
      expect(mentions.length).toBeGreaterThan(0);
    }
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
