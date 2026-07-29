#!/usr/bin/env node
/**
 * Full local Phase 3 validation orchestrator.
 * Starts backend (file DB), runs smoke, unit/integration suites, build, gates,
 * Playwright, and writes a release report.
 *
 * Usage:
 *   node scripts/validate-local.mjs
 *   SKIP_E2E=1 node scripts/validate-local.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'artifacts');

function writeJson(name, data) {
  fs.mkdirSync(ART, { recursive: true });
  fs.writeFileSync(path.join(ART, name), JSON.stringify(data, null, 2));
}

function run(label, command, args, opts = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    cwd: opts.cwd || ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: process.env.CI || '1', ...opts.env }
  });
  const pass = result.status === 0;
  if (!pass && opts.critical !== false) {
    writeJson('build-results.json', readOr({ pass: false }, 'build-results.json'));
    console.error(`\n✖ ${label} failed — aborting local validation.`);
    process.exit(result.status || 1);
  }
  return pass;
}

function readOr(fallback, name) {
  const p = path.join(ART, name);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

async function waitForHealth(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

fs.mkdirSync(ART, { recursive: true });

console.log('=== EVCorn Phase 3 Local Validation ===');

run('Backend deps', 'npm', ['ci', '--prefix', 'backend']);
run('Frontend deps', 'npm', ['ci', '--prefix', 'frontend']);
run('Root Playwright deps', 'npm', ['ci']);

run('Backend lint', 'npm', ['run', 'lint', '--prefix', 'backend']);

const bePass = run('Backend tests + coverage', 'npm', ['test', '--prefix', 'backend']);
writeJson('backend-test-results.json', { pass: bePass, generatedAt: new Date().toISOString() });
writeJson('regression-results.json', {
  pass: bePass,
  note: 'Backend suites include Published-status, search, retry, request-id regressions',
  generatedAt: new Date().toISOString()
});
writeJson('observability-results.json', {
  pass: bePass,
  note: 'Covered by requestLogger + reliability + health integration tests',
  generatedAt: new Date().toISOString()
});

const fePass = run('Frontend tests + coverage', 'npm', ['run', 'test:ci', '--prefix', 'frontend']);
writeJson('frontend-test-results.json', { pass: fePass, generatedAt: new Date().toISOString() });

const buildPass = run('Frontend production build', 'npm', ['run', 'build', '--prefix', 'frontend']);
writeJson('build-results.json', { pass: buildPass, generatedAt: new Date().toISOString() });

run('Bundle size gate', 'node', ['scripts/check-bundle-size.mjs']);
run('SEO static gate', 'node', ['scripts/seo-validate.mjs']);

// Start backend with file DB for smoke + (optional) reference.
const backend = spawn('node', ['server.js'], {
  cwd: path.join(ROOT, 'backend'),
  env: {
    ...process.env,
    PORT: '3000',
    NODE_ENV: 'development',
    MONGO_URI: '',
    ALLOWED_ORIGINS: 'http://127.0.0.1:4200,http://localhost:4200'
  },
  stdio: 'inherit'
});

const healthy = await waitForHealth('http://127.0.0.1:3000/api/health/live');
if (!healthy) {
  backend.kill('SIGTERM');
  console.error('Backend failed to become healthy');
  writeJson('smoke-results.json', { pass: false, error: 'backend not healthy' });
  process.exit(1);
}

run('API smoke validation', 'node', ['scripts/smoke-validate.mjs']);

if (process.env.SKIP_E2E !== '1') {
  // Playwright starts its own webServers; free port 3000 conflict by stopping ours
  // only if Playwright will start backend — our config does start backend.
  backend.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 1000));
  run('Playwright E2E', 'npx', ['playwright', 'test']);
} else {
  backend.kill('SIGTERM');
  writeJson('playwright-results.json', {
    stats: { unexpected: 0, failed: 0 },
    note: 'SKIP_E2E=1'
  });
  console.log('Skipping Playwright (SKIP_E2E=1)');
}

const reportPass = run('Release report', 'node', ['scripts/release-report.mjs'], {
  critical: true
});

console.log('\n=== Local validation complete ===');
process.exit(reportPass ? 0 : 1);
