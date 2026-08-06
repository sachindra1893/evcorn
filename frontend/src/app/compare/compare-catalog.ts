/**
 * Configurable comparison catalog — fields → categories → order.
 * Add or reorder specs here without redesigning the Compare UI.
 * Categories auto-render from this catalog.
 */

import { formatCardBattery, formatCardRange } from '../utils/vehicle-card-formatter';

export type CompareValue = string | number | boolean | null | undefined;

export interface CompareFieldSource {
  /** Prefer nested object path, e.g. ['battery', 'capacityText'] */
  nested?: readonly [string, string];
  /** Flat CarSpec key fallbacks tried in order */
  flat?: readonly string[];
  /** Optional custom extractor (runs before nested/flat) */
  extract?: (vehicle: Record<string, unknown>) => CompareValue;
}

export interface CompareFieldDef {
  id: string;
  label: string;
  source: CompareFieldSource;
  /**
   * When true, row is omitted if every compared vehicle lacks a value.
   * Keeps low-value / rarely-populated specs from cluttering MVP.
   */
  hideWhenAllMissing?: boolean;
}

export interface CompareCategoryDef {
  id: string;
  label: string;
  order: number;
  fields: CompareFieldDef[];
}

function nestedGet(vehicle: Record<string, unknown>, path: readonly [string, string]): CompareValue {
  const parent = vehicle[path[0]];
  if (!parent || typeof parent !== 'object') return undefined;
  return (parent as Record<string, unknown>)[path[1]] as CompareValue;
}

function parseDimensionPart(dimensions: string | undefined, part: 'length' | 'width' | 'height'): string | undefined {
  if (!dimensions || typeof dimensions !== 'string') return undefined;
  const patterns: Record<'length' | 'width' | 'height', RegExp> = {
    length: /(\d+)\s*mm\s*L/i,
    width: /(\d+)\s*mm\s*W/i,
    height: /(\d+)\s*mm\s*H/i
  };
  const match = dimensions.match(patterns[part]);
  return match ? `${match[1]} mm` : undefined;
}

/**
 * Production MVP catalog — buying-decision specs only.
 * New fields: append to a category (or add a category). UI auto-renders.
 */
export const COMPARE_CATALOG: CompareCategoryDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    order: 0,
    fields: [
      {
        id: 'price',
        label: 'Ex-Showroom Price',
        source: {
          nested: ['pricing', 'priceText'],
          flat: ['price']
        }
      }
    ]
  },
  {
    id: 'battery-charging',
    label: 'Battery & Charging',
    order: 1,
    fields: [
      {
        id: 'battery',
        label: 'Battery',
        source: {
          nested: ['battery', 'capacityText'],
          flat: ['batteryCapacity'],
          extract: (v) => {
            const raw = (nestedGet(v, ['battery', 'capacityText']) || v['batteryCapacity']) as string;
            return formatCardBattery(raw);
          }
        }
      },
      {
        id: 'range',
        label: 'Claimed Range',
        source: {
          nested: ['performance', 'rangeText'],
          flat: ['range'],
          extract: (v) => {
            const raw = (nestedGet(v, ['performance', 'rangeText']) || v['range']) as string;
            return formatCardRange(raw);
          }
        }
      },
      {
        id: 'ac-charging',
        label: 'AC Charging',
        source: {
          nested: ['charging', 'acChargingText'],
          flat: ['acCharging'],
          extract: (v) => {
            const nested = nestedGet(v, ['charging', 'acChargingKW']);
            if (typeof nested === 'number' && nested > 0) return `${nested} kW`;
            return undefined;
          }
        }
      },
      {
        id: 'dc-charging',
        label: 'DC Fast Charging',
        source: {
          nested: ['charging', 'dcChargingText'],
          flat: ['dcCharging'],
          extract: (v) => {
            const nested = nestedGet(v, ['charging', 'dcFastChargingKW']);
            if (typeof nested === 'number' && nested > 0) return `${nested} kW`;
            return undefined;
          }
        }
      }
    ]
  },
  {
    id: 'performance',
    label: 'Performance',
    order: 2,
    fields: [
      {
        id: 'power',
        label: 'Power',
        source: {
          nested: ['performance', 'maxPowerBHP'],
          flat: ['maxPower'],
          extract: (v) => {
            const bhp = nestedGet(v, ['performance', 'maxPowerBHP']);
            if (typeof bhp === 'number' && bhp > 0) return `${bhp} bhp`;
            return undefined;
          }
        }
      },
      {
        id: 'torque',
        label: 'Torque',
        source: {
          nested: ['performance', 'maxTorqueNM'],
          flat: ['torque'],
          extract: (v) => {
            const nm = nestedGet(v, ['performance', 'maxTorqueNM']);
            if (typeof nm === 'number' && nm > 0) return `${nm} Nm`;
            return undefined;
          }
        }
      },
      {
        id: 'acceleration',
        label: 'Acceleration (0–100)',
        source: {
          nested: ['performance', 'acceleration0to100Sec'],
          flat: ['acceleration'],
          extract: (v) => {
            const sec = nestedGet(v, ['performance', 'acceleration0to100Sec']);
            if (typeof sec === 'number' && sec > 0) return `${sec} s`;
            return undefined;
          }
        }
      },
      {
        id: 'drivetrain',
        label: 'Drivetrain',
        source: {
          nested: ['performance', 'drivetrain'],
          flat: ['drivetrain']
        }
      }
    ]
  },
  {
    id: 'safety',
    label: 'Safety',
    order: 3,
    fields: [
      {
        id: 'airbags',
        label: 'Airbags',
        source: {
          nested: ['safety', 'airbagsCount'],
          flat: ['airbags'],
          extract: (v) => {
            const count = nestedGet(v, ['safety', 'airbagsCount']);
            if (typeof count === 'number' && count > 0) return String(count);
            return undefined;
          }
        }
      },
      {
        id: 'adas',
        label: 'ADAS',
        source: {
          nested: ['safety', 'hasADAS'],
          flat: ['adasLevel'],
          extract: (v) => {
            const has = nestedGet(v, ['safety', 'hasADAS']);
            if (typeof has === 'boolean') return has ? 'Yes' : 'No';
            return undefined;
          }
        }
      },
      {
        id: 'esc',
        label: 'ESC',
        source: {
          flat: ['esc', 'electronicStabilityControl'],
          extract: (v) => (v['esc'] as CompareValue) ?? (v['electronicStabilityControl'] as CompareValue)
        },
        hideWhenAllMissing: true
      },
      {
        id: 'ncap',
        label: 'NCAP Rating',
        source: {
          nested: ['safety', 'safetyRatingText'],
          flat: ['safetyRating'],
          extract: (v) => {
            const rating = nestedGet(v, ['safety', 'ncapRating']);
            const body = nestedGet(v, ['safety', 'ncapTestingBody']);
            if (typeof rating === 'number' && rating > 0) {
              return body ? `${rating} Star (${body})` : `${rating} Star`;
            }
            return undefined;
          }
        }
      }
    ]
  },
  {
    id: 'dimensions',
    label: 'Dimensions',
    order: 4,
    fields: [
      {
        id: 'boot',
        label: 'Boot Space',
        source: {
          nested: ['dimensionsObj', 'bootFrunkText'],
          flat: ['bootFrunkSpace'],
          extract: (v) => {
            const liters = nestedGet(v, ['dimensionsObj', 'bootSpaceLiters']);
            if (typeof liters === 'number' && liters > 0) return `${liters} L`;
            const dims = v['dimensions'] as Record<string, unknown> | undefined;
            if (dims && typeof dims['bootSpaceLiters'] === 'number' && (dims['bootSpaceLiters'] as number) > 0) {
              return `${dims['bootSpaceLiters']} L`;
            }
            return undefined;
          }
        }
      },
      {
        id: 'ground-clearance',
        label: 'Ground Clearance',
        source: {
          nested: ['dimensionsObj', 'groundClearanceText'],
          flat: ['groundClearance'],
          extract: (v) => {
            const mm = nestedGet(v, ['dimensionsObj', 'groundClearanceMM']);
            if (typeof mm === 'number' && mm > 0) return `${mm} mm`;
            return undefined;
          }
        }
      },
      {
        id: 'wheelbase',
        label: 'Wheelbase',
        source: {
          nested: ['dimensionsObj', 'wheelbaseMM'],
          flat: ['wheelbase'],
          extract: (v) => {
            const mm = nestedGet(v, ['dimensionsObj', 'wheelbaseMM']);
            if (typeof mm === 'number' && mm > 0) return `${mm} mm`;
            return undefined;
          }
        }
      },
      {
        id: 'length',
        label: 'Length',
        source: {
          nested: ['dimensionsObj', 'lengthMM'],
          extract: (v) => {
            const mm = nestedGet(v, ['dimensionsObj', 'lengthMM']);
            if (typeof mm === 'number' && mm > 0) return `${mm} mm`;
            return parseDimensionPart(v['dimensions'] as string | undefined, 'length');
          }
        }
      },
      {
        id: 'width',
        label: 'Width',
        source: {
          nested: ['dimensionsObj', 'widthMM'],
          extract: (v) => {
            const mm = nestedGet(v, ['dimensionsObj', 'widthMM']);
            if (typeof mm === 'number' && mm > 0) return `${mm} mm`;
            return parseDimensionPart(v['dimensions'] as string | undefined, 'width');
          }
        }
      }
    ]
  },
  {
    id: 'interior',
    label: 'Interior',
    order: 5,
    fields: [
      {
        id: 'screen',
        label: 'Screen',
        source: { flat: ['screen'] },
        hideWhenAllMissing: true
      },
      {
        id: 'sunroof',
        label: 'Sunroof',
        source: { flat: ['sunroof'] },
        hideWhenAllMissing: true
      },
      {
        id: 'ventilated-seats',
        label: 'Ventilated Seats',
        source: { flat: ['ventilatedSeats'] },
        hideWhenAllMissing: true
      },
      {
        id: 'camera-360',
        label: '360° Camera',
        source: { flat: ['camera360', 'has360Camera'] },
        hideWhenAllMissing: true
      }
    ]
  },
  {
    id: 'warranty',
    label: 'Warranty',
    order: 6,
    fields: [
      {
        id: 'vehicle-warranty',
        label: 'Vehicle Warranty',
        source: {
          flat: ['vehicleWarranty', 'warranty'],
          nested: ['warranty', 'vehicleText']
        },
        hideWhenAllMissing: true
      },
      {
        id: 'battery-warranty',
        label: 'Battery Warranty',
        source: {
          flat: ['batteryWarranty'],
          nested: ['warranty', 'batteryText']
        },
        hideWhenAllMissing: true
      }
    ]
  }
];

export function getOrderedCategories(catalog: CompareCategoryDef[] = COMPARE_CATALOG): CompareCategoryDef[] {
  return [...catalog].sort((a, b) => a.order - b.order);
}

export function resolveFieldValue(
  vehicle: Record<string, unknown> | null | undefined,
  field: CompareFieldDef
): CompareValue {
  if (!vehicle) return undefined;

  const { source } = field;
  // Prefer nested text / structured fields, then flat legacy strings, then extractors.
  if (source.nested) {
    const nested = nestedGet(vehicle, source.nested);
    if (isPresent(nested)) {
      // Numeric nested values may need units — let extract refine when present.
      if (typeof nested === 'number' && source.extract) {
        const extracted = source.extract(vehicle);
        if (isPresent(extracted)) return extracted;
      }
      return nested;
    }
  }
  if (source.flat) {
    for (const key of source.flat) {
      const val = vehicle[key];
      if (isPresent(val as CompareValue)) return val as CompareValue;
    }
  }
  if (source.extract) {
    const extracted = source.extract(vehicle);
    if (isPresent(extracted)) return extracted;
  }
  return undefined;
}

export function isPresent(value: CompareValue): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (lower === 'n/a' || lower === 'na' || lower === '-' || lower === '—') return false;
  }
  return true;
}
