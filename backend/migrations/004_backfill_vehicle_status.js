/**
 * Migration 004: Backfill Vehicle status
 *
 * P0 root cause (Vehicle Detail infinite spinner / Browse EVs empty /
 * vehicle search returning zero results). The Vehicle schema declares
 * `status` with `default: 'Published'`, but that default only applies when
 * a document is constructed *through Mongoose* — the production vehicle
 * collection was seeded via a script that bypassed the model (same root
 * cause class as `bodyStyle`, see migration 003), so `status` is genuinely
 * absent on every existing document. `{ status: 'Published' }` therefore
 * matched zero documents everywhere it was queried.
 *
 * A query-level tolerance fix (`publishedVehicleStatusFilter` in
 * utils/apiQuery.js) already makes reads treat a missing `status` as
 * "Published", so this migration is not required to unblock production.
 * It exists to make the persisted data match what every DTO and query
 * already assumes, so future features that query `status` directly (new
 * indexes, admin filtering/sorting, exports) don't silently reintroduce
 * this bug.
 */
module.exports = {
  id: '004_backfill_vehicle_status',
  description: 'Backfill status="Published" on existing vehicle documents missing the field',
  async up(db) {
    const result = await db.collection('vehicles').updateMany(
      { status: { $exists: false } },
      { $set: { status: 'Published' } }
    );
    console.log(`✅ Migration 004_backfill_vehicle_status applied. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  },
  async down(db) {
    // Non-destructive: cannot distinguish "was always Published" from
    // "backfilled by this migration", so down() is a documented no-op.
    console.log('⏪ Migration 004_backfill_vehicle_status: no-op rollback (cannot safely distinguish backfilled docs from originally-set ones).');
  }
};
