import { AeoVehicleLike, VehicleOverviewFacts } from './aeo.types';

const MISSING = new Set(['', 'n/a', 'na', '-', '—', 'tba']);

/** True when a display string is usable for answer / SEO copy. */
export function isUsableSpec(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !MISSING.has(trimmed.toLowerCase());
}

function parseNumeric(value: string | undefined): number | null {
  if (!value || !isUsableSpec(value)) return null;
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) ? num : null;
}

/**
 * Pure extraction of model-level overview aggregates from sibling variants.
 * Same algorithm as vehicle-detail `calculateOverview` — single source for
 * Phase 7.1 SEO description facts and AEO Quick Answer / Spec Summary.
 */
export function buildVehicleOverviewFacts(variants: AeoVehicleLike[]): VehicleOverviewFacts {
  const list = variants || [];

  const sortedByPrice = [...list].sort((a, b) => {
    const pA = parseNumeric(a.price) ?? 0;
    const pB = parseNumeric(b.price) ?? 0;
    return pA - pB;
  });

  let priceRange = 'TBA';
  if (sortedByPrice.length > 1) {
    const first = sortedByPrice[0].price?.replace('₹', '').trim() || '';
    const last = sortedByPrice[sortedByPrice.length - 1].price?.replace('₹', '').trim() || '';
    if (first && last && first !== last) {
      priceRange = `₹${first} – ₹${last}`;
    } else if (first) {
      priceRange = `₹${first}`;
    }
  } else if (sortedByPrice.length === 1 && isUsableSpec(sortedByPrice[0].price)) {
    priceRange = `₹${sortedByPrice[0].price!.replace('₹', '').trim()}`;
  }

  const batteries = new Set<number>();
  list.forEach((v) => {
    const num = parseNumeric(v.batteryCapacity);
    if (num !== null) batteries.add(num);
  });
  const sortedBats = Array.from(batteries).sort((a, b) => a - b);
  const batteryOptions =
    sortedBats.length > 0 ? sortedBats.map((b) => `${b} kWh`).join(' • ') : 'N/A';

  let minRange = Infinity;
  let maxRange = 0;
  list.forEach((v) => {
    const num = parseNumeric(v.range);
    if (num !== null) {
      if (num < minRange) minRange = num;
      if (num > maxRange) maxRange = num;
    }
  });

  let claimedRange = 'N/A';
  if (minRange !== Infinity && minRange !== maxRange) {
    claimedRange = `${minRange}–${maxRange} km`;
  } else if (minRange !== Infinity) {
    claimedRange = `${minRange} km`;
  }

  const dcChargings = new Set<number>();
  list.forEach((v) => {
    const num = parseNumeric(v.dcCharging);
    if (num !== null) dcChargings.add(num);
  });
  const sortedDc = Array.from(dcChargings).sort((a, b) => a - b);
  let charging = 'N/A';
  if (sortedDc.length > 1) {
    charging = `${sortedDc[0]} – ${sortedDc[sortedDc.length - 1]} kW DC`;
  } else if (sortedDc.length === 1) {
    charging = `${sortedDc[0]} kW DC`;
  } else {
    const raw = list.find((v) => isUsableSpec(v.dcCharging));
    if (raw?.dcCharging) charging = raw.dcCharging;
  }

  return { priceRange, batteryOptions, claimedRange, charging };
}

/**
 * Meta / SEO description built from the same overview facts as Quick Answer.
 * Keeps Phase 7.1 wording ownership in one helper (no divergent hard-coded numbers).
 */
export function buildVehicleSeoDescription(
  brandName: string,
  modelName: string,
  facts: VehicleOverviewFacts
): string {
  return (
    `Discover the ${brandName} ${modelName} electric vehicle in India. ` +
    `Price from ${facts.priceRange}, batteries ${facts.batteryOptions}, ` +
    `range up to ${facts.claimedRange}, DC charging ${facts.charging}.`
  );
}
