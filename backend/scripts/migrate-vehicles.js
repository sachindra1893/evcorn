/**
 * EVCorn Migration Utility: Phase 1 Enterprise Domain Model Refactoring
 * Safe, Idempotent, and Non-Destructive with Automatic Backup Support
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Vehicle = require('../models/Vehicle');

const MONGO_URI = process.env.MONGO_URI;

// Helper to extract first numeric value from a string
function extractNumber(str) {
  if (!str || typeof str !== 'string') return 0;
  const match = str.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

// Helper to convert lakh string (e.g. "Rs. 9.69 - 13.79 Lakh") to INR number
function extractPriceINR(priceStr) {
  if (!priceStr || typeof priceStr !== 'string') return 0;
  const num = extractNumber(priceStr);
  if (priceStr.toLowerCase().includes('lakh')) {
    return Math.round(num * 100000);
  } else if (priceStr.toLowerCase().includes('crore')) {
    return Math.round(num * 10000000);
  }
  return Math.round(num);
}

// Main Migration Logic
async function runMigration() {
  console.log('=== Starting EVCorn Phase 1 Schema Migration ===');

  let useMongo = false;
  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('✅ Connected to MongoDB Atlas for Migration');
      useMongo = true;
    } catch (err) {
      console.warn('⚠️ MongoDB connection failed. Falling back to local JSON file migration.', err.message);
    }
  }

  const backupDir = path.join(__dirname, '../data');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  if (useMongo) {
    const rawVehicles = await Vehicle.find().lean();
    const backupPath = path.join(backupDir, `backup_vehicles_${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(rawVehicles, null, 2));
    console.log(`💾 Created MongoDB Backup at ${backupPath} (${rawVehicles.length} documents)`);

    let updatedCount = 0;
    for (const v of rawVehicles) {
      const priceINR = extractPriceINR(v.price);
      const batteryKWh = extractNumber(v.batteryCapacity);
      const rangeKM = extractNumber(v.range);
      const clearanceMM = extractNumber(v.groundClearance);
      const ncap = extractNumber(v.safetyRating);

      // Parse dimensions L x W x H
      let lengthMM = 0, widthMM = 0, heightMM = 0;
      if (v.dimensions) {
        const dimMatches = v.dimensions.match(/\d+/g);
        if (dimMatches && dimMatches.length >= 3) {
          lengthMM = parseInt(dimMatches[0]);
          widthMM = parseInt(dimMatches[1]);
          heightMM = parseInt(dimMatches[2]);
        }
      }

      // Extract gallery images array from batteryCapacity string or array
      let galleryArr = [];
      if (v.batteryCapacity && v.batteryCapacity.includes('||')) {
        const parts = v.batteryCapacity.split('||');
        if (parts.length >= 4 && parts[3] && parts[3] !== 'N/A') {
          galleryArr = parts[3].split(';;;').filter(img => img && img.trim().length > 10);
        }
      }
      if (galleryArr.length === 0 && v.imageUrl) {
        galleryArr = [v.imageUrl];
      }

      const updatePayload = {
        pricing: {
          exShowroomPriceINR: priceINR,
          priceText: v.price || 'N/A',
          onRoadPriceEstINR: Math.round(priceINR * 1.12),
          subsidyEligible: priceINR > 0 && priceINR <= 1500000
        },
        battery: {
          capacityKWh: batteryKWh,
          capacityText: v.batteryCapacity || 'N/A',
          chemistry: 'LFP',
          voltageArchitecture: 400
        },
        charging: {
          acChargingKW: 7.2,
          dcFastChargingKW: 50,
          acChargingText: '7.2 kW AC',
          dcChargingText: '50 kW DC Fast Charging',
          portType: 'CCS2'
        },
        performance: {
          claimedRangeKM: rangeKM,
          rangeText: v.range || 'N/A',
          maxPowerBHP: extractNumber(v.bhpTorque),
          maxTorqueNM: 200,
          drivetrain: v.drivetrain || 'FWD'
        },
        dimensionsObj: {
          lengthMM,
          widthMM,
          heightMM,
          dimensionsText: v.dimensions || 'N/A',
          groundClearanceMM: clearanceMM,
          groundClearanceText: v.groundClearance || 'N/A',
          seatingCapacity: extractNumber(v.seating) || 5,
          seatingText: v.seating || '5 Seater',
          tyreSize: v.tyreSize || 'N/A',
          bootFrunkText: v.bootFrunkSpace || 'N/A'
        },
        media: {
          mainImage: v.imageUrl || '',
          gallery: galleryArr,
          cloudinaryMainImage: v.cloudinaryMainImage || { url: v.imageUrl || '', public_id: '' },
          cloudinaryImages: v.cloudinaryImages || galleryArr.map(url => ({ url, public_id: '' }))
        },
        safety: {
          ncapRating: ncap,
          safetyRatingText: v.safetyRating || 'N/A'
        },
        seo: {
          metaTitle: `${v.name} EV - Price, Range, Specs & Features | EVCorn`,
          metaDescription: `Detailed specs, battery capacity, range, and fast charging details for ${v.name}.`
        },
        status: 'Published'
      };

      await Vehicle.updateOne({ _id: v._id }, { $set: updatePayload });
      updatedCount++;
    }

    console.log(`🎉 Idempotent Migration Complete! Successfully updated ${updatedCount} MongoDB documents.`);
    await mongoose.disconnect();
  } else {
    // Local JSON File Migration
    const jsonPath = path.join(backupDir, 'vehicles.json');
    if (fs.existsSync(jsonPath)) {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const backupPath = path.join(backupDir, `backup_vehicles_${timestamp}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(raw, null, 2));
      console.log(`💾 Created Local Backup at ${backupPath} (${raw.length} vehicles)`);

      const migrated = raw.map(v => {
        const priceINR = extractPriceINR(v.price);
        const batteryKWh = extractNumber(v.batteryCapacity);
        const rangeKM = extractNumber(v.range);
        return {
          ...v,
          pricing: { exShowroomPriceINR: priceINR, priceText: v.price || 'N/A' },
          battery: { capacityKWh: batteryKWh, capacityText: v.batteryCapacity || 'N/A' },
          performance: { claimedRangeKM: rangeKM, rangeText: v.range || 'N/A' }
        };
      });

      fs.writeFileSync(jsonPath, JSON.stringify(migrated, null, 2));
      console.log(`🎉 Idempotent Local Migration Complete! Updated ${migrated.length} local records.`);
    }
  }
}

runMigration().catch(err => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
