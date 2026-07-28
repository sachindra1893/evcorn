/**
 * P0 Vehicle Detail Bug — Standalone Backfill Runner
 *
 * The existing migrations/ system (scripts/run-migrations.js) does not
 * actually execute migration up() functions — it only logs them (same
 * limitation noted in backfill-body-style.js). Until that is fixed, this
 * standalone script is the practical way to apply
 * 004_backfill_vehicle_status.js against a real database.
 *
 * Safe & idempotent: only touches documents missing `status`, and writes a
 * timestamped backup before making any changes. Requires network access to
 * MONGO_URI (mongodb+srv://) — run this from an environment that can resolve
 * that connection, e.g. your own machine, not necessarily a sandboxed CI.
 *
 * NOTE: this is a data-hygiene follow-up, not required to fix the P0 — the
 * query-level fix in utils/apiQuery.js (publishedVehicleStatusFilter) already
 * makes every read tolerate a missing status field.
 *
 * Usage: node scripts/backfill-vehicle-status.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Vehicle = require('../models/Vehicle');

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  console.log('=== P0 fix follow-up: vehicle status backfill ===');

  const backupDir = path.join(__dirname, '../data');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (!MONGO_URI) {
    console.log('No MONGO_URI configured — nothing to backfill (local file DB seed is already backfilled).');
    return;
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const all = await Vehicle.find().lean();
    const backupPath = path.join(backupDir, `backup_vehicles_before_status_${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(all, null, 2));
    console.log(`Backup written to ${backupPath} (${all.length} documents).`);

    const missing = all.filter(v => v.status === undefined || v.status === null);
    console.log(`${missing.length} of ${all.length} vehicle document(s) are missing "status".`);

    let updated = 0;
    for (const v of missing) {
      await Vehicle.updateOne({ _id: v._id }, { $set: { status: 'Published' } });
      updated++;
    }

    console.log(`Done. Updated ${updated} vehicle(s) to status="Published".`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('MongoDB backfill failed:', err.message);
    process.exit(1);
  }
}

run();
