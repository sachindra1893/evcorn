#!/usr/bin/env node
/**
 * Phase 5.3 final review — MongoDB path validation for shared optimizations.
 *
 * Loads backend/.env (never prints secrets). Starts backend on SCALE_TEST_BASE
 * with MONGO_URI from env (if present). Measures the same endpoint suite as
 * File-DB scale for shared behaviors (light DTO, pagination, search caps).
 *
 * File-DB-only pieces (fileDbQuery / mem parse cache) are labeled N/A here.
 *
 * Writes artifacts/phase53-mongo-results.json
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'backend/.env');
const OUT = path.join(ROOT, 'artifacts/phase53-mongo-results.json');
const BASE = process.env.SCALE_TEST_BASE || 'http://127.0.0.1:3011';
const PORT = new URL(BASE).port || '3011';

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function requestOnce(pathname) {
  return new Promise((resolve) => {
    const url = new URL(pathname, BASE);
    const start = performance.now();
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { Accept: 'application/json', Connection: 'keep-alive' },
        timeout: 60000
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(buf.toString('utf8'));
          } catch {
            json = null;
          }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            ms: performance.now() - start,
            bytes: buf.length,
            json
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({ ok: false, status: 0, ms: performance.now() - start, bytes: 0, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, ms: performance.now() - start, bytes: 0, error: 'timeout' });
    });
    req.end();
  });
}

async function waitForHealth(attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    const r = await requestOnce('/api/health');
    if (r.ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function measureEndpoint(pathname, samples = 3) {
  const cold = await requestOnce(pathname);
  const warm = [];
  for (let i = 0; i < samples; i++) warm.push(await requestOnce(pathname));
  const ok = warm.filter((w) => w.ok);
  const avg = ok.length ? ok.reduce((s, w) => s + w.ms, 0) / ok.length : null;
  return {
    path: pathname,
    coldMs: +cold.ms.toFixed(2),
    coldBytes: cold.bytes,
    warmAvgMs: avg == null ? null : +avg.toFixed(2),
    warmBytes: ok[0]?.bytes ?? 0,
    ok: cold.ok && ok.every((w) => w.ok),
    sampleShape: summarizeShape(cold.json)
  };
}

function summarizeShape(json) {
  if (json == null) return null;
  if (Array.isArray(json)) {
    const first = json[0] || {};
    return {
      type: 'array',
      length: json.length,
      hasNestedPricingDefault: first.pricing && first.charging != null,
      hasParagraphs: Object.prototype.hasOwnProperty.call(first, 'paragraphs'),
      keysSample: Object.keys(first).slice(0, 12)
    };
  }
  if (typeof json === 'object') {
    if (Array.isArray(json.data)) {
      return {
        type: 'envelope',
        length: json.data.length,
        meta: json.meta || null,
        keysSample: Object.keys(json.data[0] || {}).slice(0, 12)
      };
    }
    if (json.vehicles || json.articles) {
      return {
        type: 'unified-search',
        vehicleCount: Array.isArray(json.vehicles) ? json.vehicles.length : 0,
        articleCount: Array.isArray(json.articles) ? json.articles.length : 0
      };
    }
  }
  return { type: typeof json };
}

async function main() {
  const fileEnv = loadEnvFile(ENV_PATH);
  const mongoUri = process.env.MONGO_URI || fileEnv.MONGO_URI || '';
  const report = {
    generatedAt: new Date().toISOString(),
    phase: '5.3-final-review',
    base: BASE,
    mongoConfigured: Boolean(mongoUri && mongoUri.trim()),
    mongoScheme: mongoUri ? (mongoUri.startsWith('mongodb') ? 'mongodb*' : 'other') : null,
    labels: {
      shared: [
        'Light vehicle/article DTOs',
        'Search result caps (50 vehicles / 30 articles)',
        'Compare light catalog + by-id detail (FE)',
        'API page/limit pagination + MAX_LIMIT=100',
        'In-process node-cache fingerprints (Phase 4)'
      ],
      fileDbOnly: [
        'backend/utils/fileDbQuery.js matcher',
        'File-DB in-memory JSON parse cache (database.js mem)'
      ]
    },
    endpoints: [],
    pass: false
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  if (!report.mongoConfigured) {
    report.skipped = true;
    report.reason =
      'MONGO_URI not available in env or backend/.env — Mongo validation skipped. ' +
      'Shared optimizations still apply when production uses Mongo; File-DB-only pieces remain File-DB.';
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    console.log(`\n→ ${OUT}`);
    process.exit(0);
  }

  let child = null;
  try {
    child = spawn('node', ['server.js'], {
      cwd: path.join(ROOT, 'backend'),
      env: {
        ...process.env,
        ...fileEnv,
        NODE_ENV: 'development',
        PORT,
        LOAD_TEST: '1'
        // Keep MONGO_URI from fileEnv / process.env — do not force empty
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let bootLog = '';
    child.stderr?.on('data', (d) => {
      bootLog += d.toString();
    });
    child.stdout?.on('data', (d) => {
      bootLog += d.toString();
    });

    const healthy = await waitForHealth();
    if (!healthy) {
      report.error = 'Server failed to become healthy with Mongo';
      report.bootLogTail = bootLog.slice(-800).replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, 'mongodb***');
      throw new Error(report.error);
    }

    const health = await requestOnce('/api/health');
    report.healthDatabase = health.json?.database || null;
    report.connectedViaMongo =
      typeof report.healthDatabase === 'string' &&
      /MongoDB/i.test(report.healthDatabase) &&
      !/Local JSON/i.test(report.healthDatabase);

    if (!report.connectedViaMongo) {
      report.pass = false;
      report.skipped = true;
      report.reason =
        'MONGO_URI was set but process fell back to File-DB (Atlas unreachable or auth failure). ' +
        'Shared optimizations were NOT validated on Mongo in this run. Re-run with network access to Atlas.';
      report.bootLogTail = bootLog.slice(-800).replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, 'mongodb***');
      throw new Error(report.reason);
    }

    // Optional heap from health metrics if exposed
    report.heapFromHealth = health.json?.metrics?.memory || health.json?.metrics?.heap || null;

    const paths = [
      '/api/health',
      '/api/categories',
      '/api/vehicles?light=true&status=Published&page=1&limit=20',
      '/api/vehicles?light=true&status=Published',
      '/api/articles?light=true&page=1&limit=20',
      '/api/search/autocomplete?q=tata',
      '/api/search/unified?q=tata'
    ];

    for (const p of paths) {
      report.endpoints.push(await measureEndpoint(p));
    }

    const lightPage = report.endpoints.find((e) => e.path.includes('page=1&limit=20') && e.path.includes('vehicles'));
    const unified = report.endpoints.find((e) => e.path.includes('unified'));
    report.checks = {
      paginatedLightOk: Boolean(lightPage?.ok),
      lightShapeOmitsChargingDefault: lightPage?.sampleShape?.type === 'envelope'
        ? !lightPage.sampleShape.keysSample?.includes('charging')
        : lightPage?.sampleShape
          ? !lightPage.sampleShape.hasNestedPricingDefault
          : null,
      unifiedCapped:
        unified?.sampleShape?.type === 'unified-search'
          ? unified.sampleShape.vehicleCount <= 50 && unified.sampleShape.articleCount <= 30
          : null
    };

    report.pass = report.endpoints.every((e) => e.ok);
    console.log(
      report.endpoints
        .map((e) => `${e.path}: warm=${e.warmAvgMs}ms bytes=${e.warmBytes} ok=${e.ok}`)
        .join('\n')
    );
  } catch (err) {
    report.pass = false;
    report.error = err.message || String(err);
    console.error(err);
  } finally {
    if (child) {
      try {
        child.kill('SIGTERM');
      } catch {}
      await new Promise((r) => setTimeout(r, 400));
      try {
        child.kill('SIGKILL');
      } catch {}
    }
  }

  // Scrub any accidental secret leakage from report fields
  const scrubbed = JSON.stringify(report).replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, 'mongodb***');
  fs.writeFileSync(OUT, JSON.stringify(JSON.parse(scrubbed), null, 2));
  console.log(`\n→ ${OUT} (mongoConfigured=${report.mongoConfigured}, pass=${report.pass})`);
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
