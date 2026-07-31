import { AeoSpecItem, AeoVehicleLike } from '../aeo.types';
import { isUsableSpec } from '../vehicle-facts';

interface SpecDef {
  label: string;
  get: (v: AeoVehicleLike) => string | undefined;
}

const SPEC_DEFS: SpecDef[] = [
  { label: 'Price', get: (v) => pick(v.pricing?.priceText, v.price) },
  { label: 'Claimed range', get: (v) => pick(v.performance?.rangeText, v.range) },
  { label: 'Battery', get: (v) => pick(v.battery?.capacityText, v.batteryCapacity) },
  { label: 'AC charging', get: (v) => pick(v.charging?.acChargingText, v.acCharging) },
  { label: 'DC fast charging', get: (v) => pick(v.charging?.dcChargingText, v.dcCharging) },
  { label: 'Drivetrain', get: (v) => pick(v.performance?.drivetrain, v.drivetrain) },
  { label: 'Body style', get: (v) => v.bodyStyle },
  { label: 'Seating', get: (v) => v.seating },
  { label: 'Dimensions', get: (v) => v.dimensions },
  { label: 'Wheelbase', get: (v) => v.wheelbase },
  { label: 'Ground clearance', get: (v) => v.groundClearance },
  { label: 'Boot / frunk', get: (v) => v.bootFrunkSpace },
  { label: 'Safety rating', get: (v) => pick(v.safety?.safetyRatingText, v.safetyRating) },
  { label: 'ADAS', get: (v) => v.adasLevel },
  { label: 'Airbags', get: (v) => (v.airbags != null ? String(v.airbags) : undefined) },
  { label: 'Acceleration', get: (v) => v.acceleration },
  { label: 'Max power', get: (v) => pick(v.maxPower, v.bhpTorque) },
  { label: 'Status', get: (v) => v.status }
];

/**
 * Citation-ready label/value rows from a single enriched variant.
 * Omits empty / N/A values — never invents specs.
 */
export function generateSpecSummary(variant: AeoVehicleLike | null | undefined): AeoSpecItem[] {
  if (!variant) return [];
  const rows: AeoSpecItem[] = [];
  for (const def of SPEC_DEFS) {
    const value = def.get(variant);
    if (!isUsableSpec(value)) continue;
    rows.push({ label: def.label, value: String(value).trim() });
  }
  return rows;
}

function pick(...values: Array<string | undefined>): string | undefined {
  for (const v of values) {
    if (isUsableSpec(v)) return String(v).trim();
  }
  return undefined;
}
