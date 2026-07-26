/**
 * Migration 002: Add Editorial Indexes
 */
module.exports = {
  id: '002_add_editorial_indexes',
  description: 'Add compound status and publishAt indexes for high-throughput editorial queries',
  async up(db) {
    await db.collection('articles').createIndex({ status: 1, publishAt: -1 });
    console.log('✅ Migration 002_add_editorial_indexes applied.');
  },
  async down(db) {
    await db.collection('articles').dropIndex({ status: 1, publishAt: -1 });
    console.log('⏪ Migration 002_add_editorial_indexes rolled back.');
  }
};
