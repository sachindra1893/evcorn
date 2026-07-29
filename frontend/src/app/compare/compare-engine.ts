import {
  COMPARE_CATALOG,
  CompareCategoryDef,
  CompareFieldDef,
  CompareValue,
  getOrderedCategories,
  isPresent,
  resolveFieldValue
} from './compare-catalog';

/** Max vehicles in Compare MVP. Raise later without UI redesign. */
export const COMPARE_MAX_VEHICLES = 2;

export const MISSING_VALUE_DISPLAY = '—';
export const NOT_AVAILABLE_DISPLAY = 'Not Available';

/** Soft cap — anything longer is almost certainly packed storage / blobs, not a buying spec. */
const MAX_COMPARE_DISPLAY_CHARS = 180;

export interface CompareRow {
  fieldId: string;
  label: string;
  values: string[];
}

export interface CompareSection {
  categoryId: string;
  label: string;
  rows: CompareRow[];
}

export type CompareSelectionResult =
  | { ok: true; ids: string[] }
  | { ok: false; reason: 'duplicate' | 'full' | 'invalid'; ids: string[] };

export interface CompareSlotHydration {
  brandId: string | null;
  modelName: string | null;
  variantId: string | null;
}

/**
 * True for base64 / data-URI blobs and other non-human storage payloads.
 */
export function isRawStoragePayload(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') return true;
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  if (/^data:image\//i.test(s)) return true;
  if (/data:image\/[a-z0-9.+-]+;base64,/i.test(s)) return true;
  if (/^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,/i.test(s)) return true;
  // Long base64-ish blobs without spaces
  if (s.length > MAX_COMPARE_DISPLAY_CHARS && /^[A-Za-z0-9+/=\s]+$/.test(s) && s.replace(/\s/g, '').length > MAX_COMPARE_DISPLAY_CHARS) {
    return true;
  }
  return false;
}

function humanizeJsonFragment(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : undefined;
  }
  if (typeof value === 'string') {
    const cleaned = sanitizeCompareDisplayValue(value);
    return typeof cleaned === 'string' && cleaned ? cleaned : undefined;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => humanizeJsonFragment(item))
      .filter((part): part is string => !!part);
    return parts.length ? parts.join(', ') : undefined;
  }
  if (typeof value === 'object') {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const formatted = humanizeJsonFragment(val);
        if (!formatted || isRawStoragePayload(formatted)) return null;
        return `${key}: ${formatted}`;
      })
      .filter((part): part is string => !!part);
    return parts.length ? parts.join(', ') : undefined;
  }
  return undefined;
}

/**
 * Strip legacy packed DB encodings (`||`, `;;;`, base64, JSON) into a single
 * human-readable compare cell. Returns undefined when nothing displayable remains.
 */
export function sanitizeCompareDisplayValue(value: CompareValue): CompareValue {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean' || typeof value === 'number') {
    return typeof value === 'number' && !Number.isFinite(value) ? undefined : value;
  }
  if (typeof value !== 'string') {
    return undefined;
  }

  let s = value.trim();
  if (!s) return undefined;

  // Packed legacy fields: battery||ac||dc||images||range||…
  if (s.includes('||')) {
    const parts = s
      .split('||')
      .map((part) => part.trim())
      .filter((part) => part && part.toLowerCase() !== 'n/a' && part !== '-' && part !== '—');
    const readable = parts.find((part) => {
      if (isRawStoragePayload(part)) return false;
      if (part.includes(';;;')) return false;
      if (part.length > MAX_COMPARE_DISPLAY_CHARS) return false;
      return true;
    });
    s = readable ?? '';
  }

  if (!s) return undefined;

  // Gallery packs leftover inside a segment
  if (s.includes(';;;')) {
    const first = s.split(';;;').map((p) => p.trim()).find((p) => p && !isRawStoragePayload(p));
    s = first ?? '';
  }
  if (!s) return undefined;

  if (isRawStoragePayload(s)) return undefined;

  // JSON fragments stored as strings
  if (
    (s.startsWith('{') && s.endsWith('}')) ||
    (s.startsWith('[') && s.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(s);
      const humanized = humanizeJsonFragment(parsed);
      return humanized && humanized !== MISSING_VALUE_DISPLAY ? humanized : undefined;
    } catch {
      return undefined;
    }
  }

  if (s.length > MAX_COMPARE_DISPLAY_CHARS) {
    // Prefer omission over dumping truncated binary/storage residue.
    if (/base64|data:image|\{\s*"|\|\|/i.test(s)) return undefined;
    return undefined;
  }

  return s;
}

/**
 * Format a raw field value for display. Never invents data.
 * Never renders packed DB encodings, base64, or JSON fragments.
 */
export function formatCompareValue(
  value: CompareValue,
  options: { notAvailableLabel?: string } = {}
): string {
  const cleaned = sanitizeCompareDisplayValue(value);
  if (!isPresent(cleaned)) {
    return options.notAvailableLabel ?? MISSING_VALUE_DISPLAY;
  }
  if (typeof cleaned === 'boolean') {
    return cleaned ? 'Yes' : 'No';
  }
  if (typeof cleaned === 'number') {
    return Number.isFinite(cleaned) ? String(cleaned) : MISSING_VALUE_DISPLAY;
  }
  return String(cleaned).trim();
}

/**
 * Derive Brand / Model / Variant picker state from a loaded vehicle.
 * Keeps selectors synchronized with preselected IDs (URL, tray, detail).
 */
export function hydrateCompareSlot(
  vehicle: Record<string, unknown> | null | undefined
): CompareSlotHydration {
  if (!vehicle) {
    return { brandId: null, modelName: null, variantId: null };
  }
  const brandId = typeof vehicle['categoryId'] === 'string' && vehicle['categoryId'].trim()
    ? vehicle['categoryId'].trim()
    : null;
  const parent = typeof vehicle['parentModel'] === 'string' ? vehicle['parentModel'].trim() : '';
  const name = typeof vehicle['name'] === 'string' ? vehicle['name'].trim() : '';
  const modelName = parent || name || null;
  const variantId = typeof vehicle['id'] === 'string' && vehicle['id'].trim()
    ? vehicle['id'].trim()
    : null;
  return { brandId, modelName, variantId };
}

/**
 * Clamp selection to MVP max; drop empties/duplicates while preserving order.
 */
export function clampCompareIds(
  ids: Array<string | null | undefined>,
  max: number = COMPARE_MAX_VEHICLES
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of ids) {
    if (!raw || typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= max) break;
  }
  return result;
}

export function tryAddCompareId(
  current: string[],
  carId: string,
  max: number = COMPARE_MAX_VEHICLES
): CompareSelectionResult {
  if (!carId?.trim()) {
    return { ok: false, reason: 'invalid', ids: current };
  }
  if (current.includes(carId)) {
    return { ok: false, reason: 'duplicate', ids: current };
  }
  if (current.length >= max) {
    return { ok: false, reason: 'full', ids: current };
  }
  return { ok: true, ids: [...current, carId] };
}

/**
 * Build comparison sections from vehicles + catalog.
 * Categories with no visible rows are omitted.
 */
export function buildCompareSections(
  vehicles: Array<object | null | undefined>,
  catalog: CompareCategoryDef[] = COMPARE_CATALOG
): CompareSection[] {
  const ordered = getOrderedCategories(catalog);
  const sections: CompareSection[] = [];

  for (const category of ordered) {
    const rows: CompareRow[] = [];
    for (const field of category.fields) {
      const rawValues = vehicles.map((v) => resolveFieldValue(v as Record<string, unknown> | null | undefined, field));
      const displayValues = rawValues.map((val) => formatCompareValue(val));
      const allMissing = displayValues.every((val) => val === MISSING_VALUE_DISPLAY);
      if (allMissing && field.hideWhenAllMissing) {
        continue;
      }
      rows.push({
        fieldId: field.id,
        label: field.label,
        values: displayValues
      });
    }
    if (rows.length > 0) {
      sections.push({
        categoryId: category.id,
        label: category.label,
        rows
      });
    }
  }

  return sections;
}

/**
 * Parse shareable compare query (`ids` preferred, `cars` legacy).
 */
export function parseCompareQueryIds(params: {
  ids?: string | null;
  cars?: string | null;
}): string[] {
  const raw = params.ids || params.cars || '';
  if (!raw) return [];
  return clampCompareIds(raw.split(/[,|]/));
}

export function buildCompareQueryString(ids: string[]): string {
  const clamped = clampCompareIds(ids);
  return clamped.length > 0 ? `ids=${clamped.join(',')}` : '';
}

export function displayVehicleLabel(vehicle: object | null | undefined): string {
  if (!vehicle) return 'Vehicle unavailable';
  const rec = vehicle as Record<string, unknown>;
  const parent = rec['parentModel'];
  const variant = rec['variantName'];
  const name = rec['name'];
  if (typeof parent === 'string' && parent.trim()) {
    if (typeof variant === 'string' && variant.trim() && variant !== parent) {
      return `${parent} (${variant})`;
    }
    return parent;
  }
  if (typeof name === 'string' && name.trim()) return name;
  return 'Unknown EV';
}

/** Expose field resolution for unit tests / admin tooling. */
export function getFieldDisplay(
  vehicle: Record<string, unknown> | null | undefined,
  field: CompareFieldDef
): string {
  return formatCompareValue(resolveFieldValue(vehicle, field));
}
