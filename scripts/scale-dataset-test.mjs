#!/usr/bin/env node
/**
 * Phase 5.3 — Large-dataset validation (temporary File-DB scale).
 *
 * Usage:
 *   node scripts/scale-dataset-test.mjs [--sizes 2000,5000,10000] [--articles 4000]
 *
 * - Backs up backend/data/vehicles.json + articles.json
 * - Generates synthetic catalog at each size
 * - Starts backend, measures key endpoints (cold + warm)
 * - Restores original data (never leaves huge seed in repo)
 *
 * Writes artifacts/phase53-scale-results.json
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'backend/data');
const VEHICLES_PATH = path.join(DATA_DIR, 'vehicles.json');
const ARTICLES_PATH = path.join(DATA_DIR, 'articles.json');
const OUT_DIR = path.join(ROOT, 'artifacts');
const OUT_FILE = path.join(OUT_DIR, 'phase53-scale-results.json');
const BASE = process.env.SCALE_TEST_BASE || 'http://127.0.0.1:3010';
const PORT = new URL(BASE).port || '3010';

function parseArgs(argv) {
  const out = {
    sizes: [2000, 5000, 10000],
    articles: 4000
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--sizes') {
      out.sizes = argv[++i].split(',').map((n) => Number(n.trim())).filter(Boolean);
    } else if (argv[i] === '--articles') {
      out.articles = Number(argv[++i]);
    }
  }
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data));
}

function cloneTemplate(base, id, i) {
  const brands = ['tata', 'mg', 'mahindra', 'hyundai', 'byd', 'kia'];
  const brand = brands[i % brands.length];
  const model = `Model-${Math.floor(i / 3)}`;
  return {
    ...base,
    id,
    name: `${brand} ${model} V${i % 3}`,
    categoryId: brand,
    brandSlug: brand,
    parentModel: model,
    variantName: `Variant ${i % 3}`,
    modelId: model.toLowerCase(),
    modelSlug: model.toLowerCase(),
    variantId: id,
    variantSlug: id,
    status: i % 17 === 0 ? 'Upcoming' : 'Published',
    bodyStyle: ['SUV', 'Hatchback', 'Sedan', 'MPV'][i % 4],
    pricing: {
      ...(base.pricing || {}),
      exShowroomPriceINR: 500000 + (i % 50) * 25000,
      priceText: `₹ ${(5 + (i % 50) * 0.25).toFixed(2)} Lakh`
    },
    performance: {
      ...(base.performance || {}),
      claimedRangeKM: 200 + (i % 40) * 10,
      rangeText: `${200 + (i % 40) * 10} km`
    },
    imageUrl: base.imageUrl && !String(base.imageUrl).startsWith('data:')
      ? base.imageUrl
      : 'https://res.cloudinary.com/kuu2880f/image/upload/v1700000000/evcorn/vehicles/placeholder.jpg'
  };
}

function generateVehicles(seedVehicles, n) {
  const base = seedVehicles[0] || {
    id: 'seed',
    name: 'Seed EV',
    categoryId: 'tata',
    pricing: { exShowroomPriceINR: 1000000, priceText: '₹ 10 Lakh' },
    performance: { claimedRangeKM: 300, rangeText: '300 km' },
    battery: { capacityKWh: 30, capacityText: '30 kWh' },
    status: 'Published',
    bodyStyle: 'SUV'
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(cloneTemplate(base, `scale-ev-${i}`, i));
  }
  return out;
}

function generateArticles(seedArticles, n) {
  const base = seedArticles.find((a) => a.imageUrl && !String(a.imageUrl).startsWith('data:')) || {
    title: 'Scale Article',
    description: 'Synthetic article for scale testing.',
    categoryId: 'general',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1558441719-ff34b0524af7?auto=format&fit=crop&w=400&q=60',
    paragraphs: ['Short body for scale test.']
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `scale-art-${i}`,
      title: `Scale Guide ${i}: Buying EV Tips`,
      description: base.description,
      categoryId: i % 2 === 0 ? 'general' : 'tata',
      active: true,
      status: 'published',
      publishAt: new Date(Date.now() - i * 1000).toISOString(),
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
      imageUrl: base.imageUrl,
      paragraphs: [`Paragraph for article ${i}. `.repeat(8)]
    });
  }
  return out;
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
        timeout: 120000
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

async function waitForHealth(attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    const r = await requestOnce('/api/health');
    if (r.ok) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function measureEndpoint(pathname, samples = 5) {
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
    samples: ok.map((w) => +w.ms.toFixed(2))
  };
}

async function measureSuite() {
  const paths = [
    '/api/health',
    '/api/categories',
    '/api/vehicles?light=true&status=Published',
    '/api/vehicles?light=true&status=Published&page=1&limit=20',
    '/api/articles?light=true',
    '/api/articles?light=true&page=1&limit=20',
    '/api/search/autocomplete?q=tata',
    '/api/search/unified?q=tata'
  ];
  const results = [];
  for (const p of paths) results.push(await measureEndpoint(p));
  return results;
}

/** Sample RSS from the backend child during a scale level (File-DB process). */
function sampleProcessMemory(child) {
  if (!child?.pid) return null;
  try {
    const out = execSync(`ps -o rss= -p ${child.pid}`, { encoding: 'utf8' }).trim();
    const rssKb = Number(out);
    if (!Number.isFinite(rssKb) || rssKb <= 0) return null;
    return { rssMb: +(rssKb / 1024).toFixed(2), pid: child.pid, at: new Date().toISOString() };
  } catch {
    return null;
  }
}

async function sampleMemoryDuringSuite(child, samples = 6, gapMs = 200) {
  const series = [];
  for (let i = 0; i < samples; i++) {
    const m = sampleProcessMemory(child);
    const health = await requestOnce('/api/health');
    const memMetrics = health.json?.metrics?.memory || null;
    // health metrics shape: { rss, heapTotal, heapUsed } as strings like "42 MB"
    let heapUsedMb = null;
    let rssFromNodeMb = null;
    if (memMetrics && typeof memMetrics === 'object') {
      const parseMb = (v) => {
        if (v == null) return null;
        const n = parseFloat(String(v));
        return Number.isFinite(n) ? n : null;
      };
      heapUsedMb = parseMb(memMetrics.heapUsed);
      rssFromNodeMb = parseMb(memMetrics.rss);
    }
    series.push({
      ...(m || {}),
      heapUsedMb,
      rssFromNodeMb,
      at: new Date().toISOString()
    });
    await new Promise((r) => setTimeout(r, gapMs));
  }
  if (!series.length) return null;
  const rss = series.map((s) => s.rssMb).filter((n) => Number.isFinite(n));
  const heap = series.map((s) => s.heapUsedMb).filter((n) => Number.isFinite(n));
  const summarize = (arr) =>
    arr.length
      ? {
          min: +Math.min(...arr).toFixed(2),
          max: +Math.max(...arr).toFixed(2),
          avg: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2),
          delta: +(Math.max(...arr) - Math.min(...arr)).toFixed(2)
        }
      : null;
  return {
    samples: series,
    rssMb: summarize(rss),
    heapUsedMb: summarize(heap),
    note:
      'RSS (ps) + heapUsed (Node via /api/health metrics) sampled during endpoint suite. ' +
      'Continuous growth across samples would suggest a leak in the test window; small deltas are normal (caches warming).'
  };
}

function startServer() {
  return spawn('node', ['server.js'], {
    cwd: path.join(ROOT, 'backend'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT,
      LOAD_TEST: '1',
      MONGO_URI: '' // force File-DB
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

async function killServer(child) {
  if (!child) return;
  try {
    child.kill('SIGTERM');
  } catch {}
  await new Promise((r) => setTimeout(r, 400));
  try {
    child.kill('SIGKILL');
  } catch {}
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const backupVehicles = fs.readFileSync(VEHICLES_PATH);
  const backupArticles = fs.readFileSync(ARTICLES_PATH);
  const seedVehicles = readJson(VEHICLES_PATH);
  const seedArticles = readJson(ARTICLES_PATH);

  const report = {
    generatedAt: new Date().toISOString(),
    phase: '5.3',
    base: BASE,
    methodology:
      'Temporary synthetic File-DB catalogs; original JSON restored after each run. ' +
      'Cold = first request after process start; warm = avg of 5 subsequent (cache + mem File-DB).',
    seedCounts: { vehicles: seedVehicles.length, articles: seedArticles.length },
    levels: []
  };

  let child = null;
  try {
    // Baseline (current seed)
    writeJson(VEHICLES_PATH, seedVehicles);
    writeJson(ARTICLES_PATH, seedArticles);
    child = startServer();
    if (!(await waitForHealth())) throw new Error('Server failed to start (baseline)');
    const baselineMemBefore = sampleProcessMemory(child);
    const baseline = await measureSuite();
    const baselineMemory = await sampleMemoryDuringSuite(child);
    report.levels.push({
      vehicles: seedVehicles.length,
      articles: seedArticles.length,
      label: 'baseline-seed',
      endpoints: baseline,
      memory: { beforeSuite: baselineMemBefore, duringSuite: baselineMemory }
    });
    await killServer(child);
    child = null;

    for (const size of args.sizes) {
      const vehicles = generateVehicles(seedVehicles, size);
      const articleCount = size >= 5000 ? args.articles : Math.min(args.articles, 1000);
      const arts = generateArticles(seedArticles, articleCount);

      writeJson(VEHICLES_PATH, vehicles);
      writeJson(ARTICLES_PATH, arts);

      child = startServer();
      if (!(await waitForHealth())) throw new Error(`Server failed at ${size} vehicles`);
      const memBefore = sampleProcessMemory(child);
      const endpoints = await measureSuite();
      const memory = await sampleMemoryDuringSuite(child);
      // Extra churn pass: re-hit warm endpoints and sample again for growth check
      await measureSuite();
      const memoryAfterChurn = await sampleMemoryDuringSuite(child, 4, 150);
      report.levels.push({
        vehicles: size,
        articles: arts.length,
        label: `scale-${size}`,
        endpoints,
        memory: {
          beforeSuite: memBefore,
          duringSuite: memory,
          afterSecondSuite: memoryAfterChurn,
          leakSignal:
            memoryAfterChurn && memory
              ? memoryAfterChurn.rssMb.avg - memory.rssMb.avg > 25
                ? 'investigate'
                : 'stable'
              : 'unknown'
        }
      });
      console.log(
        `\n── ${size} vehicles / ${arts.length} articles ──\n` +
          endpoints
            .map(
              (e) =>
                `${e.path}: cold=${e.coldMs}ms warm=${e.warmAvgMs}ms bytes=${e.warmBytes} ok=${e.ok}`
            )
            .join('\n') +
          (memory
            ? `\nmemory RSS avg=${memory.rssMb.avg}MB delta=${memory.rssMb.delta}MB leakSignal=${
                memoryAfterChurn && memory
                  ? memoryAfterChurn.rssMb.avg - memory.rssMb.avg > 25
                    ? 'investigate'
                    : 'stable'
                  : 'unknown'
              }`
            : '')
      );
      await killServer(child);
      child = null;
    }

    report.pass = report.levels.every((l) => l.endpoints.every((e) => e.ok));
    // Soft latency guidance at 10k: paginated light < 500ms warm; search autocomplete < 300ms warm
    const xl = report.levels.find((l) => l.vehicles >= 10000);
    if (xl) {
      const page = xl.endpoints.find((e) => e.path.includes('page=1&limit=20') && e.path.includes('vehicles'));
      const ac = xl.endpoints.find((e) => e.path.includes('autocomplete'));
      report.scalabilityNotes = {
        vehiclesPaginatedWarmMs: page?.warmAvgMs,
        autocompleteWarmMs: ac?.warmAvgMs,
        vehiclesFullLightWarmMs: xl.endpoints.find((e) => e.path === '/api/vehicles?light=true&status=Published')
          ?.warmAvgMs,
        note:
          'Full unpaginated light list at 10k remains large by design (FE browse still indexes client-side). ' +
          'Prefer page/limit for server-side scale; Compare uses light catalog + per-id detail.'
      };
    }
  } catch (err) {
    report.pass = false;
    report.error = err.message || String(err);
    console.error(err);
  } finally {
    await killServer(child);
    fs.writeFileSync(VEHICLES_PATH, backupVehicles);
    fs.writeFileSync(ARTICLES_PATH, backupArticles);
    console.log('Restored original vehicles.json and articles.json');
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n→ ${OUT_FILE}`);
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
