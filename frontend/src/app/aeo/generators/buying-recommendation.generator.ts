import { AeoVehicleLike, VehicleOverviewFacts } from '../aeo.types';
import { isUsableSpec } from '../vehicle-facts';

/**
 * Deterministic buying recommendation from status + price/range/bodyStyle.
 * Aligned with DOMAIN_INTELLIGENCE inputs — never invents missing specs.
 */
export function generateBuyingRecommendation(
  brandName: string,
  modelName: string,
  selected: AeoVehicleLike | null | undefined,
  facts?: VehicleOverviewFacts
): string | undefined {
  const brand = (brandName || '').trim();
  const model = (modelName || '').trim();
  if (!brand || !model || !selected) return undefined;

  const status = (selected.status || 'Launched').trim();
  if (/upcoming/i.test(status)) {
    return `The ${brand} ${model} is upcoming — use published specs as guidance and confirm final price, range, and charging before booking.`;
  }

  const priceLakh = parsePriceLakh(selected);
  const rangeKm = parseRangeKm(selected, facts);
  const body = isUsableSpec(selected.bodyStyle) ? String(selected.bodyStyle).trim() : undefined;

  const audience: string[] = [];
  if (priceLakh !== null && priceLakh <= 15 && rangeKm !== null && rangeKm >= 250) {
    audience.push('value-focused city and suburban buyers');
  } else if (rangeKm !== null && rangeKm >= 400) {
    audience.push('highway-capable EV shoppers who want longer claimed range');
  } else if (priceLakh !== null && priceLakh <= 20) {
    audience.push('buyers comparing mid-priced EVs in India');
  }

  if (body && /suv|crossover/i.test(body)) {
    audience.push('buyers who prefer an SUV / crossover stance');
  } else if (body && /hatch|sedan/i.test(body)) {
    audience.push(`shoppers looking at a ${body.toLowerCase()} EV`);
  }

  const factsBits: string[] = [];
  if (facts && isUsableSpec(facts.priceRange) && facts.priceRange !== 'TBA') {
    factsBits.push(`priced from ${facts.priceRange}`);
  }
  if (facts && isUsableSpec(facts.claimedRange)) {
    factsBits.push(`claimed range ${facts.claimedRange}`);
  }
  if (facts && isUsableSpec(facts.charging)) {
    factsBits.push(`DC charging ${facts.charging}`);
  }

  // Omit when we lack real published facts / audience signals — never invent a rec.
  if (audience.length === 0 && factsBits.length === 0) {
    return undefined;
  }

  const who = audience.length ? `Best suited for ${uniqueJoin(audience)}` : 'Worth shortlisting';
  const factsClause = factsBits.length ? ` Key published figures: ${factsBits.join('; ')}.` : '';
  return `${who}.${factsClause} Compare the ${brand} ${model} against peers before you buy.`;
}

function uniqueJoin(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  if (out.length === 1) return out[0];
  if (out.length === 2) return `${out[0]} and ${out[1]}`;
  return `${out.slice(0, -1).join(', ')}, and ${out[out.length - 1]}`;
}

function parsePriceLakh(v: AeoVehicleLike): number | null {
  const inr = v.pricing?.exShowroomPriceINR;
  if (typeof inr === 'number' && inr > 0) return inr / 100000;
  const raw = v.pricing?.priceText || v.price;
  if (!isUsableSpec(raw)) return null;
  const text = String(raw).toLowerCase();
  const lakh = text.match(/([\d.]+)\s*lakh/);
  if (lakh) return parseFloat(lakh[1]);
  const crore = text.match(/([\d.]+)\s*crore/);
  if (crore) return parseFloat(crore[1]) * 100;
  const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return null;
  // Heuristic: bare rupee amounts vs already-in-lakh display strings
  return num > 1000 ? num / 100000 : num;
}

function parseRangeKm(v: AeoVehicleLike, facts?: VehicleOverviewFacts): number | null {
  const claimed = v.performance?.claimedRangeKM;
  if (typeof claimed === 'number' && claimed > 0) return claimed;
  const raw = v.performance?.rangeText || v.range || facts?.claimedRange;
  if (!isUsableSpec(raw)) return null;
  const match = String(raw).match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}
