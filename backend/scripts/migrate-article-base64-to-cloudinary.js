/**
 * One-time ops migration: article Base64 data:image → Cloudinary CDN URLs.
 *
 * Why a standalone script (not only migrations/*.js)?
 * `scripts/run-migrations.js` currently only logs migration IDs — it does not
 * execute `up()`. Same pattern as `backfill-vehicle-status.js`.
 *
 * Usage (from backend/):
 *   node scripts/migrate-article-base64-to-cloudinary.js --scan
 *   node scripts/migrate-article-base64-to-cloudinary.js --apply
 *   node scripts/migrate-article-base64-to-cloudinary.js --scan --file-db
 *
 * Rules:
 * - Phase 1 `--scan`: summary only, no writes, Cloudinary not required
 * - Phase 2 `--apply`: upload Base64 → Cloudinary → replace → save
 * - Leaves https://res.cloudinary.com/ and other http(s) URLs unchanged
 * - Only migrates data:image/...
 * - Cover + content image/gallery/comparison blocks + legacy media mirrors
 * - Skips articles with no Base64; never re-uploads CDN URLs
 * - Dedupes identical data URLs within a run (upload once)
 * - Idempotent: re-running --apply after success is a no-op
 * - Preserves id/slug/SEO/metadata/blocks/order/status/createdAt; sets updatedAt on change
 *
 * See docs/ARTICLE_BASE64_MIGRATION.md
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const {
  dataUrlToBuffer,
  scanArticleImages,
  articleHasImageBlocks,
  migrateArticleBase64Images,
  shouldMigrateImageUrl
} = require('../utils/articleBase64Migrate');

const ARTICLES_JSON = path.join(__dirname, '../data/articles.json');
const BACKUP_DIR = path.join(__dirname, '../data');

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    scan: args.has('--scan'),
    apply: args.has('--apply'),
    fileDb: args.has('--file-db'),
    help: args.has('--help') || args.has('-h')
  };
}

function printHelp() {
  console.log(`
EVCorn — migrate article Base64 images → Cloudinary

  --scan       Phase 1: count Base64 vs CDN (no writes)
  --apply      Phase 2: upload + replace + save (needs Cloudinary env)
  --file-db    Force local backend/data/articles.json (ignore MONGO_URI)
  --help       Show this help

Examples:
  node scripts/migrate-article-base64-to-cloudinary.js --scan
  node scripts/migrate-article-base64-to-cloudinary.js --apply
  node scripts/migrate-article-base64-to-cloudinary.js --scan --file-db
`);
}

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function loadFileDbArticles() {
  if (!fs.existsSync(ARTICLES_JSON)) return [];
  const raw = JSON.parse(fs.readFileSync(ARTICLES_JSON, 'utf8'));
  return Array.isArray(raw) ? raw : [];
}

function saveFileDbArticles(articles) {
  fs.writeFileSync(ARTICLES_JSON, JSON.stringify(articles, null, 2) + '\n');
}

function articleId(doc) {
  if (!doc) return '';
  if (doc._id) return String(doc._id);
  return String(doc.id || '');
}

function summarizeArticles(articles, sourceLabel) {
  let withImageBlocks = 0;
  let imagesAlreadyCdn = 0;
  let imagesStillBase64 = 0;
  let articlesWithBase64 = 0;
  const samples = [];

  for (const a of articles) {
    const scan = scanArticleImages(a);
    if (scan.hasImageBlocks || articleHasImageBlocks(a)) withImageBlocks++;
    imagesAlreadyCdn += scan.cdn;
    imagesStillBase64 += scan.base64;
    if (scan.base64 > 0) {
      articlesWithBase64++;
      if (samples.length < 10) {
        samples.push({
          id: articleId(a),
          title: String(a.title || '').slice(0, 72),
          base64Locations: scan.locations
        });
      }
    }
  }

  return {
    source: sourceLabel,
    articlesScanned: articles.length,
    articlesWithImageBlocks: withImageBlocks,
    articlesWithBase64,
    imagesAlreadyCdn,
    imagesStillBase64,
    samples
  };
}

async function uploadDataUrl(dataUrl, location) {
  // Lazy-load so --scan does not require Cloudinary SDK boot.
  const { uploadBuffer } = require('../services/upload.service');
  const { buffer } = dataUrlToBuffer(dataUrl);
  const folder = 'evcorn/articles/migrated';
  const result = await uploadBuffer(buffer, folder);
  return { url: result.url, public_id: result.public_id, location };
}

function pickPersistFields(original, migrated) {
  // Preserve identity / editorial fields; only image-bearing fields + updatedAt change.
  const next = { ...original };

  next.imageUrl = migrated.imageUrl;
  if (Object.prototype.hasOwnProperty.call(migrated, 'media')) next.media = migrated.media;
  if (Object.prototype.hasOwnProperty.call(migrated, 'cloudinaryImage')) {
    next.cloudinaryImage = migrated.cloudinaryImage;
  }
  if (Object.prototype.hasOwnProperty.call(migrated, 'cloudinaryImages')) {
    next.cloudinaryImages = migrated.cloudinaryImages;
  }
  if (Object.prototype.hasOwnProperty.call(migrated, 'author')) next.author = migrated.author;
  if (Object.prototype.hasOwnProperty.call(migrated, 'paragraphs')) next.paragraphs = migrated.paragraphs;
  if (Object.prototype.hasOwnProperty.call(migrated, 'blocks')) next.blocks = migrated.blocks;
  next.updatedAt = new Date().toISOString();

  return next;
}

async function applyToArticles(articles, { persistOne }) {
  const report = {
    scanned: articles.length,
    updated: 0,
    uploaded: 0,
    skippedCdn: 0,
    skippedNoChange: 0,
    errors: []
  };

  for (const original of articles) {
    const id = articleId(original);
    try {
      const pre = scanArticleImages(original);
      report.skippedCdn += pre.cdn;
      if (pre.base64 === 0) {
        report.skippedNoChange++;
        continue;
      }

      const result = await migrateArticleBase64Images(original, { uploadDataUrl });
      if (!result.changed) {
        report.skippedNoChange++;
        continue;
      }

      const toSave = pickPersistFields(original, result.article);
      await persistOne(toSave, original);
      report.updated++;
      report.uploaded += result.uploaded;
      console.log(`  ✓ ${id} — replaced ${result.replaced.length} Base64 image(s), uploaded ${result.uploaded}`);
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      report.errors.push({ id, error: message });
      console.error(`  ✗ ${id} — ${message}`);
    }
  }

  return report;
}

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri || !String(uri).trim()) {
    return { ok: false, reason: 'MONGO_URI not configured' };
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    return { ok: true };
  } catch (err) {
    const safe = String(err.message || err).replace(/mongodb(\+srv)?:\/\/[^\s)'"]+/gi, 'mongodb://***');
    return { ok: false, reason: safe };
  }
}

function getArticleModel() {
  return require('../models/Article');
}

async function runScan({ fileDb }) {
  console.log('=== Phase 1: SCAN (no writes) ===\n');

  const reports = [];

  if (fileDb || !process.env.MONGO_URI) {
    const articles = loadFileDbArticles();
    const summary = summarizeArticles(articles, 'file-db:backend/data/articles.json');
    reports.push(summary);
    console.log(JSON.stringify(summary, null, 2));
    if (!fileDb && !process.env.MONGO_URI) {
      console.log('\n(No MONGO_URI — scanned local file-DB only.)');
    }
  }

  if (!fileDb && process.env.MONGO_URI) {
    const conn = await connectMongo();
    if (!conn.ok) {
      console.log(JSON.stringify({
        source: 'mongo',
        reachable: false,
        reason: conn.reason,
        note: 'Falling back to file-DB scan for local evidence. Migration script still targets Mongo on --apply when Atlas is reachable.'
      }, null, 2));

      if (!reports.length) {
        const articles = loadFileDbArticles();
        const summary = summarizeArticles(articles, 'file-db:backend/data/articles.json (mongo unreachable fallback)');
        reports.push(summary);
        console.log(JSON.stringify(summary, null, 2));
      }
    } else {
      const Article = getArticleModel();
      const articles = await Article.find({}).lean();
      const summary = summarizeArticles(articles, 'mongo:articles');
      reports.push(summary);
      console.log(JSON.stringify(summary, null, 2));
      await mongoose.disconnect();
    }
  }

  const totals = reports.reduce((acc, r) => {
    acc.articlesScanned += r.articlesScanned;
    acc.articlesWithImageBlocks += r.articlesWithImageBlocks;
    acc.imagesAlreadyCdn += r.imagesAlreadyCdn;
    acc.imagesStillBase64 += r.imagesStillBase64;
    return acc;
  }, {
    articlesScanned: 0,
    articlesWithImageBlocks: 0,
    imagesAlreadyCdn: 0,
    imagesStillBase64: 0
  });

  console.log('\n--- SCAN REPORT ---');
  console.log(JSON.stringify(totals, null, 2));
  return totals;
}

async function runApply({ fileDb }) {
  console.log('=== Phase 2: APPLY (upload + replace + save) ===\n');

  if (!cloudinaryConfigured()) {
    console.error('Cloudinary env incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (fileDb || !process.env.MONGO_URI) {
    const articles = loadFileDbArticles();
    const backupPath = path.join(BACKUP_DIR, `backup_articles_before_base64_${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(articles, null, 2));
    console.log(`Backup written: ${backupPath} (${articles.length} docs)`);
    console.log(`Source: file-db (${ARTICLES_JSON})\n`);

    const working = articles.map((a) => ({ ...a }));
    const report = await applyToArticles(working, {
      persistOne: async (toSave) => {
        const idx = working.findIndex((a) => articleId(a) === articleId(toSave));
        if (idx === -1) throw new Error('Article not found in file-DB working set');
        working[idx] = toSave;
        saveFileDbArticles(working);
      }
    });

    printApplyReport(report);
    if (report.errors.length) process.exit(1);
    return report;
  }

  const conn = await connectMongo();
  if (!conn.ok) {
    console.error(`MongoDB unreachable — refusing --apply (use --file-db for local only). ${conn.reason}`);
    process.exit(1);
  }

  const Article = getArticleModel();
  const articles = await Article.find({}).lean();
  const backupPath = path.join(BACKUP_DIR, `backup_articles_mongo_before_base64_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(articles, null, 2));
  console.log(`Backup written: ${backupPath} (${articles.length} docs)`);
  console.log('Source: mongo\n');

  const report = await applyToArticles(articles, {
    persistOne: async (toSave, original) => {
      const id = original._id;
      const $set = { updatedAt: new Date() };
      for (const key of [
        'imageUrl',
        'media',
        'cloudinaryImage',
        'cloudinaryImages',
        'author',
        'paragraphs',
        'blocks'
      ]) {
        if (toSave[key] !== undefined) $set[key] = toSave[key];
      }

      await Article.updateOne({ _id: id }, { $set });

      const verify = await Article.findById(id).lean();
      const post = scanArticleImages(verify);
      if (post.base64 > 0) {
        throw new Error(`Post-save still has ${post.base64} Base64 image(s)`);
      }
      if (shouldMigrateImageUrl(verify.imageUrl)) {
        throw new Error('Post-save cover is still Base64');
      }
    }
  });

  await mongoose.disconnect();
  printApplyReport(report);
  if (report.errors.length) process.exit(1);
  return report;
}

function printApplyReport(report) {
  console.log('\n--- APPLY REPORT ---');
  console.log(JSON.stringify({
    scanned: report.scanned,
    updated: report.updated,
    uploaded: report.uploaded,
    skippedCdn: report.skippedCdn,
    skippedNoChange: report.skippedNoChange,
    errors: report.errors.length,
    errorDetails: report.errors
  }, null, 2));
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help || (!opts.scan && !opts.apply)) {
    printHelp();
    process.exit(opts.help ? 0 : 1);
  }
  if (opts.scan && opts.apply) {
    console.error('Choose either --scan or --apply, not both.');
    process.exit(1);
  }

  if (opts.scan) {
    await runScan(opts);
  } else {
    await runApply(opts);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  });
}

module.exports = {
  summarizeArticles,
  applyToArticles,
  parseArgs
};
