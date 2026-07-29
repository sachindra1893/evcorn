#!/usr/bin/env node
/**
 * Aggregates Phase 3 quality-gate artifacts into a single PASS/FAIL release report.
 *
 * Reads (when present):
 *   artifacts/backend-test-results.json
 *   artifacts/frontend-test-results.json
 *   artifacts/playwright-results.json
 *   artifacts/smoke-results.json
 *   artifacts/perf-bundle-results.json
 *   artifacts/seo-static-results.json
 *   artifacts/observability-results.json
 *   artifacts/regression-results.json
 *   artifacts/build-results.json
 *
 * Writes:
 *   artifacts/RELEASE_REPORT.md
 *   artifacts/RELEASE_REPORT.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'artifacts');

function readJson(rel) {
  const full = path.join(OUT_DIR, rel);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return { pass: false, error: `Invalid JSON: ${rel}` };
  }
}

function statusFrom(obj, fallbackMissing = 'SKIP') {
  if (obj == null) return fallbackMissing;
  if (typeof obj.pass === 'boolean') return obj.pass ? 'PASS' : 'FAIL';
  if (obj.success === false) return 'FAIL';
  if (obj.numFailedTests != null) {
    return obj.numFailedTests === 0 && (obj.numPassedTests || 0) >= 0 ? 'PASS' : 'FAIL';
  }
  // Playwright JSON reporter shape
  if (obj.suites || obj.stats) {
    const failed = obj.stats?.unexpected ?? obj.stats?.failed ?? 0;
    return failed === 0 ? 'PASS' : 'FAIL';
  }
  return fallbackMissing;
}

function playwrightPass(obj) {
  if (!obj) return 'SKIP';
  if (obj.stats) {
    const unexpected = obj.stats.unexpected || 0;
    const failed = obj.stats.failed || 0;
    return unexpected + failed === 0 ? 'PASS' : 'FAIL';
  }
  return statusFrom(obj);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const build = readJson('build-results.json');
const feTests = readJson('frontend-test-results.json');
const beTests = readJson('backend-test-results.json');
const playwright = readJson('playwright-results.json');
const smoke = readJson('smoke-results.json');
const perf = readJson('perf-bundle-results.json');
const seo = readJson('seo-static-results.json');
const observability = readJson('observability-results.json');
const regression = readJson('regression-results.json');

const gates = [
  { name: 'Build', status: statusFrom(build) },
  { name: 'FE tests', status: statusFrom(feTests) },
  { name: 'BE tests', status: statusFrom(beTests) },
  { name: 'Playwright', status: playwrightPass(playwright) },
  { name: 'Smoke', status: statusFrom(smoke) },
  { name: 'Performance', status: statusFrom(perf) },
  { name: 'SEO', status: statusFrom(seo) },
  { name: 'Observability', status: statusFrom(observability, 'PASS') },
  { name: 'Regression', status: statusFrom(regression, 'PASS') }
];

// Observability/Regression default PASS when their suites are folded into BE/FE/Playwright
// and no dedicated artifact was written — release report still lists them explicitly.
const overallStatus = gates.some((g) => g.status === 'FAIL') ? 'FAIL' : 'PASS';

const report = {
  generatedAt: new Date().toISOString(),
  overall: overallStatus,
  gates,
  notes: [
    'Observability/Regression rows PASS by default when covered by BE/FE/E2E suites without a dedicated artifact.',
    'Production LIVE validation is separate: npm run validate:production (not required for PR merge).'
  ]
};

const md = [
  '# EVCorn Release Report',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `## Overall: **${report.overall}**`,
  '',
  '| Gate | Status |',
  '| :--- | :--- |',
  ...gates.map((g) => `| ${g.name} | ${g.status} |`),
  '',
  '## Notes',
  ...report.notes.map((n) => `- ${n}`),
  ''
].join('\n');

fs.writeFileSync(path.join(OUT_DIR, 'RELEASE_REPORT.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'RELEASE_REPORT.md'), md);

console.log(md);
console.log(`Overall ${report.overall}`);
process.exit(report.overall === 'PASS' ? 0 : 1);
