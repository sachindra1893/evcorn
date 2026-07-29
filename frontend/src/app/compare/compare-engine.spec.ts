import {
  COMPARE_CATALOG,
  isPresent,
  resolveFieldValue,
  getOrderedCategories
} from './compare-catalog';
import {
  COMPARE_MAX_VEHICLES,
  MISSING_VALUE_DISPLAY,
  buildCompareQueryString,
  buildCompareSections,
  clampCompareIds,
  formatCompareValue,
  hydrateCompareSlot,
  parseCompareQueryIds,
  sanitizeCompareDisplayValue,
  tryAddCompareId
} from './compare-engine';

describe('compare catalog', () => {
  it('orders categories by order field', () => {
    const ordered = getOrderedCategories();
    const orders = ordered.map((c) => c.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(ordered[0].id).toBe('overview');
  });

  it('includes buying-decision categories', () => {
    const ids = COMPARE_CATALOG.map((c) => c.id);
    expect(ids).toContain('battery-charging');
    expect(ids).toContain('performance');
    expect(ids).toContain('safety');
    expect(ids).toContain('dimensions');
  });
});

describe('formatCompareValue / isPresent', () => {
  it('shows em dash for missing values and never invents data', () => {
    expect(formatCompareValue(undefined)).toBe(MISSING_VALUE_DISPLAY);
    expect(formatCompareValue(null)).toBe(MISSING_VALUE_DISPLAY);
    expect(formatCompareValue('')).toBe(MISSING_VALUE_DISPLAY);
    expect(formatCompareValue('N/A')).toBe(MISSING_VALUE_DISPLAY);
    expect(formatCompareValue('-')).toBe(MISSING_VALUE_DISPLAY);
    expect(isPresent('N/A')).toBe(false);
  });

  it('formats booleans and numbers honestly', () => {
    expect(formatCompareValue(true)).toBe('Yes');
    expect(formatCompareValue(false)).toBe('No');
    expect(formatCompareValue(465)).toBe('465');
  });

  it('never renders packed || storage, base64, or JSON fragments', () => {
    expect(
      formatCompareValue('40.5 kWh||7.2 kW||50 kW||data:image/jpeg;base64,/9j/4AAQ||465 km')
    ).toBe('40.5 kWh');
    expect(formatCompareValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')).toBe(MISSING_VALUE_DISPLAY);
    expect(formatCompareValue('{"capacityKWh":40.5,"chemistry":"LFP"}')).toBe('capacityKWh: 40.5, chemistry: LFP');
    expect(formatCompareValue('5 Star GNCAP||Level 2||6')).toBe('5 Star GNCAP');
    expect(formatCompareValue('350 L;;;data:image/jpeg;base64,abc')).toBe('350 L');
    // Pure base64 blob
    const blob = 'A'.repeat(400);
    expect(formatCompareValue(blob)).toBe(MISSING_VALUE_DISPLAY);
  });
});

describe('hydrateCompareSlot', () => {
  it('maps vehicle ids into brand / model / variant selector state', () => {
    expect(
      hydrateCompareSlot({
        id: 'nexon-empowered',
        categoryId: 'tata',
        parentModel: 'Nexon EV',
        variantName: 'Empowered+',
        name: 'Nexon EV Empowered+'
      })
    ).toEqual({
      brandId: 'tata',
      modelName: 'Nexon EV',
      variantId: 'nexon-empowered'
    });
  });

  it('falls back to name when parentModel is missing', () => {
    expect(hydrateCompareSlot({ id: 'x', categoryId: 'mg', name: 'ZS EV' })).toEqual({
      brandId: 'mg',
      modelName: 'ZS EV',
      variantId: 'x'
    });
  });
});

describe('selection limits', () => {
  it('clamps to MVP max of 2 unique ids', () => {
    expect(COMPARE_MAX_VEHICLES).toBe(2);
    expect(clampCompareIds(['a', 'b', 'c'])).toEqual(['a', 'b']);
    expect(clampCompareIds(['a', 'a', 'b'])).toEqual(['a', 'b']);
    expect(clampCompareIds(['', null, 'x'] as any)).toEqual(['x']);
  });

  it('tryAddCompareId enforces full and duplicate', () => {
    expect(tryAddCompareId(['a'], 'b')).toEqual({ ok: true, ids: ['a', 'b'] });
    expect(tryAddCompareId(['a', 'b'], 'c').ok).toBe(false);
    expect(tryAddCompareId(['a'], 'a').ok).toBe(false);
  });

  it('parses ids and legacy cars query params', () => {
    expect(parseCompareQueryIds({ ids: 'a,b,c' })).toEqual(['a', 'b']);
    expect(parseCompareQueryIds({ cars: 'x|y' })).toEqual(['x', 'y']);
    expect(parseCompareQueryIds({ ids: 'a', cars: 'b,c' })).toEqual(['a']);
    expect(buildCompareQueryString(['a', 'b', 'c'])).toBe('ids=a,b');
  });
});

describe('buildCompareSections', () => {
  const nexon = {
    id: 'tata-nexon-ev',
    name: 'Tata Nexon EV',
    parentModel: 'Nexon EV',
    variantName: 'Empowered+ Long Range',
    price: '₹ 16.99 Lakh',
    batteryCapacity: '40.5 kWh',
    range: '465 km',
    drivetrain: 'FWD',
    groundClearance: '190 mm',
    bootFrunkSpace: '350 L',
    battery: { capacityText: '40.5 kWh', capacityKWh: 40.5 },
    charging: { acChargingText: '7.2 kW AC', dcChargingText: '50 kW DC' },
    performance: {
      rangeText: '465 km',
      maxPowerBHP: 143,
      maxTorqueNM: 215,
      acceleration0to100Sec: 8.9,
      drivetrain: 'FWD'
    },
    safety: { ncapRating: 5, ncapTestingBody: 'GNCAP', airbagsCount: 6, hasADAS: true },
    dimensionsObj: { lengthMM: 3994, widthMM: 1811, groundClearanceMM: 190, bootSpaceLiters: 350, wheelbaseMM: 2498 }
  };

  const tiago = {
    id: 'tata-tiago-ev',
    name: 'Tata Tiago EV',
    parentModel: 'Tiago EV',
    price: '₹ 7.99 Lakh',
    range: '315 km',
    battery: { capacityText: '24 kWh' },
    performance: { rangeText: '315 km', maxPowerBHP: 74, drivetrain: 'FWD' },
    safety: { ncapRating: 4, airbagsCount: 2, hasADAS: false }
  };

  it('builds category sections with side-by-side values', () => {
    const sections = buildCompareSections([nexon, tiago]);
    expect(sections.length).toBeGreaterThan(3);

    const battery = sections.find((s) => s.categoryId === 'battery-charging');
    expect(battery).toBeTruthy();
    const rangeRow = battery!.rows.find((r) => r.fieldId === 'range');
    expect(rangeRow?.values).toEqual(['465 km', '315 km']);

    const safety = sections.find((s) => s.categoryId === 'safety');
    const adas = safety!.rows.find((r) => r.fieldId === 'adas');
    expect(adas?.values).toEqual(['Yes', 'No']);
  });

  it('shows em dash for missing fields and hides all-missing optional rows', () => {
    const sparse = { id: 'x', name: 'Sparse', price: '₹ 1 Lakh' };
    const sections = buildCompareSections([sparse, tiago]);
    const overview = sections.find((s) => s.categoryId === 'overview');
    expect(overview?.rows[0].values[0]).toBe('₹ 1 Lakh');

    const battery = sections.find((s) => s.categoryId === 'battery-charging');
    const batteryRow = battery!.rows.find((r) => r.fieldId === 'battery');
    expect(batteryRow?.values[0]).toBe(MISSING_VALUE_DISPLAY);

    // Interior / warranty have hideWhenAllMissing — omitted when neither vehicle has data
    expect(sections.find((s) => s.categoryId === 'interior')).toBeUndefined();
    expect(sections.find((s) => s.categoryId === 'warranty')).toBeUndefined();
  });

  it('resolves nested battery text preferentially', () => {
    const field = COMPARE_CATALOG
      .find((c) => c.id === 'battery-charging')!
      .fields.find((f) => f.id === 'battery')!;
    expect(resolveFieldValue(nexon, field)).toBe('40.5 kWh');
  });

  it('never surfaces packed capacityText with embedded base64 in sections', () => {
    const dirty = {
      id: 'dirty-ev',
      name: 'Dirty EV',
      parentModel: 'Dirty EV',
      price: '₹ 10 Lakh',
      battery: {
        capacityText:
          '45 kWh||7.2 kW||50 kW||data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj||465 km'
      },
      batteryCapacity:
        '45 kWh||7.2 kW||50 kW||data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD||465 km',
      performance: { rangeText: '465 km' }
    };
    const sections = buildCompareSections([dirty, tiago]);
    const battery = sections.find((s) => s.categoryId === 'battery-charging');
    const batteryRow = battery!.rows.find((r) => r.fieldId === 'battery');
    expect(batteryRow?.values[0]).toBe('45 kWh');
    expect(batteryRow?.values[0]).not.toContain('||');
    expect(batteryRow?.values[0]).not.toContain('base64');
    expect(batteryRow?.values[0]).not.toContain('data:image');

    const serialized = JSON.stringify(sections);
    expect(serialized).not.toContain('||');
    expect(serialized).not.toContain('data:image');
    expect(serialized).not.toContain('base64');
  });

  it('sanitizeCompareDisplayValue strips storage encodings', () => {
    expect(sanitizeCompareDisplayValue('12 kW||data:image/png;base64,xxx')).toBe('12 kW');
    expect(sanitizeCompareDisplayValue('data:image/jpeg;base64,abc')).toBeUndefined();
  });
});
