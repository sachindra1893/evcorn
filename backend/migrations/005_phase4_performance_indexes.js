/**
 * Migration 005: Phase 4 performance indexes
 * Additive only — safe for File-DB (no-op when Mongo unavailable) and existing APIs.
 */
module.exports = {
  id: '005_phase4_performance_indexes',
  description: 'Add bodyStyle+status vehicle index and category name index for browse/search',
  async up(db) {
    await db.collection('vehicles').createIndex(
      { bodyStyle: 1, status: 1 },
      { name: 'vehicle_bodyStyle_status' }
    );
    await db.collection('categories').createIndex(
      { name: 1 },
      { name: 'category_name' }
    );
    console.log('✅ Migration 005_phase4_performance_indexes applied.');
  },
  async down(db) {
    try {
      await db.collection('vehicles').dropIndex('vehicle_bodyStyle_status');
    } catch (_) { /* index may not exist */ }
    try {
      await db.collection('categories').dropIndex('category_name');
    } catch (_) { /* index may not exist */ }
    console.log('⏪ Migration 005_phase4_performance_indexes rolled back.');
  }
};
