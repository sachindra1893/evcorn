#!/usr/bin/env node
/**
 * Phase 5.3 final review — Playwright API request counts for key flows.
 *
 * Usage (servers already up, or let Playwright webServer start them):
 *   node scripts/measure-api-requests.mjs
 *   PLAYWRIGHT_BASE_URL=http://localhost:4200 node scripts/measure-api-requests.mjs
 *
 * Writes artifacts/phase53-request-counts.json
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts/phase53-request-counts.json');
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:3000/api';
const API_RE = /\/api\//;

function classify(url) {
  try {
    const u = new URL(url);
    const p = u.pathname + u.search;
    if (p.includes('/vehicles/') && !p.includes('light=')) return 'vehicles:byId';
    if (p.includes('/vehicles') && p.includes('light=true')) return 'vehicles:light';
    if (p.includes('/vehicles') && !p.includes('light=')) return 'vehicles:full';
    if (p.includes('/articles') && p.includes('light=true')) return 'articles:light';
    if (p.includes('/articles')) return 'articles:full';
    if (p.includes('/categories')) return 'categories';
    if (p.includes('/search/')) return 'search';
    if (p.includes('/health')) return 'health';
    return 'other-api';
  } catch {
    return 'other-api';
  }
}

async function measureFlow(browser, name, pathOrFn) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];

  page.on('request', (req) => {
    const url = req.url();
    if (!API_RE.test(url)) return;
    if (req.method() !== 'GET') return;
    requests.push({
      url,
      class: classify(url),
      resourceType: req.resourceType()
    });
  });

  if (typeof pathOrFn === 'function') {
    await pathOrFn(page);
  } else {
    const target = pathOrFn.startsWith('http') ? pathOrFn : `${BASE}${pathOrFn}`;
    await page.goto(target, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForTimeout(800);
  }

  await context.close();

  const byClass = {};
  for (const r of requests) {
    byClass[r.class] = (byClass[r.class] || 0) + 1;
  }

  return {
    flow: name,
    totalApiGets: requests.length,
    byClass,
    urls: requests.map((r) => r.url.replace(/^https?:\/\/[^/]+/, ''))
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const flows = [];

  try {
    flows.push(
      await measureFlow(browser, 'home-cold', async (page) => {
        await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60_000 });
        await page.waitForTimeout(1000);
      })
    );

    flows.push(
      await measureFlow(browser, 'browse-cold', async (page) => {
        await page.goto(`${BASE}/evs`, { waitUntil: 'networkidle', timeout: 60_000 });
        await page.waitForTimeout(1000);
      })
    );

    flows.push(
      await measureFlow(browser, 'compare-open-cold', async (page) => {
        await page.goto(`${BASE}/compare`, { waitUntil: 'networkidle', timeout: 60_000 });
        await page.waitForSelector('h1, app-compare', { timeout: 30_000 });
        await page.waitForTimeout(1200);
      })
    );

    // Resolve seed ids in a throwaway context (not counted in deeplink flow).
    let deepIds = [];
    {
      const light = await new Promise((resolve, reject) => {
        http.get(`${API_BASE}/vehicles?light=true&status=Published`, (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
      const list = Array.isArray(light) ? light : light?.data || [];
      deepIds = list.slice(0, 2).map((v) => v.id).filter(Boolean);
    }

    flows.push(
      await measureFlow(browser, 'compare-deeplink-2ids', async (page) => {
        const qs = deepIds.length ? `?ids=${deepIds.join(',')}` : '';
        await page.goto(`${BASE}/compare${qs}`, {
          waitUntil: 'networkidle',
          timeout: 60_000
        });
        await page.waitForTimeout(1500);
      })
    );
  } finally {
    await browser.close();
  }

  // Re-measure compare deep-link in isolation (ids from first home light if available)
  const report = {
    generatedAt: new Date().toISOString(),
    phase: '5.3-final-review',
    base: BASE,
    methodology:
      'Each flow uses a fresh browser context (cold service worker / in-memory FE caches). ' +
      'Counts GET requests whose URL contains /api/. Compare after Phase 5.3 should prefer ' +
      'vehicles:light (+ vehicles:byId for selected slots) over vehicles:full.',
    flows,
    expectations: {
      'compare-open-cold': 'vehicles:light ≥1, vehicles:full = 0',
      'home-cold': 'vehicles:light ≥0 (EV Finder), vehicles:full = 0 preferred',
      'browse-cold': 'vehicles:light ≥1 (client index), vehicles:full = 0'
    }
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n→ ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
