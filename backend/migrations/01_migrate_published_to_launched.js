require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Vehicle = require('../models/Vehicle');

async function migrate() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGO_URI is missing. Please provide the production MONGO_URI.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Pre-migration counts
    const prePublished = await Vehicle.countDocuments({ status: 'Published' });
    const preMissing = await Vehicle.countDocuments({ status: { $exists: false } });
    const preLaunched = await Vehicle.countDocuments({ status: 'Launched' });
    const preUpcoming = await Vehicle.countDocuments({ status: 'Upcoming' });

    console.log(`\n--- PRE-MIGRATION COUNTS ---`);
    console.log(`Published: ${prePublished}`);
    console.log(`Missing Status: ${preMissing}`);
    console.log(`Launched: ${preLaunched}`);
    console.log(`Upcoming: ${preUpcoming}`);

    // Backup
    const backupDir = path.join(__dirname, '../data/backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    const allVehicles = await Vehicle.find({}).lean();
    const backupPath = path.join(backupDir, `vehicles_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(allVehicles, null, 2));
    console.log(`\nBacked up ${allVehicles.length} vehicles to ${backupPath}`);

    // Migrate
    console.log('\nStarting migration...');
    const result = await Vehicle.updateMany(
      { $or: [{ status: 'Published' }, { status: { $exists: false } }] },
      { $set: { status: 'Launched' } }
    );
    console.log(`Migration result: ${result.modifiedCount} documents updated.`);

    // Post-migration counts
    const postPublished = await Vehicle.countDocuments({ status: 'Published' });
    const postLaunched = await Vehicle.countDocuments({ status: 'Launched' });
    const postUpcoming = await Vehicle.countDocuments({ status: 'Upcoming' });

    console.log(`\n--- POST-MIGRATION COUNTS ---`);
    console.log(`Published: ${postPublished}`);
    console.log(`Launched: ${postLaunched}`);
    console.log(`Upcoming: ${postUpcoming}`);

    if (postPublished === 0) {
      console.log('\nSUCCESS: All Published documents successfully migrated to Launched.');
    } else {
      console.log('\nWARNING: Some Published documents still remain.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
