/**
 * Migration 003: Backfill Vehicle bodyStyle
 *
 * Root-Cause Cluster E fix. `bodyStyle` was referenced by the frontend's
 * Browse EV category chips (SUV/Hatchback/Sedan/MPV/Sports) and by
 * vehicle.service.js's LIGHT_PROJECTION, but was never defined on the
 * Vehicle schema — so every existing document is missing it, and every
 * chip filter matches zero vehicles. This backfills real documents using
 * a name-based mapping built from the actual production catalog.
 *
 * Matching is done against `name` (format "ParentModel::VariantName") since
 * `parentModel` is empty on production documents. Order matters: more
 * specific patterns (e.g. "sealion") must be checked before substrings they
 * contain (e.g. "seal").
 */
const BODY_STYLE_RULES = [
  { pattern: /sealion/i, bodyStyle: 'SUV' },      // BYD Sealion 7
  { pattern: /\bseal\b/i, bodyStyle: 'Sedan' },   // BYD Seal
  { pattern: /atto\s*3/i, bodyStyle: 'SUV' },     // BYD Atto 3
  { pattern: /curvv/i, bodyStyle: 'SUV' },        // Tata Curvv.ev (coupe-SUV)
  { pattern: /cyberster/i, bodyStyle: 'Sports' }, // MG Cyberster
  { pattern: /\bm9\b/i, bodyStyle: 'MPV' },       // MG M9
  { pattern: /punch/i, bodyStyle: 'SUV' },        // Tata Punch.ev
  { pattern: /sierra/i, bodyStyle: 'SUV' },       // Tata Sierra.ev
  { pattern: /syros/i, bodyStyle: 'SUV' },        // Kia Syros EV
  // Legacy/local seed models
  { pattern: /nexon/i, bodyStyle: 'SUV' },
  { pattern: /tiago/i, bodyStyle: 'Hatchback' },
  { pattern: /windsor/i, bodyStyle: 'SUV' },
  { pattern: /xuv\s*400/i, bodyStyle: 'SUV' },
  { pattern: /ioniq/i, bodyStyle: 'SUV' },
];

function resolveBodyStyle(name) {
  const rule = BODY_STYLE_RULES.find(r => r.pattern.test(name || ''));
  return rule ? rule.bodyStyle : null;
}

module.exports = {
  id: '003_backfill_vehicle_body_style',
  description: 'Backfill bodyStyle on existing vehicle documents so Browse EV category chips (SUV/Hatchback/Sedan/MPV/Sports) work',
  resolveBodyStyle,
  async up(db) {
    const cursor = db.collection('vehicles').find({
      $or: [{ bodyStyle: { $exists: false } }, { bodyStyle: null }]
    });
    let matched = 0;
    let unmatched = 0;
    const unmatchedNames = [];

    for await (const doc of cursor) {
      const bodyStyle = resolveBodyStyle(doc.name);
      if (bodyStyle) {
        await db.collection('vehicles').updateOne({ _id: doc._id }, { $set: { bodyStyle } });
        matched++;
      } else {
        unmatched++;
        unmatchedNames.push(doc.name);
      }
    }

    console.log(`✅ Migration 003_backfill_vehicle_body_style applied. Matched: ${matched}, Unmatched: ${unmatched}`);
    if (unmatchedNames.length > 0) {
      console.log('   Unmatched vehicle names (left as null, needs manual review):', unmatchedNames);
    }
  },
  async down(db) {
    await db.collection('vehicles').updateMany({}, { $unset: { bodyStyle: '' } });
    console.log('⏪ Migration 003_backfill_vehicle_body_style rolled back.');
  }
};
