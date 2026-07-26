# EVCorn Enterprise EV Domain Intelligence & Smart Decision Platform Standard

> **Document Status:** Active Domain Intelligence Standard (Phase 16 Complete)  
> **Version:** 1.0.0  

---

## 1. Explainable EV Scoring Methodology (0 - 100)

The EVCorn EV Scoring Model evaluates electric vehicles deterministically based on empirical specs without AI bias:

$$\text{Overall Score} = (0.40 \times \text{ValueForMoney}) + (0.35 \times \text{RangeScore}) + (0.25 \times \text{EnergyEfficiency})$$

1. **Value for Money (40% Weight):** Calculated from claimed range relative to price Lakh ($\text{Range} / \text{PriceLakh} \times 3.5$).
2. **Range Practicality (35% Weight):** Scaled against 500 km baseline ($\text{Range} / 500 \times 100$).
3. **Energy Efficiency (25% Weight):** Distance per battery unit ($\text{Range} / \text{BatteryCapacityKWh}$).

---

## 2. Total Cost of Ownership (TCO) Calculator

Computes ownership cost over $N$ years compared to an ICE petrol vehicle:

$$\text{Total EV Cost} = \text{Price}_{\text{INR}} + \left(\frac{\text{TotalKm}}{8} \times \text{ElectricityTariff}\right) + (0.40 \times \text{TotalKm})$$

- **ICE Fuel Comparison Cost:** $\text{Price}_{\text{INR}} + \left(\frac{\text{TotalKm}}{15} \times \text{FuelPrice}\right) + (1.20 \times \text{TotalKm})$.
- **Net Estimated Savings:** $\max(0, \text{TotalICEOwnershipCost} - \text{TotalEVCost})$.

---

## 3. Real-World Usable Range Estimator

Estimates usable real-world range under Indian road conditions:

$$\text{Usable Range} = \text{Claimed Range} \times (0.85 - \text{HighwayPenalty} - \text{ACPenality})$$

- Baseline degradation factor: `0.85` (15% MIDC/ARAI variance).
- Driving mode: Highway (`-0.10`), City (`+0.05`).
- AC Overhead: AC On (`-0.08` / 8% penalty).

---

## 4. Enhanced Charging Duration & Cost Model

$$\text{kWh Needed} = \text{BatteryCapacityKWh} \times \left(\frac{\text{TargetSoC\%} - \text{CurrentSoC\%}}{100}\right)$$
$$\text{Charging Cost INR} = \text{kWh Needed} \times \text{ElectricityTariff}$$
$$\text{Duration Hours} = \frac{\text{kWh Needed}}{\min(\text{ChargerKW}, \text{VehicleMaxDCKW})}$$

---

## 5. Charging Connector Compatibility Protocol

Verifies physical and electrical compatibility:
- **`COMPATIBLE`:** Vehicle connector matches charger plug (e.g. `CCS2` $\leftrightarrow$ `CCS2`). Effective charging rate automatically caps at $\min(\text{ChargerKW}, \text{VehicleMaxDCKW})$.
- **`INCOMPATIBLE`:** Mismatched connectors requiring an adapter.

---

## 6. Smart Vehicle Recommendation Scoring

Ranks vehicles against user lifestyle priorities:
- **Budget Priority:** +20 pts if vehicle price $\le$ max budget.
- **Range Priority:** +20 pts if vehicle range $\ge$ target range.
- **City Commute Priority:** +15 pts for compact EVs under ₹15 Lakh.
- **Highway Travel Priority:** +15 pts for long-range EVs exceeding 400 km.
