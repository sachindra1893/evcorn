#!/usr/bin/env node
/**
 * Lightweight smoke validation against a running local backend (file DB or Atlas).
 * Writes artifacts/smoke-results.json for the release report.
 *
 * Usage:
 *   API_BASE=http://127.0.0.1:3000/api node scripts/smoke-validate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:3000/api').replace(/\/$/, '');
const OUT_DIR = path.join(ROOT, 'artifacts');
const OUT_FILE = path.join(OUT_DIR, 'smoke-results.json');

const CHECKS = [
  { name: 'health', path: '/health' },
  { name: 'health_live', path: '/health/live' },
  { name: 'health_ready', path: '/health/ready', allowStatuses: [200, 503] },
  { name: 'vehicles_published', path: '/vehicles?status=Published' },
  { name: 'vehicles_light', path: '/vehicles?light=true&status=Published' },
  { name: 'articles', path: '/articles' },
  { name: 'search_unified', path: '/search/unified?q=nexon' },
  { name: 'categories', path: '/categories' }
];

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  let failed = 0;

  for (const check of CHECKS) {
    const url = `${API_BASE}${check.path}`;
    const started = Date.now();
    try {
      const res = await fetch(url, {
        headers: { 'x-request-id': `smoke-${check.name}` }
      });
      const ms = Date.now() - started;
      const allow = check.allowStatuses || [200];
      const ok = allow.includes(res.status);
      const requestId = res.headers.get('x-request-id');
      const serverTiming = res.headers.get('server-timing');
      const cacheControl = res.headers.get('cache-control') || '';
      let bodyOk = true;
      let json = null;
      try {
        json = await res.json();
        if (check.name === 'vehicles_published' && Array.isArray(json) && json.length === 0) {
          // Empty Published list is the Phase 1 P0 regression — fail smoke.
          bodyOk = false;
        }
        if (check.name === 'vehicles_published' && json?.data && Array.isArray(json.data) && json.data.length === 0) {
          bodyOk = false;
        }
        if (check.name === 'health' && !json?.dependencies?.database) {
          bodyOk = false;
        }
      } catch {
        // non-JSON ok for some probes
      }

      let headerOk = true;
      if (
        (check.name === 'health_live' || check.name === 'health_ready') &&
        !/no-store/i.test(cacheControl)
      ) {
        headerOk = false;
      }

      const pass = ok && bodyOk && headerOk;
      if (!pass) failed++;
      results.push({
        name: check.name,
        url,
        status: res.status,
        ms,
        requestId,
        serverTiming: serverTiming || null,
        cacheControl: cacheControl || null,
        pass
      });
      console.log(`${pass ? 'PASS' : 'FAIL'} ${check.name} ${res.status} ${ms}ms`);
    } catch (err) {
      failed++;
      results.push({
        name: check.name,
        url,
        pass: false,
        error: String(err.message || err)
      });
      console.log(`FAIL ${check.name} ${err.message || err}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    apiBase: API_BASE,
    pass: failed === 0,
    failed,
    results
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nSmoke ${report.pass ? 'PASS' : 'FAIL'} → ${OUT_FILE}`);
  process.exit(report.pass ? 0 : 1);
}

run();
