#!/usr/bin/env node
/**
 * Phase 4 load test — zero heavy deps (Node http only).
 *
 * Usage:
 *   node scripts/load-test.mjs [--base http://127.0.0.1:3000] [--concurrency 100,500,1000]
 *
 * Starts the backend itself if LOAD_TEST_START_SERVER=1 (default when BASE not set
 * and port is free). Writes artifacts/phase4-load-results.json.
 *
 * Metrics per concurrency level: avg / p95 / p99 latency, error rate, throughput,
 * process RSS/heap (sampled from /api/metrics when available).
 */
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'artifacts');
const OUT_FILE = path.join(OUT_DIR, 'phase4-load-results.json');

function parseArgs(argv) {
  const out = {
    base: process.env.LOAD_TEST_BASE || 'http://127.0.0.1:3000',
    concurrency: [100, 500, 1000],
    requestsPerVu: Number(process.env.LOAD_TEST_RPS_PER_VU || 3),
    startServer: process.env.LOAD_TEST_START_SERVER !== '0'
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') out.base = argv[++i];
    else if (argv[i] === '--concurrency') {
      out.concurrency = argv[++i].split(',').map((n) => Number(n.trim())).filter(Boolean);
    } else if (argv[i] === '--no-start') out.startServer = false;
  }
  return out;
}

const ENDPOINTS = [
  '/api/health',
  '/api/categories',
  '/api/vehicles?light=true',
  '/api/articles?light=true',
  '/api/search/autocomplete?q=tat',
  '/api/search/trending'
];

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function requestOnce(baseUrl, pathname) {
  return new Promise((resolve) => {
    const url = new URL(pathname, baseUrl);
    const start = performance.now();
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { Accept: 'application/json', Connection: 'keep-alive' },
        timeout: 30000
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            ms: performance.now() - start
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({ ok: false, status: 0, ms: performance.now() - start, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, ms: performance.now() - start, error: 'timeout' });
    });
    req.end();
  });
}

async function fetchJson(baseUrl, pathname) {
  return new Promise((resolve) => {
    const url = new URL(pathname, baseUrl);
    http.get(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        timeout: 5000
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve(null);
          }
        });
      }
    ).on('error', () => resolve(null));
  });
}

async function waitForHealth(baseUrl, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    const healthy = await new Promise((resolve) => {
      const url = new URL('/api/health', baseUrl);
      const req = http.get(
        { hostname: url.hostname, port: url.port || 80, path: url.pathname, timeout: 2000 },
        (res) => {
          res.resume();
          resolve(res.statusCode === 200);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
    if (healthy) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function runLevel(baseUrl, concurrency, requestsPerVu) {
  const totalRequests = concurrency * requestsPerVu;
  const latencies = [];
  let errors = 0;
  const started = performance.now();

  // Wave of concurrent workers; each issues requestsPerVu sequential GETs
  const workers = Array.from({ length: concurrency }, async (_, wi) => {
    for (let i = 0; i < requestsPerVu; i++) {
      const pathName = ENDPOINTS[(wi + i) % ENDPOINTS.length];
      const result = await requestOnce(baseUrl, pathName);
      latencies.push(result.ms);
      if (!result.ok) errors += 1;
    }
  });

  await Promise.all(workers);
  const elapsedSec = (performance.now() - started) / 1000;
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const metricsBefore = await fetchJson(baseUrl, '/api/metrics');

  return {
    concurrency,
    totalRequests,
    elapsedSec: +elapsedSec.toFixed(3),
    throughputRps: +(totalRequests / elapsedSec).toFixed(2),
    avgMs: +(sum / sorted.length).toFixed(2),
    p50Ms: +percentile(sorted, 50).toFixed(2),
    p95Ms: +percentile(sorted, 95).toFixed(2),
    p99Ms: +percentile(sorted, 99).toFixed(2),
    errorCount: errors,
    errorRate: +((errors / totalRequests) * 100).toFixed(3),
    memory: metricsBefore?.data?.memory || null,
    cache: metricsBefore?.data?.cache || null
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let child = null;
  const startedByUs = args.startServer;

  if (startedByUs) {
    child = spawn('node', ['server.js'], {
      cwd: path.join(ROOT, 'backend'),
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: new URL(args.base).port || '3000',
        // Measure app throughput without the production per-IP 300/15m gate.
        // Production rate limits remain the DoS control plane.
        LOAD_TEST: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  try {
    const ready = await waitForHealth(args.base);
    if (!ready) {
      const report = {
        generatedAt: new Date().toISOString(),
        pass: false,
        error: `Server not healthy at ${args.base}`,
        environment: {
          base: args.base,
          note: 'Start backend (npm --prefix backend start) or set LOAD_TEST_BASE'
        }
      };
      fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
      console.error(report.error);
      process.exit(1);
    }

    const health = await fetchJson(args.base, '/api/health');
    const levels = [];
    for (const c of args.concurrency) {
      console.log(`\n── Load level: ${c} concurrent users (${args.requestsPerVu} req each) ──`);
      const result = await runLevel(args.base, c, args.requestsPerVu);
      levels.push(result);
      console.log(
        `avg=${result.avgMs}ms p95=${result.p95Ms}ms p99=${result.p99Ms}ms ` +
          `err=${result.errorRate}% rps=${result.throughputRps}`
      );
      // Brief cool-down between levels
      await new Promise((r) => setTimeout(r, 500));
    }

    const sustained = levels.map((l) => ({
      concurrency: l.concurrency,
      sustained: l.errorRate < 5 && l.p95Ms < 2000,
      note:
        l.errorRate >= 5
          ? 'High error rate — local machine / single-process limit likely reached'
          : l.p95Ms >= 2000
            ? 'High P95 — latency degraded under concurrency'
            : 'Within pragmatic local thresholds'
    }));

    const report = {
      generatedAt: new Date().toISOString(),
      phase: 4,
      tool: 'scripts/load-test.mjs (Node http, no k6/autocannon dependency)',
      environment: {
        base: args.base,
        database: health?.database || 'unknown',
        node: process.version,
        platform: process.platform,
        cpus: os.cpus()?.length,
        totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
        note:
          'Local single-process File-DB or Mongo with LOAD_TEST=1 (API rate limit skipped for capacity measurement). ' +
          'Production still enforces 300 req/15m per IP. 1000 concurrent users on a laptop ' +
          'often cannot be sustained honestly — results document that ceiling.'
      },
      methodology: {
        endpoints: ENDPOINTS,
        concurrencyLevels: args.concurrency,
        requestsPerVirtualUser: args.requestsPerVu,
        totalRequestsPerLevel: args.concurrency.map((c) => c * args.requestsPerVu),
        latency: 'client-observed end-to-end (includes local loopback)',
        errorDefinition: 'HTTP status >= 400 or network/timeout failure',
        rateLimit: 'Skipped via LOAD_TEST=1 for capacity measurement only'
      },
      levels,
      sustainedAssessment: sustained,
      pass: levels.every((l) => l.errorRate < 25) // soft gate: catastrophic only fails script
    };

    fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n→ ${OUT_FILE}`);
    process.exit(report.pass ? 0 : 1);
  } finally {
    if (child) {
      try {
        child.kill('SIGTERM');
      } catch {}
      // Ensure child does not linger and block Playwright's port 3000
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {}
      }, 500).unref?.();
      await new Promise((r) => setTimeout(r, 600));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
