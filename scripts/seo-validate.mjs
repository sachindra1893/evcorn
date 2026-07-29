#!/usr/bin/env node
/**
 * Static SEO checks against prerendered / built index.html artifacts.
 * Complements Playwright SEO specs (runtime SeoService updates).
 *
 * Usage (after frontend build):
 *   node scripts/seo-validate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST =
  process.env.SEO_DIST || path.join(ROOT, 'frontend/dist/evera-app/browser');
const OUT_DIR = path.join(ROOT, 'artifacts');
const OUT_FILE = path.join(OUT_DIR, 'seo-static-results.json');

function readHtml(rel) {
  const full = path.join(DIST, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function extract(html, re) {
  const m = html.match(re);
  return m ? (m[1] || m[0]).trim() : '';
}

function checkDocument(name, html) {
  const issues = [];
  if (!html) {
    return { name, pass: false, issues: ['HTML missing'] };
  }

  const title = extract(html, /<title[^>]*>([^<]*)<\/title>/i);
  if (!title) issues.push('blank title');
  if (/undefined|null/i.test(title)) issues.push('invalid title');

  const desc = extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || extract(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  if (!desc || desc.length < 20) issues.push('missing/short meta description');

  const ogTitle = extract(html, /property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
    || extract(html, /content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
  if (!ogTitle) issues.push('missing og:title');

  const twitter = extract(html, /name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i)
    || extract(html, /content=["']([^"']*)["'][^>]+name=["']twitter:card["']/i);
  if (!twitter) issues.push('missing twitter:card');

  const hasLd = /application\/ld\+json/i.test(html);
  if (!hasLd) issues.push('missing JSON-LD structured data');

  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  // Prerendered shells may omit H1 until hydration — warn only for index.
  const warnings = [];
  if (name === 'index.html' && h1 === 0) {
    warnings.push('no H1 in static HTML (may be client-rendered)');
  }

  return { name, pass: issues.length === 0, title, desc: desc.slice(0, 80), issues, warnings };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!fs.existsSync(DIST)) {
  const report = {
    generatedAt: new Date().toISOString(),
    pass: false,
    error: `Dist not found: ${DIST}`
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.error(report.error);
  process.exit(1);
}

const targets = ['index.html'];
// Include prerendered route shells if present.
for (const candidate of ['evs/index.html', 'articles/index.html', 'compare/index.html', 'search/index.html', 'about/index.html']) {
  if (fs.existsSync(path.join(DIST, candidate))) targets.push(candidate);
}

const results = targets.map((t) => checkDocument(t, readHtml(t)));
const pass = results.every((r) => r.pass);
const report = {
  generatedAt: new Date().toISOString(),
  dist: DIST,
  pass,
  results
};
fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.issues?.length ? ' — ' + r.issues.join('; ') : ''}`);
}
console.log(`\nSEO static ${pass ? 'PASS' : 'FAIL'} → ${OUT_FILE}`);
process.exit(pass ? 0 : 1);
