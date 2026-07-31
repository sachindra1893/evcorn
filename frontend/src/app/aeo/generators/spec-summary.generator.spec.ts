import { generateSpecSummary } from './spec-summary.generator';

describe('SpecSummaryGenerator', () => {
  it('emits citation-ready rows and omits empties / N/A', () => {
    const rows = generateSpecSummary({
      id: 'v1',
      price: '₹12.49 Lakh',
      range: '465 km',
      batteryCapacity: '40.5 kWh',
      dcCharging: '50 kW',
      drivetrain: 'FWD',
      bodyStyle: 'SUV',
      seating: '5 Seater',
      safetyRating: 'N/A',
      adasLevel: '-',
      airbags: '',
      status: 'Published'
    });
    const labels = rows.map((r) => r.label);
    expect(labels).toContain('Price');
    expect(labels).toContain('Claimed range');
    expect(labels).toContain('Battery');
    expect(labels).toContain('DC fast charging');
    expect(labels).not.toContain('Safety rating');
    expect(labels).not.toContain('ADAS');
    expect(labels).not.toContain('Airbags');
    expect(rows.find((r) => r.label === 'Price')?.value).toBe('₹12.49 Lakh');
  });

  it('prefers nested DTO text when flat is missing', () => {
    const rows = generateSpecSummary({
      id: 'v2',
      pricing: { priceText: '₹18 Lakh' },
      battery: { capacityText: '60 kWh', capacityKWh: 60 },
      performance: { rangeText: '500 km', claimedRangeKM: 500 },
      charging: { dcChargingText: '150 kW', dcFastChargingKW: 150 }
    });
    expect(rows.find((r) => r.label === 'Price')?.value).toBe('₹18 Lakh');
    expect(rows.find((r) => r.label === 'Battery')?.value).toBe('60 kWh');
    expect(rows.find((r) => r.label === 'Claimed range')?.value).toBe('500 km');
    expect(rows.find((r) => r.label === 'DC fast charging')?.value).toBe('150 kW');
  });

  it('returns empty array for null variant', () => {
    expect(generateSpecSummary(null)).toEqual([]);
    expect(generateSpecSummary(undefined)).toEqual([]);
  });
});
