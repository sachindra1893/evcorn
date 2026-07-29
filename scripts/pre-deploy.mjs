#!/usr/bin/env node
/**
 * Pre-deploy gate: run local validations and STOP if any critical gate fails.
 * Does not deploy. Safe to run before pushing to main / promoting a release.
 *
 * Usage:
 *   node scripts/pre-deploy.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function run(label, command, args, opts = {}) {
  console.log(`\n▶ ${label}\n   $ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...opts.env }
  });
  if (result.status !== 0) {
    console.error(`\n✖ STOP — ${label} failed (exit ${result.status}). Do not deploy.`);
    process.exit(result.status || 1);
  }
  console.log(`✔ ${label}`);
}

fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });

run('Backend deps', 'npm', ['ci', '--prefix', 'backend']);
run('Frontend deps', 'npm', ['ci', '--prefix', 'frontend']);
run('Root (Playwright) deps', 'npm', ['ci']);

run('Backend lint', 'npm', ['run', 'lint', '--prefix', 'backend']);
run('Backend tests', 'npm', ['test', '--prefix', 'backend']);
run('Frontend tests', 'npm', ['run', 'test:ci', '--prefix', 'frontend']);
run('Frontend build', 'npm', ['run', 'build', '--prefix', 'frontend']);
run('Bundle size gate', 'node', ['scripts/check-bundle-size.mjs']);
run('SEO static gate', 'node', ['scripts/seo-validate.mjs']);

// Mark build gate for the release report aggregator.
fs.writeFileSync(
  path.join(ROOT, 'artifacts', 'build-results.json'),
  JSON.stringify({ pass: true, generatedAt: new Date().toISOString() }, null, 2)
);
fs.writeFileSync(
  path.join(ROOT, 'artifacts', 'backend-test-results.json'),
  JSON.stringify({ pass: true, generatedAt: new Date().toISOString() }, null, 2)
);
fs.writeFileSync(
  path.join(ROOT, 'artifacts', 'frontend-test-results.json'),
  JSON.stringify({ pass: true, generatedAt: new Date().toISOString() }, null, 2)
);

run('Release report', 'node', ['scripts/release-report.mjs']);

console.log('\n✅ Pre-deploy validations passed. Safe to proceed with deploy.');
console.log('For full smoke+E2E before push: npm run validate:local');
console.log('After deploy: npm run validate:production');
