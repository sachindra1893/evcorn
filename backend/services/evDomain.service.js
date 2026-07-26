/**
 * EV Domain Intelligence Business Logic Engine
 * Provides deterministic, explainable calculations for scoring, TCO, range, charging, and recommendations.
 */
class EVDomainService {
  /**
   * Explainable EV Scoring Model (0 - 100)
   */
  calculateEVScore(vehicleSpec) {
    const batteryCapacity = parseFloat(vehicleSpec.batteryCapacity) || 40;
    const range = parseFloat(vehicleSpec.range) || 300;
    const priceLakh = parseFloat(vehicleSpec.priceLakh) || 15;

    // 1. Value for Money (Range per Lakh)
    const rangePerLakh = range / Math.max(priceLakh, 1);
    const valueForMoneyScore = Math.min(Math.round(rangePerLakh * 3.5), 100);

    // 2. Practicality & Range Score
    const rangeScore = Math.min(Math.round((range / 500) * 100), 100);

    // 3. Efficiency Score (km per kWh)
    const efficiency = range / Math.max(batteryCapacity, 1);
    const efficiencyScore = Math.min(Math.round((efficiency / 10) * 100), 100);

    // 4. Overall Weighted Composite Score
    const overallScore = Math.round(
      valueForMoneyScore * 0.40 +
      rangeScore * 0.35 +
      efficiencyScore * 0.25
    );

    return {
      overallScore,
      categoryScores: {
        valueForMoney: valueForMoneyScore,
        rangePracticality: rangeScore,
        energyEfficiency: efficiencyScore,
        cityDriving: Math.min(rangeScore + 10, 100),
        highwayDriving: Math.max(rangeScore - 15, 40)
      },
      explanation: `Overall score of ${overallScore}/100 driven by high range efficiency (${efficiency.toFixed(1)} km/kWh) and ₹${priceLakh} Lakh price positioning.`
    };
  }

  /**
   * Total Cost of Ownership (TCO) Calculator
   */
  calculateTCO({ priceLakh = 15, annualKm = 12000, ownershipYears = 5, electricityTariff = 8, iceFuelPrice = 100, iceMileage = 15 }) {
    const priceINR = priceLakh * 100000;
    const totalKm = annualKm * ownershipYears;

    // EV Running Costs (assuming 8 km/kWh efficiency)
    const totalKWh = totalKm / 8;
    const evElectricityCost = Math.round(totalKWh * electricityTariff);
    const evMaintenanceCost = Math.round(totalKm * 0.4); // ₹0.4 per km for EV service
    const totalEVOwnershipCost = Math.round(priceINR + evElectricityCost + evMaintenanceCost);

    // Equivalent ICE Running Costs (for comparison savings)
    const totalIceFuelLiters = totalKm / iceMileage;
    const iceFuelCost = Math.round(totalIceFuelLiters * iceFuelPrice);
    const iceMaintenanceCost = Math.round(totalKm * 1.2); // ₹1.2 per km for ICE service
    const totalICEOwnershipCost = Math.round(priceINR + iceFuelCost + iceMaintenanceCost);

    const netSavings = Math.max(totalICEOwnershipCost - totalEVOwnershipCost, 0);

    return {
      ownershipYears,
      totalDistanceKm: totalKm,
      evRunningCostINR: evElectricityCost,
      evMaintenanceCostINR: evMaintenanceCost,
      totalEVCostINR: totalEVOwnershipCost,
      costPerKmEV: parseFloat(((evElectricityCost + evMaintenanceCost) / totalKm).toFixed(2)),
      estimatedIceSavingsINR: netSavings
    };
  }

  /**
   * Real-World Range Estimator
   */
  estimateRealWorldRange({ claimedRange = 312, batteryCapacity = 30, drivingMode = 'mixed', acOn = true }) {
    let factor = 0.85; // Baseline real-world degradation vs MIDC / ARAI

    if (drivingMode === 'highway') factor -= 0.10;
    if (drivingMode === 'city') factor += 0.05;
    if (acOn) factor -= 0.08;

    const estimatedRangeKm = Math.round(claimedRange * factor);

    return {
      claimedRangeKm: claimedRange,
      estimatedRealRangeKm: estimatedRangeKm,
      drivingMode,
      acImpact: acOn ? '-8% AC Overhead' : 'No AC Overhead',
      confidenceLevel: 'High (Based on Indian driving profiles)'
    };
  }

  /**
   * Enhanced Charging Cost & Duration Calculator
   */
  calculateChargingCost({ batteryCapacityKWh = 40, currentSocPct = 10, targetSocPct = 80, electricityTariff = 8, chargerKW = 50 }) {
    const socDifference = Math.max(targetSocPct - currentSocPct, 0);
    const kWhNeeded = (batteryCapacityKWh * socDifference) / 100;
    const totalCostINR = Math.round(kWhNeeded * electricityTariff);

    // Duration in hours & minutes
    const hoursDecimal = kWhNeeded / Math.max(chargerKW, 1);
    const hours = Math.floor(hoursDecimal);
    const minutes = Math.round((hoursDecimal - hours) * 60);

    return {
      kWhNeeded: parseFloat(kWhNeeded.toFixed(1)),
      totalCostINR,
      chargingDurationFormatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes} mins`,
      chargerSpeedKW: chargerKW
    };
  }

  /**
   * Charging Compatibility Checker
   */
  checkCompatibility({ vehicleConnector = 'CCS2', chargerConnector = 'CCS2', chargerKW = 50, vehicleMaxDCKW = 50 }) {
    const isCompatible = vehicleConnector.toUpperCase() === chargerConnector.toUpperCase();
    const effectiveSpeedKW = Math.min(chargerKW, vehicleMaxDCKW);

    return {
      isCompatible,
      status: isCompatible ? 'COMPATIBLE' : 'INCOMPATIBLE',
      effectiveSpeedKW,
      explanation: isCompatible 
        ? `Fully compatible. Charging rate will automatically cap at vehicle max of ${effectiveSpeedKW} kW.`
        : `Mismatched connectors (${vehicleConnector} vehicle vs ${chargerConnector} plug). Requires adapter.`
    };
  }

  /**
   * Smart Vehicle Recommendation Engine
   */
  getSmartRecommendations({ budgetMaxLakh = 20, priority = 'city_commute', minRangeKm = 250, vehicles = [] }) {
    const scored = vehicles.map(v => {
      let score = 50;
      const reasons = [];

      const price = parseFloat(v.priceLakh || v.price) || 15;
      const range = parseFloat(v.range) || 300;

      if (price <= budgetMaxLakh) {
        score += 20;
        reasons.push(`Fits within ₹${budgetMaxLakh} Lakh budget`);
      }
      if (range >= minRangeKm) {
        score += 20;
        reasons.push(`Delivers requested range (${range} km vs ${minRangeKm} km min)`);
      }

      if (priority === 'city_commute' && price <= 15) {
        score += 15;
        reasons.push('Compact & economical for daily city traffic');
      } else if (priority === 'highway_travel' && range >= 400) {
        score += 15;
        reasons.push('High battery capacity suitable for long-distance highway travel');
      }

      return {
        vehicle: v,
        recommendationScore: score,
        reasons
      };
    });

    return scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }
}

module.exports = new EVDomainService();
