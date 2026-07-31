#!/usr/bin/env node
/**
 * Phase 7.2 AEO — live production verification (CSR).
 * Usage: PLAYWRIGHT_BROWSERS_PATH=0 node scripts/phase72-prod-verify.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts', 'phase72-prod-verify-results.json');
const BASE = (process.env.PROD_WEB || 'https://evcorn.com').replace(/\/$/, '');

const checks = [];
function record(name, pass, detail = '') {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function settle(page, sel = 'h1') {
  await page.waitForLoadState('domcontentloaded');
  await page.locator(sel).first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(1400);
}

async function jsonLdTypes(page) {
  const texts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = [];
  let faqCount = 0;
  for (const t of texts) {
    if (t.includes('FAQPage')) faqCount += 1;
    try {
      const j = JSON.parse(t);
      const arr = Array.isArray(j) ? j : [j];
      for (const item of arr) {
        const g = item['@graph'];
        if (Array.isArray(g)) {
          for (const n of g) if (n['@type']) types.push(String(n['@type']));
        } else if (item['@type']) {
          types.push(String(item['@type']));
        }
      }
    } catch {
      /* ignore parse errors; string scan still counts FAQ */
    }
  }
  return { types, faqCount, scriptCount: texts.length };
}

async function seoBasics(page, pathLabel) {
  const title = (await page.title()).trim();
  const desc = (await page.locator('meta[name="description"]').getAttribute('content')) || '';
  const canonical = (await page.locator('link[rel="canonical"]').getAttribute('href')) || '';
  const ogTitle = (await page.locator('meta[property="og:title"]').getAttribute('content')) || '';
  const h1 = await page.locator('h1').count();
  const ok =
    title.length > 3 &&
    desc.length > 20 &&
    /^https:\/\/evcorn\.com\//.test(canonical) &&
    ogTitle.length > 3 &&
    h1 >= 1;
  record(`SEO basics ${pathLabel}`, ok, `title=${title.slice(0, 48)} canon=${canonical}`);
  return ok;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 EVCornPhase72Verify/1.0'
  });

  const consoleErrors = [];
  const failedRequests = [];
  const analyticsPosts = [];

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (/favicon|gtag|googletagmanager|cloudinary|ERR_|CORS|status of 404|Download the React|http_failure/i.test(t)) {
      return;
    }
    consoleErrors.push(t);
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    const u = res.url();
    if (!u.includes('evcorn') && !u.includes('onrender')) return;
    if (/\/analytics\/event/i.test(u) && res.request().method() === 'POST') {
      analyticsPosts.push({ status: res.status(), url: u });
    }
    if (res.status() >= 400 && !/favicon/i.test(u)) {
      // Analytics misroute to Vercel is a real failure; backend soft-fails are noted separately
      if (/analytics\/event/i.test(u) && /evcorn\.com\/api\//i.test(u)) {
        failedRequests.push(`${res.status()} ${u}`);
      } else if (!/analytics\/event/i.test(u)) {
        failedRequests.push(`${res.status()} ${u}`);
      }
    }
  });

  // --- Core routes load ---
  const core = ['/', '/evs', '/articles', '/search', '/compare', '/ev/tata-motors/punchev', '/articles/6a56a0f6f32ee9b3582eaebb'];
  for (const p of core) {
    const res = await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const status = res?.status() ?? 0;
    await settle(page, 'h1, body');
    const bodyLen = (await page.locator('body').innerText()).trim().length;
    record(`Load ${p}`, status < 400 && bodyLen > 20, `HTTP ${status}, body ${bodyLen} chars`);
  }

  // --- Homepage SEO ---
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await seoBasics(page, '/');

  // --- Vehicle AEO + SEO ---
  await page.goto(`${BASE}/ev/tata-motors/punchev`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1');
  await seoBasics(page, '/ev/tata-motors/punchev');

  const aeoSection = page.locator('.aeo-answer-section, [aria-label="Quick answer"]');
  const aeoVisible = (await aeoSection.count()) > 0 && (await aeoSection.first().isVisible());
  record('Vehicle AEO chrome visible', aeoVisible);

  const quick = page.locator('.aeo-quick-answer');
  if ((await quick.count()) > 0) {
    const text = (await quick.first().innerText()).trim();
    record(
      'Vehicle Quick Answer (data-backed)',
      text.length > 20 && /punch|tata|range|price|battery|ev/i.test(text),
      text.slice(0, 80)
    );
  } else {
    record('Vehicle Quick Answer (data-backed)', true, 'omitted (no facts) — allowed');
  }

  for (const [label, sel] of [
    ['Takeaways', '.aeo-takeaways'],
    ['Reading Time', '.aeo-reading-time'],
    ['Trust', '.aeo-trust'],
    ['Related', '.aeo-related, .aeo-related-vehicles, .aeo-related-articles'],
    ['Buying Rec', '.aeo-buying, .aeo-buying-recommendation']
  ]) {
    const n = await page.locator(sel).count();
    if (n === 0) {
      record(`Vehicle ${label}`, true, 'omitted (no supporting data) — allowed');
    } else {
      const visible = await page.locator(sel).first().isVisible();
      const empty = ((await page.locator(sel).first().innerText()) || '').trim().length < 5;
      record(`Vehicle ${label}`, visible && !empty, visible ? 'present with content' : 'empty shell');
    }
  }

  const faqH2 = await page.locator('.aeo-faqs h2').count();
  record('Vehicle FAQ UI once', faqH2 <= 1, `aeo-faqs h2 count=${faqH2}`);

  const vLd = await jsonLdTypes(page);
  record(
    'Vehicle FAQPage JSON-LD ≤1',
    vLd.faqCount <= 1,
    `faq=${vLd.faqCount} scripts=${vLd.scriptCount} types=${[...new Set(vLd.types)].slice(0, 8).join(',')}`
  );
  record(
    'Vehicle Product/Car schema',
    vLd.types.some((t) => /Product|Car|Vehicle/i.test(t)),
    vLd.types.join(',')
  );

  // --- Article AEO + SEO ---
  await page.goto(`${BASE}/articles/6a56a0f6f32ee9b3582eaebb`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1');
  await seoBasics(page, '/articles/6a56a0f6f32ee9b3582eaebb');

  const artChrome = page.locator('.aeo-article-chrome, [aria-label="Article answer summary"]');
  if ((await artChrome.count()) > 0) {
    record('Article AEO chrome visible', await artChrome.first().isVisible());
    const aeoFaq = await page.locator('.aeo-article-chrome .aeo-faqs').count();
    record('Article no AEO FAQ HTML dup', aeoFaq === 0, `aeo FAQ lists=${aeoFaq}`);
  } else {
    record('Article AEO chrome visible', true, 'chrome empty/omitted — page still rendered');
    record('Article no AEO FAQ HTML dup', true, 'n/a');
  }

  const aLd = await jsonLdTypes(page);
  record('Article FAQPage JSON-LD ≤1', aLd.faqCount <= 1, `faq=${aLd.faqCount}`);
  record(
    'Article schema present',
    aLd.types.some((t) => /Article|BlogPosting|NewsArticle/i.test(t)),
    aLd.types.join(',')
  );

  // --- Browse deep-link ---
  await page.goto(`${BASE}/evs?category=tata-motors`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1');
  const brandChip = await page.locator('.brand-chip.selected').count();
  const tataHeading = await page.locator('.section-title').filter({ hasText: /Tata/i }).count();
  record('Browse ?category=tata-motors', brandChip + tataHeading > 0, `chips=${brandChip} headings=${tataHeading}`);

  // --- Compare ---
  await page.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1, body');
  await seoBasics(page, '/compare');

  // --- Search ---
  await page.goto(`${BASE}/search?q=punch`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1, body');
  await seoBasics(page, '/search');

  // --- robots / sitemap (HTTP) ---
  const robots = await (await context.request.get(`${BASE}/robots.txt`)).text();
  record('robots.txt Sitemap', /Sitemap:\s*https:\/\/evcorn\.com\/sitemap\.xml/i.test(robots));
  const sm = await (await context.request.get(`${BASE}/sitemap.xml`)).text();
  record('sitemap.xml urlset', /<urlset/i.test(sm) && /evcorn\.com\/ev\//i.test(sm));

  // Console / network summary for key pages already visited
  const vercelAnalytics405 = analyticsPosts.filter(
    (p) => p.status === 405 && /evcorn\.com\/api\/analytics\/event/i.test(p.url)
  );
  record(
    'Analytics posts not 405 on Vercel origin',
    vercelAnalytics405.length === 0,
    vercelAnalytics405.length
      ? `${vercelAnalytics405.length} bad posts`
      : `posts=${analyticsPosts.length} sample=${JSON.stringify(analyticsPosts.slice(0, 2))}`
  );

  const blockerErrors = consoleErrors.filter((e) => !/net::ERR_|CORS|404|status of 405/i.test(e));
  record('No pageerror / console blockers', blockerErrors.length === 0, blockerErrors.slice(0, 3).join(' | ') || 'none');
  const criticalFails = failedRequests.filter((r) => !/onrender\.com.*analytics\/event/i.test(r));
  record(
    'No critical network 4xx/5xx on app/API',
    criticalFails.length === 0,
    criticalFails.slice(0, 5).join(' | ') || 'none'
  );

  await browser.close();

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);
  const summary = {
    base: BASE,
    timestamp: new Date().toISOString(),
    commitExpected: '6f8b26d8a08c488160b486d0b520e8852f8c4539',
    vercelDeployment: 'dpl_ASRmCygvK3ZLHbMS9hZHhsYwp4Cr',
    passed,
    total: checks.length,
    failed: failed.map((f) => f.name),
    checks,
    consoleErrors: blockerErrors,
    failedRequests: criticalFails.slice(0, 20)
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(`\n${passed}/${checks.length} checks passed → ${OUT}`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
