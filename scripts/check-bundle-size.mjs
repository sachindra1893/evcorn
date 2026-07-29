#!/usr/bin/env node
/**
 * Frontend build size / largest JS bundle gate.
 * Warns at WARNING_KB, fails at ERROR_KB (override via env).
 *
 * Usage (after frontend build):
 *   node scripts/check-bundle-size.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST =
  process.env.BUNDLE_DIST ||
  path.join(ROOT, 'frontend/dist/evera-app/browser');
const OUT_DIR = path.join(ROOT, 'artifacts');
const OUT_FILE = path.join(OUT_DIR, 'perf-bundle-results.json');

const WARNING_KB = Number(process.env.BUNDLE_WARN_KB || 500);
const ERROR_KB = Number(process.env.BUNDLE_ERROR_KB || 1024);
const TOTAL_ERROR_KB = Number(process.env.BUNDLE_TOTAL_ERROR_KB || 2500);

function walkJs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJs(full));
    else if (entry.name.endsWith('.js')) {
      const size = fs.statSync(full).size;
      out.push({ file: path.relative(DIST, full), bytes: size, kb: +(size / 1024).toFixed(1) });
    }
  }
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!fs.existsSync(DIST)) {
  const report = {
    generatedAt: new Date().toISOString(),
    pass: false,
    error: `Dist not found: ${DIST}. Run frontend build first.`
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.error(report.error);
  process.exit(1);
}

const files = walkJs(DIST).sort((a, b) => b.bytes - a.bytes);
const largest = files[0] || { file: '(none)', bytes: 0, kb: 0 };
const totalBytes = files.reduce((s, f) => s + f.bytes, 0);
const totalKb = +(totalBytes / 1024).toFixed(1);

const warnings = [];
const failures = [];

if (largest.kb > WARNING_KB) {
  warnings.push(`Largest JS bundle ${largest.file} is ${largest.kb}KB > warn ${WARNING_KB}KB`);
}
if (largest.kb > ERROR_KB) {
  failures.push(`Largest JS bundle ${largest.file} is ${largest.kb}KB > error ${ERROR_KB}KB`);
}
if (totalKb > TOTAL_ERROR_KB) {
  failures.push(`Total JS ${totalKb}KB > error ${TOTAL_ERROR_KB}KB`);
}

const report = {
  generatedAt: new Date().toISOString(),
  dist: DIST,
  thresholds: { WARNING_KB, ERROR_KB, TOTAL_ERROR_KB },
  largest,
  totalKb,
  fileCount: files.length,
  top5: files.slice(0, 5),
  warnings,
  failures,
  pass: failures.length === 0
};

fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

for (const w of warnings) console.warn(`WARN ${w}`);
for (const f of failures) console.error(`FAIL ${f}`);
console.log(
  `${report.pass ? 'PASS' : 'FAIL'} bundle gate — largest ${largest.kb}KB (${largest.file}), total ${totalKb}KB`
);
console.log(`→ ${OUT_FILE}`);
process.exit(report.pass ? 0 : 1);
