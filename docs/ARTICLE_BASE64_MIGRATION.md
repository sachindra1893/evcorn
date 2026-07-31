# Article Base64 → Cloudinary migration

One-time ops migration that converts persisted `data:image/...` article images into Cloudinary CDN URLs.

## What it touches

- Cover: `imageUrl` (and legacy `media.*` / `cloudinaryImage*` mirrors when Base64)
- Body blocks inside `__EVBLOCKS__` paragraphs: `image`, `gallery`, `comparison`
- Top-level `blocks` array (same block types)
- Author `author.imageUrl` when Base64

Existing `https://res.cloudinary.com/...` and other `http(s)` URLs are left unchanged.

## How to run

From `backend/`:

```bash
# Phase 1 — summary only (no Cloudinary required)
node scripts/migrate-article-base64-to-cloudinary.js --scan

# Force local file-DB scan
node scripts/migrate-article-base64-to-cloudinary.js --scan --file-db

# Phase 2 — upload + replace + save (needs CLOUDINARY_* env)
node scripts/migrate-article-base64-to-cloudinary.js --apply
```

`--apply` uses Mongo when `MONGO_URI` is set and reachable; use `--file-db` to apply against `backend/data/articles.json` only. A timestamped backup is written under `backend/data/` before writes.

## Idempotency

Re-running `--apply` after a successful migration uploads nothing for already-CDN URLs and skips articles with zero Base64 fields.

## Related code

- Runner: `backend/scripts/migrate-article-base64-to-cloudinary.js`
- Helpers: `backend/utils/articleBase64Migrate.js`
- Version stub: `backend/migrations/006_migrate_article_base64_images.js`
