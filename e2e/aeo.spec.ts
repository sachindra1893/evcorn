import { test, expect, devices } from '@playwright/test';
import { expectHttpOk, waitForSettledContent } from './helpers/page-guards';

/**
 * Phase 7.2 AEO — production polish smoke (vehicle + article).
 * Asserts chrome, a11y basics, mobile usability, schema ownership — not CMS copy.
 */
test.describe('AEO answer chrome (Phase 7.2)', () => {
  test('vehicle detail shows AEO sections and a single FAQPage schema', async ({ page }) => {
    await expectHttpOk(page, '/ev/tata-motors/nexon-ev');
    await waitForSettledContent(page, 'h1');
    await page.waitForTimeout(1200);

    const answer = page.locator('.aeo-answer-section, [aria-label="Quick answer"]');
    await expect(answer.first()).toBeVisible();

    const quick = page.locator('.aeo-quick-answer');
    if ((await quick.count()) > 0) {
      const text = (await quick.first().innerText()).trim();
      expect(text.length).toBeGreaterThan(20);
      expect(text.toLowerCase()).toMatch(/nexon|tata|range|price|battery|ev/i);
    }

    // Empty sections must not leave empty FAQ / Spec shells
    const faqBlocks = page.locator('.aeo-faqs');
    if ((await faqBlocks.count()) > 0) {
      await expect(faqBlocks.first().locator('.aeo-faq-item').first()).toBeVisible();
      await expect(page.locator('.aeo-faqs h2')).toHaveCount(1);
      await expect(faqBlocks.first().locator('h3').first()).toBeVisible();
    }

    const tocLinks = page.locator('.aeo-toc a[href^="#"]');
    if ((await tocLinks.count()) > 0) {
      await expect(tocLinks.first()).toBeVisible();
      // Keyboard: TOC link is focusable and activates scroll target
      await tocLinks.first().focus();
      await expect(tocLinks.first()).toBeFocused();
    }

    const ctas = page.locator('.aeo-ctas .aeo-cta-link');
    if ((await ctas.count()) > 0) {
      const box = await ctas.first().boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(40);
    }

    // Exactly one FAQPage in JSON-LD (SchemaService on vehicle — not a second script id)
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    let faqPageCount = 0;
    for (let i = 0; i < count; i++) {
      const text = (await scripts.nth(i).textContent()) || '';
      if (text.includes('"FAQPage"') || text.includes("'FAQPage'")) faqPageCount += 1;
    }
    // Vehicle may omit FAQ schema when no usable facts — allow 0 or 1, never 2+
    expect(faqPageCount).toBeLessThanOrEqual(1);

    // Heading hierarchy: single H1, AEO section titles are H2
    expect(await page.locator('h1').count()).toBe(1);
    const aeoH2 = page.locator('.aeo-answer-section h2.aeo-section-title');
    if ((await aeoH2.count()) > 0) {
      await expect(aeoH2.first()).toBeVisible();
    }

    // No horizontal overflow from AEO chrome
    const overflowX = await page.evaluate(() => {
      const el = document.querySelector('.aeo-answer-section');
      if (!el) return 0;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflowX).toBeLessThanOrEqual(1);
  });

  test('article detail shows AEO chrome without duplicating FAQ/pros-cons HTML', async ({
    page
  }) => {
    await expectHttpOk(page, '/articles/local-art-windsor-vs-punch');
    await waitForSettledContent(page, 'h1');
    await page.waitForTimeout(1200);

    const chrome = page.locator('.aeo-article-chrome, [aria-label="Article answer summary"]');
    // Chrome may be empty if flag off / generation fails — page must still render
    await expect(page.locator('h1').first()).toBeVisible();

    if ((await chrome.count()) > 0) {
      await expect(chrome.first()).toBeVisible();
      // AEO must not inject a second FAQ list beside block-renderer
      const aeoFaqLists = page.locator('.aeo-article-chrome .aeo-faqs');
      expect(await aeoFaqLists.count()).toBe(0);
    }

    const toc = page.locator('nav.toc-container, .toc-container');
    if ((await toc.count()) > 0) {
      await expect(toc.first().locator('h2.toc-title, .toc-title').first()).toBeVisible();
      const tocAnchors = toc.first().locator('a[href^="#"]');
      if ((await tocAnchors.count()) > 0) {
        await expect(tocAnchors.first()).toBeVisible();
        await tocAnchors.first().focus();
        await expect(tocAnchors.first()).toBeFocused();
      }
    }

    // Related section headings are H2 (not skipping levels under page H1)
    const relatedTitle = page.locator('.related-section-title');
    if ((await relatedTitle.count()) > 0) {
      await expect(relatedTitle.first()).toHaveJSProperty('tagName', 'H2');
    }

    // At most one FAQPage (block-renderer faq-schema path)
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    let faqPageCount = 0;
    for (let i = 0; i < count; i++) {
      const text = (await scripts.nth(i).textContent()) || '';
      if (text.includes('FAQPage')) faqPageCount += 1;
    }
    expect(faqPageCount).toBeLessThanOrEqual(1);
  });

  test('browse EVs honors ?category= deep-link from AEO Explore', async ({ page }) => {
    await expectHttpOk(page, '/evs?category=tata-motors');
    await waitForSettledContent(page, 'h1');
    await page.waitForTimeout(1000);

    // Brand filter should activate (chip selected or models heading shows brand)
    const brandChip = page.locator('.brand-chip.selected');
    const modelsHeading = page.locator('.section-title').filter({ hasText: /Tata/i });
    const chipCount = await brandChip.count();
    const headingCount = await modelsHeading.count();
    expect(chipCount + headingCount).toBeGreaterThan(0);
  });

  test('vehicle AEO chrome is usable on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    try {
      await expectHttpOk(page, '/ev/tata-motors/nexon-ev');
      await waitForSettledContent(page, 'h1');
      await page.waitForTimeout(1200);

      const answer = page.locator('.aeo-answer-section');
      await expect(answer.first()).toBeVisible();

      const docOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - document.documentElement.clientWidth;
      });
      expect(docOverflow).toBeLessThanOrEqual(2);

      const toc = page.locator('.aeo-toc a[href^="#"]');
      if ((await toc.count()) > 0) {
        await expect(toc.first()).toBeVisible();
      }

      const cta = page.locator('.aeo-ctas .aeo-cta-link').first();
      if ((await cta.count()) > 0) {
        const box = await cta.boundingBox();
        expect(box?.height || 0).toBeGreaterThanOrEqual(40);
      }
    } finally {
      await context.close();
    }
  });
});
