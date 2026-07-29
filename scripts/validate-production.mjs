#!/usr/bin/env node
/**
 * Post-deploy validation against LIVE production.
 * Not run on PR CI — invoke manually or via workflow_dispatch after deploy.
 *
 * Usage:
 *   PROD_WEB=https://evcorn.com PROD_API=https://evcorn-backend.onrender.com/api \
 *     node scripts/validate-production.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'artifacts');
const OUT_FILE = path.join(OUT_DIR, 'production-validate-results.json');

const PROD_WEB = (process.env.PROD_WEB || 'https://evcorn.com').replace(/\/$/, '');
const PROD_API = (process.env.PROD_API || 'https://evcorn-backend.onrender.com/api').replace(/\/$/, '');

const WEB_ROUTES = ['/', '/evs', '/articles', '/search', '/compare'];
const API_ROUTES = [
  { path: '/health', requireRequestId: true },
  { path: '/health/live' },
  { path: '/health/ready', allow: [200, 503] },
  { path: '/vehicles?status=Published&limit=5', requireNonEmpty: true },
  { path: '/articles?limit=5' }
];

async function checkWeb(route) {
  const url = `${PROD_WEB}${route}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    const ms = Date.now() - started;
    const hasTitle = /<title>[^<]+<\/title>/i.test(text);
    const pass = res.status < 400 && hasTitle && text.length > 200;
    return { type: 'web', route, url, status: res.status, ms, pass, hasTitle };
  } catch (err) {
    return { type: 'web', route, url, pass: false, error: String(err.message || err) };
  }
}

async function checkApi(spec) {
  const url = `${PROD_API}${spec.path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'x-request-id': `prod-validate-${Date.now()}` }
    });
    const ms = Date.now() - started;
    const allow = spec.allow || [200];
    const requestId = res.headers.get('x-request-id');
    const serverTiming = res.headers.get('server-timing');
    let body;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    let pass = allow.includes(res.status);
    if (spec.requireRequestId && !requestId) pass = false;
    if (spec.requireNonEmpty) {
      const arr = Array.isArray(body) ? body : body?.data;
      if (!Array.isArray(arr) || arr.length === 0) pass = false;
    }
    return {
      type: 'api',
      route: spec.path,
      url,
      status: res.status,
      ms,
      requestId,
      serverTiming: serverTiming || null,
      pass
    };
  } catch (err) {
    return { type: 'api', route: spec.path, url, pass: false, error: String(err.message || err) };
  }
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Validating LIVE production\n  WEB=${PROD_WEB}\n  API=${PROD_API}\n`);

  const results = [];
  for (const route of WEB_ROUTES) {
    const r = await checkWeb(route);
    results.push(r);
    console.log(`${r.pass ? 'PASS' : 'FAIL'} WEB ${route} ${r.status || ''} ${r.ms || ''}ms`);
  }
  for (const spec of API_ROUTES) {
    const r = await checkApi(spec);
    results.push(r);
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'} API ${spec.path} ${r.status || ''} ${r.ms || ''}ms` +
        (r.requestId ? ` rid=${r.requestId}` : '')
    );
  }

  const pass = results.every((r) => r.pass);
  const report = {
    generatedAt: new Date().toISOString(),
    prodWeb: PROD_WEB,
    prodApi: PROD_API,
    pass,
    results
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nProduction validate ${pass ? 'PASS' : 'FAIL'} → ${OUT_FILE}`);
  console.log(pass ? 'COMPLETE — production looks healthy.' : 'STOP — do not mark release complete.');
  process.exit(pass ? 0 : 1);
}

run();
