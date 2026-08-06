import { test, expect } from '@playwright/test';
import { expectHttpOk, waitForSettledContent } from './helpers/page-guards';

/**
 * Phase 7.4 M2 — Smart Internal Linking smoke (vehicle + article).
 * Asserts Explore stays a single capped link system, Related* is not duplicated,
 * and topic nav only exposes real destinations. Never asserts CMS copy.
 */

const EXPLORE_MAX = 8;

/** Query strings are distinct destinations (`/compare?ids=`, `/evs?category=`) — keep them. */
async function hrefsOf(page: import('@playwright/test').Page, selector: string) {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes
      .map((n) => (n as HTMLAnchorElement).getAttribute('href') || '')
      .map((h) => h.split('#')[0])
      .map((h) => (h.length > 1 && h.endsWith('/') ? h.slice(0, -1) : h))
      .filter(Boolean)
  );
}

test.describe('Content Intelligence internal linking (Phase 7.4)', () => {
  test('vehicle Explore merges hubs without duplicating Related destinations', async ({ page }) => {
    await expectHttpOk(page, '/ev/tata-motors/nexon-ev');
    await waitForSettledContent(page, 'h1');
    await page.waitForTimeout(1200);

    await expect(page.locator('h1').first()).toBeVisible();

    const exploreLinks = page.locator('.aeo-internal a');
    const exploreCount = await exploreLinks.count();

    if (exploreCount > 0) {
      expect(exploreCount).toBeLessThanOrEqual(EXPLORE_MAX);

      const explore = await hrefsOf(page, '.aeo-internal a');
      expect(new Set(explore).size).toBe(explore.length);

      const related = await hrefsOf(page, '.aeo-related a');
      for (const href of explore) {
        expect(related, `Explore duplicates a Related destination: ${href}`).not.toContain(href);
      }

      // Explore must never link back to the page you are already on.
      expect(explore).not.toContain('/ev/tata-motors/nexon-ev');

      // One Explore system only.
      await expect(page.locator('.aeo-internal')).toHaveCount(1);
      await expect(page.locator('#aeo-explore-heading')).toHaveJSProperty('tagName', 'H2');
    }

    // Related* stays a single list per kind even when CI attaches reason labels.
    const relatedLists = page.locator('.aeo-related');
    const relatedListCount = await relatedLists.count();
    expect(relatedListCount).toBeLessThanOrEqual(3);

    const reasons = page.locator('.aeo-related .ci-related-reason');
    const reasonCount = await reasons.count();
    if (reasonCount > 0) {
      const relatedItems = await page.locator('.aeo-related li').count();
      expect(reasonCount).toBeLessThanOrEqual(relatedItems);
      expect((await reasons.first().innerText()).trim().length).toBeGreaterThan(3);
    }
  });

  test('vehicle topic nav only exposes real, non-duplicate destinations', async ({ page }) => {
    await expectHttpOk(page, '/ev/tata-motors/nexon-ev');
    await waitForSettledContent(page, 'h1');
    await page.waitForTimeout(1200);

    const topicNav = page.locator('.aeo-topic-nav');
    if ((await topicNav.count()) === 0) return;

    await expect(topicNav).toHaveCount(1);
    await expect(page.locator('#aeo-topics-heading')).toHaveJSProperty('tagName', 'H2');

    const links = topicNav.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    const hrefs = await hrefsOf(page, '.aeo-topic-nav a');
    expect(new Set(hrefs).size).toBe(hrefs.length);

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      expect((await link.innerText()).trim().length).toBeGreaterThan(0);
      expect((await link.getAttribute('href')) || '').not.toBe('');
    }

    // Navigation must resolve to a real route, not a 404 shell.
    await links.first().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('article detail renders Topics/Explore without a second Related list', async ({ page }) => {
    await expectHttpOk(page, '/articles/local-art-windsor-vs-punch');
    await waitForSettledContent(page, 'h1');
    await page.waitForTimeout(1200);

    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.locator('h1').count()).toBe(1);

    const exploreLinks = page.locator('.ci-nav-section a');
    const exploreCount = await exploreLinks.count();

    if (exploreCount > 0) {
      const ciHrefs = await hrefsOf(page, '.ci-nav-section a');
      const relatedHrefs = await hrefsOf(page, '.related-card');
      for (const href of ciHrefs) {
        expect(relatedHrefs, `CI nav duplicates a Related card: ${href}`).not.toContain(href);
      }

      await expect(page.locator('.ci-nav-section h2').first()).toBeVisible();

      const overflowX = await page.evaluate(() => {
        const el = document.querySelector('.ci-nav-section');
        if (!el) return 0;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflowX).toBeLessThanOrEqual(1);
    }

    // CI reason labels attach to existing cards — they never add cards.
    const reasons = page.locator('.related-card .ci-related-reason');
    const reasonCount = await reasons.count();
    if (reasonCount > 0) {
      const cards = await page.locator('.related-card').count();
      expect(reasonCount).toBeLessThanOrEqual(cards);
    }
  });
});
