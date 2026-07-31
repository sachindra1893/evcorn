/**
 * Migration 006: Article Base64 images → Cloudinary CDN URLs
 *
 * This versioned migration is documentation + a thin entry point.
 * The practical runner is:
 *   node scripts/migrate-article-base64-to-cloudinary.js --scan|--apply
 *
 * Reason: scripts/run-migrations.js currently only logs migrations and does
 * not execute up(). Uploads also require Cloudinary credentials and are
 * intentionally interactive/ops-gated via --apply.
 *
 * Safe / idempotent: only replaces data:image/... ; never overwrites http(s)
 * CDN URLs; re-runs skip already-migrated articles.
 */
module.exports = {
  id: '006_migrate_article_base64_images',
  description: 'Upload Base64 article images to Cloudinary and persist CDN URLs',
  async up() {
    console.log(
      'Migration 006 is ops-gated. Run:\n' +
        '  node scripts/migrate-article-base64-to-cloudinary.js --scan\n' +
        '  node scripts/migrate-article-base64-to-cloudinary.js --apply\n' +
        'See docs/ARTICLE_BASE64_MIGRATION.md'
    );
  },
  async down() {
    console.log(
      '⏪ Migration 006_migrate_article_base64_images: no automatic rollback ' +
        '(would require restoring pre-apply backup JSON under backend/data/).'
    );
  }
};
