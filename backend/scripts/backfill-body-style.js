/**
 * Root-Cause Cluster E — Standalone Backfill Runner
 *
 * The existing migrations/ system (scripts/run-migrations.js) does not
 * actually execute migration up() functions — it only logs them. Until that
 * is fixed, this standalone script is the practical way to apply
 * 003_backfill_vehicle_body_style.js against a real database.
 *
 * Safe & idempotent: only touches documents missing bodyStyle, and writes a
 * timestamped backup before making any changes. Requires network access to
 * MONGO_URI (mongodb+srv://) — run this from an environment that can resolve
 * that connection, e.g. your own machine, not necessarily this sandbox.
 *
 * Usage: node scripts/backfill-body-style.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Vehicle = require('../models/Vehicle');
const { resolveBodyStyle } = require('../migrations/003_backfill_vehicle_body_style');

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  console.log('=== Root-Cause Cluster E: bodyStyle backfill ===');

  const backupDir = path.join(__dirname, '../data');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('Connected to MongoDB.');

      const all = await Vehicle.find().lean();
      const backupPath = path.join(backupDir, `backup_vehicles_before_bodystyle_${timestamp}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(all, null, 2));
      console.log(`Backup written to ${backupPath} (${all.length} documents).`);

      let matched = 0;
      const unmatched = [];
      for (const v of all) {
        if (v.bodyStyle) continue; // already set, idempotent skip
        const bodyStyle = resolveBodyStyle(v.name);
        if (bodyStyle) {
          await Vehicle.updateOne({ _id: v._id }, { $set: { bodyStyle } });
          matched++;
        } else {
          unmatched.push({ id: v.id, name: v.name });
        }
      }

      console.log(`Done. Updated ${matched} vehicle(s).`);
      if (unmatched.length > 0) {
        console.log(`${unmatched.length} vehicle(s) could not be classified automatically and were left as null:`);
        unmatched.forEach(u => console.log('  -', u.id, '|', u.name));
        console.log('Review these manually via the admin panel — do not guess blindly, this may include test/placeholder data.');
      }

      await mongoose.disconnect();
    } catch (err) {
      console.error('MongoDB backfill failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('No MONGO_URI configured — nothing to backfill (local file DB seed is already backfilled).');
  }
}

run();
