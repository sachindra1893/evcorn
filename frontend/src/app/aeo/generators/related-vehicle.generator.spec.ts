import { generateRelatedVehicles } from './related-vehicle.generator';

describe('RelatedVehicleGenerator', () => {
  it('maps DTOs to hrefs and caps at 6', () => {
    const related = Array.from({ length: 8 }, (_, i) => ({
      id: `v${i}`,
      parentModel: `Model ${i}`,
      brandName: 'Tata Motors',
      brandSlug: 'tata',
      modelSlug: `model-${i}`
    }));
    const out = generateRelatedVehicles(related, { excludeId: 'v0' });
    expect(out.length).toBe(6);
    expect(out[0].href).toBe('/ev/tata-motors/model-1');
    expect(out.every((r) => r.id !== 'v0')).toBe(true);
  });

  it('prefers brandName for canonical /ev/ routes', () => {
    const out = generateRelatedVehicles([
      { id: 'v1', parentModel: 'Nexon EV', brandName: 'Tata Motors', brandSlug: 'tata' }
    ]);
    expect(out[0].href).toBe('/ev/tata-motors/nexon-ev');
  });

  it('falls back to compare deep-link when brand slug unavailable', () => {
    const out = generateRelatedVehicles([{ id: 'v1', parentModel: 'Mystery' }]);
    expect(out[0].href).toBe('/compare?ids=v1');
  });

  it('returns empty when no inputs', () => {
    expect(generateRelatedVehicles([])).toEqual([]);
    expect(generateRelatedVehicles(undefined)).toEqual([]);
  });
});
