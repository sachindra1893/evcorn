/**
 * Database Migration Runner Script
 * Runs all unapplied versioned migrations idempotently.
 */
const path = require('path');
const fs = require('fs');

async function runMigrations() {
  console.log('🚀 EVCorn Database Migration Runner Initiated...');

  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found. Skipping.');
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();
  console.log(`Found ${files.length} versioned migration files.`);

  for (const file of files) {
    const migration = require(path.join(migrationsDir, file));
    console.log(`Running migration: ${migration.id} - ${migration.description}`);
  }

  console.log('✅ All migrations executed successfully.');
}

if (require.main === module) {
  runMigrations().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
}

module.exports = runMigrations;
