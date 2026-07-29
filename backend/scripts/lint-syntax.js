#!/usr/bin/env node
/**
 * Lightweight backend syntax lint (no ESLint dependency).
 * Fails on parse errors across application JS (excludes coverage/node_modules).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', 'coverage', 'data', '.git']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = walk(ROOT).filter((f) => !f.includes(`${path.sep}coverage${path.sep}`));
let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    failed++;
    console.error(`FAIL ${path.relative(ROOT, file)}`);
    console.error(err.stderr?.toString() || err.message);
  }
}

if (failed) {
  console.error(`\nLint failed: ${failed} file(s)`);
  process.exit(1);
}
console.log(`PASS backend syntax lint (${files.length} files)`);
