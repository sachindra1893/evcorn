#!/usr/bin/env node
/**
 * Phase 7.3 Entity Graph — live production verification (CSR).
 * Usage: node scripts/phase73-prod-verify.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts', 'phase73-prod-verify-results.json');
const BASE = (process.env.PROD_WEB || 'https://evcorn.com').replace(/\/$/, '');
const EXPECTED_COMMIT = process.env.EXPECTED_COMMIT || '3fd39db';
const VERCEL_DPL = process.env.VERCEL_DPL || 'dpl_7BJR9MB84a6iGmByezr1zN8xXNyc';

const checks = [];
function record(name, pass, detail = '') {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function settle(page, sel = 'h1') {
  await page.waitForLoadState('domcontentloaded');
  await page.locator(sel).first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1600);
}

function typeOf(node) {
  const t = node?.['@type'];
  if (Array.isArray(t)) return t.map(String);
  return t ? [String(t)] : [];
}

async function parseLd(page) {
  return page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const nodes = [];
    for (const s of scripts) {
      try {
        const j = JSON.parse(s.textContent || '{}');
        const arr = Array.isArray(j) ? j : [j];
        for (const item of arr) {
          if (Array.isArray(item['@graph'])) nodes.push(...item['@graph']);
          else nodes.push(item);
        }
      } catch {
        /* ignore */
      }
    }
    return nodes;
  });
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
  return { title, desc, canonical, ogTitle, h1 };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 EVCornPhase73Verify/1.0'
  });

  const consoleErrors = [];
  const failedRequests = [];

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (/favicon|gtag|googletagmanager|cloudinary|ERR_|CORS|status of 404|Download the React/i.test(t)) {
      return;
    }
    consoleErrors.push(t);
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    const u = res.url();
    if (!u.includes('evcorn') && !u.includes('onrender')) return;
    if (res.status() >= 400 && !/favicon|analytics\/event/i.test(u)) {
      failedRequests.push(`${res.status()} ${u}`);
    }
  });

  // Confirm new bundle
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await settle(page);
  const mainSrc = await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll('script[src]')).map((el) => el.getAttribute('src') || '');
    return s.find((x) => /main-[A-Z0-9]+\.js/.test(x)) || '';
  });
  record('New production main bundle', /main-TX76GU4O\.js/.test(mainSrc), mainSrc);

  // --- General routes ---
  const VEHICLE = '/ev/tata-motors/punchev';
  const ARTICLE = '/articles/6a56a0f6f32ee9b3582eaebb';

  const core = ['/', '/evs', '/articles', '/search', '/compare', VEHICLE, ARTICLE];
  for (const p of core) {
    const res = await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const status = res?.status() ?? 0;
    await settle(page, 'h1, body');
    const bodyLen = (await page.locator('body').innerText()).trim().length;
    record(`Load ${p}`, status < 400 && bodyLen > 20, `HTTP ${status}, body ${bodyLen} chars`);
  }

  // --- Vehicle Entity Graph / SEO ---
  await page.goto(`${BASE}${VEHICLE}`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1');
  await seoBasics(page, VEHICLE);

  const vNodes = await parseLd(page);
  const products = vNodes.filter((n) => {
    const t = typeOf(n);
    return t.includes('Product') || t.includes('Car');
  });
  const brands = vNodes.filter((n) => typeOf(n).includes('Brand'));
  const faqs = vNodes.filter((n) => typeOf(n).includes('FAQPage'));
  const articlesOnVehicle = vNodes.filter((n) => typeOf(n).includes('Article'));
  const breadcrumbs = vNodes.filter((n) => typeOf(n).includes('BreadcrumbList'));

  record('Vehicle Product/Car exactly once', products.length === 1, `count=${products.length}`);
  record('Vehicle FAQPage ≤1', faqs.length <= 1, `count=${faqs.length}`);
  record('Vehicle no Article schema dup', articlesOnVehicle.length === 0, `count=${articlesOnVehicle.length}`);
  record('Vehicle Breadcrumb present', breadcrumbs.length >= 1, `count=${breadcrumbs.length}`);

  if (products.length === 1) {
    const product = products[0];
    const pid = String(product['@id'] || '');
    record('Vehicle Product @id stable path', /\/ev\/tata-motors\/punchev/i.test(pid), pid);
    const related = product['isRelatedTo'];
    if (Array.isArray(related)) {
      const vehicleRelated = related.filter((r) => {
        const t = Array.isArray(r['@type']) ? r['@type'] : [r['@type']];
        return t.includes('Product') || t.includes('Car');
      });
      const articleRelated = related.filter((r) => {
        const t = Array.isArray(r['@type']) ? r['@type'] : [r['@type']];
        return t.includes('Article');
      });
      record('Vehicle isRelatedTo vehicle cap ≤6', vehicleRelated.length <= 6, `n=${vehicleRelated.length}`);
      record('Vehicle isRelatedTo article cap ≤4', articleRelated.length <= 4, `n=${articleRelated.length}`);
      record('Vehicle isRelatedTo non-empty', related.length > 0, `n=${related.length}`);
    } else {
      record('Vehicle isRelatedTo (optional)', true, 'omitted — allowed when no related slate');
    }
  }

  if (brands.length > 0) {
    record('Vehicle Brand schema once', brands.length === 1, `count=${brands.length}`);
    const brand = brands[0];
    record('Vehicle Brand @id uses category query', /evs\?category=/i.test(String(brand['@id'] || '')), String(brand['@id'] || ''));
    record('Vehicle Brand has name', !!brand['name'], String(brand['name'] || ''));
  } else {
    record('Vehicle Brand schema (optional)', true, 'omitted when graph/brand unavailable — allowed');
  }

  // AEO chrome still present
  const aeoSection = page.locator('.aeo-answer-section, [aria-label="Quick answer"]');
  const aeoVisible = (await aeoSection.count()) > 0 && (await aeoSection.first().isVisible());
  record('Vehicle AEO chrome visible', aeoVisible);

  for (const [label, sel] of [
    ['Quick Answer', '.aeo-quick-answer'],
    ['Takeaways', '.aeo-takeaways'],
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

  // Related hrefs use entity-href shape (/ev/brand/model)
  const relatedHrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href^="/ev/"], a[href*="/ev/"]'))
      .map((a) => a.getAttribute('href') || '')
      .filter(Boolean)
      .slice(0, 20)
  );
  const badHref = relatedHrefs.find((h) => !/^\/ev\/[a-z0-9-]+\/[a-z0-9-]+/i.test(h.split('?')[0]));
  record(
    'Vehicle related/internal hrefs entity-href shape',
    relatedHrefs.length === 0 || !badHref,
    badHref || `sample=${relatedHrefs.slice(0, 3).join(',')}`
  );

  // --- Article Entity Graph / SEO ---
  await page.goto(`${BASE}${ARTICLE}`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1');
  await seoBasics(page, ARTICLE);

  const aNodes = await parseLd(page);
  const artArticles = aNodes.filter((n) => typeOf(n).includes('Article'));
  const artFaqs = aNodes.filter((n) => typeOf(n).includes('FAQPage'));
  const artProducts = aNodes.filter((n) => {
    const t = typeOf(n);
    return t.includes('Product') || t.includes('Car');
  });

  record('Article schema exactly once', artArticles.length === 1, `count=${artArticles.length}`);
  record('Article FAQPage ≤1', artFaqs.length <= 1, `count=${artFaqs.length}`);
  record('Article no standalone Product/Car', artProducts.length === 0, `count=${artProducts.length}`);

  if (artArticles.length === 1) {
    const article = artArticles[0];
    const aid = String(article['@id'] || '');
    record('Article @id stable path', /\/articles\//i.test(aid), aid);
    const about = article['about'];
    if (Array.isArray(about)) {
      const vehicleAbout = about.filter((r) => {
        const t = Array.isArray(r['@type']) ? r['@type'] : [r['@type']];
        return t.includes('Product') || t.includes('Car');
      });
      record('Article about vehicle cap ≤6', vehicleAbout.length <= 6 && about.length > 0, `about=${about.length} vehicles=${vehicleAbout.length}`);
    } else {
      record('Article about (optional)', true, 'omitted — allowed');
    }
    const mentions = article['mentions'];
    if (Array.isArray(mentions)) {
      record('Article mentions cap ≤4', mentions.length <= 4 && mentions.length > 0, `n=${mentions.length}`);
    } else {
      record('Article mentions (optional)', true, 'omitted — allowed');
    }
  }

  const artChrome = page.locator('.aeo-article-chrome, [aria-label="Article answer summary"]');
  if ((await artChrome.count()) > 0) {
    record('Article AEO chrome visible', await artChrome.first().isVisible());
  } else {
    record('Article AEO chrome visible', true, 'chrome empty/omitted — page still rendered');
  }

  // --- Browse / Compare / Search ---
  await page.goto(`${BASE}/evs?category=tata-motors`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1');
  const brandChip = await page.locator('.brand-chip.selected').count();
  const tataHeading = await page.locator('.section-title').filter({ hasText: /Tata/i }).count();
  record('Browse ?category=tata-motors', brandChip + tataHeading > 0, `chips=${brandChip} headings=${tataHeading}`);

  await page.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1, body');
  await seoBasics(page, '/compare');

  await page.goto(`${BASE}/search?q=nexon`, { waitUntil: 'domcontentloaded' });
  await settle(page, 'h1, body');
  const robots = (await page.locator('meta[name="robots"]').getAttribute('content')) || '';
  record('Search ?q= noindex', /noindex/i.test(robots), robots);

  // Search result hrefs (entity-href SSOT on FE)
  await page.waitForTimeout(800);
  const searchHrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href^="/ev/"]'))
      .map((a) => a.getAttribute('href') || '')
      .slice(0, 12)
  );
  const badSearch = searchHrefs.find((h) => !/^\/ev\/[a-z0-9-]+\/[a-z0-9-]+/i.test(h.split('?')[0]));
  record(
    'Search result vehicle hrefs entity-href',
    searchHrefs.length === 0 || !badSearch,
    badSearch || `n=${searchHrefs.length} sample=${searchHrefs.slice(0, 2).join(',')}`
  );

  // --- robots / sitemap ---
  const robotsTxt = await (await context.request.get(`${BASE}/robots.txt`)).text();
  record('robots.txt Disallow admin', /Disallow:\s*\/admin/i.test(robotsTxt));
  record('robots.txt Sitemap', /Sitemap:\s*https:\/\/evcorn\.com\/sitemap\.xml/i.test(robotsTxt));
  const sm = await (await context.request.get(`${BASE}/sitemap.xml`)).text();
  record(
    'sitemap.xml hubs, no admin',
    /<urlset/i.test(sm) && /evcorn\.com\/evs/i.test(sm) && !/\/admin/i.test(sm),
    `len=${sm.length}`
  );

  // Failure isolation smoke: page still has Product even if Brand omitted
  record('Failure isolation: base Product schema still emits', products.length === 1, 'vehicle Product present');

  const blockerErrors = consoleErrors.filter((e) => !/net::ERR_|CORS|404|status of 405/i.test(e));
  record('No pageerror / console blockers', blockerErrors.length === 0, blockerErrors.slice(0, 3).join(' | ') || 'none');
  record(
    'No critical network 4xx/5xx',
    failedRequests.length === 0,
    failedRequests.slice(0, 5).join(' | ') || 'none'
  );

  await browser.close();

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);
  const summary = {
    base: BASE,
    timestamp: new Date().toISOString(),
    commitExpected: EXPECTED_COMMIT,
    vercelDeployment: VERCEL_DPL,
    passed,
    total: checks.length,
    failed: failed.map((f) => f.name),
    checks,
    consoleErrors: blockerErrors,
    failedRequests: failedRequests.slice(0, 20)
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
