/**
 * Migration 001: Initial Schema & Indexes
 */
module.exports = {
  id: '001_initial_schema',
  description: 'Create initial DB collection indexes for Vehicle, Article, and Category',
  async up(db) {
    await db.collection('vehicles').createIndex({ categoryId: 1 });
    await db.collection('articles').createIndex({ categoryId: 1, active: 1 });
    console.log('✅ Migration 001_initial_schema applied.');
  },
  async down(db) {
    await db.collection('vehicles').dropIndex({ categoryId: 1 });
    await db.collection('articles').dropIndex({ categoryId: 1, active: 1 });
    console.log('⏪ Migration 001_initial_schema rolled back.');
  }
};
