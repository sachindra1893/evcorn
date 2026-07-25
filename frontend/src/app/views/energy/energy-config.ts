export const EnergyConfig = {
  // Solar + EV Constants
  petrolPrice: 104.2, // INR per Litre
  petrolMileage: 14.0, // km per Litre
  evEfficiency: 7.0, // km per kWh
  solarCostPerKw: 60000, // INR
  batteryCostPerKwh: 20000, // INR

  // Home Battery Specific Constants
  bufferMargin: 1.2, // 20% safety buffer for battery capacity
  lfpPricePerKwhMin: 18000,
  lfpPricePerKwhMax: 25000,
  leadAcidPricePerKwhMin: 7000,
  leadAcidPricePerKwhMax: 10000,

  // Suitability Thresholds
  apartmentMaxKwh: 3.5,
  houseMaxKwh: 12.0,

  // Bill Optimizer Constants
  nationalAverageMonthlyKwh: 250,
  solarOffsetPercentage: 0.85,
  solarBatteryOffsetPercentage: 0.95,
  gridEmissionFactor: 0.82,

  // Subsidy Hub Constants
  subsidyTier1PerKw: 30000,
  subsidyTier2PerKw: 18000,
  maxSubsidyCap: 78000,
  commercialSubsidy: 0,
  stateOverrides: {
    // Future-ready architecture for state-specific policies.
    // Example format:
    // 'Gujarat': { bonusSubsidy: 10000, maxCapOverride: 88000 },
    // 'Delhi': { bonusSubsidy: 0, generationBasedIncentive: 2.0 }
  }
};
