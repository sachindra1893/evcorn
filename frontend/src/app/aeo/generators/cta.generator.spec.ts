import { generateCtas } from './cta.generator';

describe('CTAGenerator', () => {
  it('builds compare + view specs CTAs', () => {
    const ctas = generateCtas({
      selectedVariantId: 'v1',
      brandSlug: 'tata',
      modelSlug: 'nexon-ev',
      preferSpecsAnchor: true
    });
    expect(ctas.compare?.href).toBe('/compare?ids=v1');
    expect(ctas.viewSpecs?.href).toBe('#aeo-specs');
  });

  it('uses model path when anchor not preferred', () => {
    const ctas = generateCtas({
      brandSlug: 'tata',
      modelSlug: 'nexon-ev',
      preferSpecsAnchor: false
    });
    expect(ctas.viewSpecs?.href).toBe('/ev/tata/nexon-ev#aeo-specs');
    expect(ctas.compare).toBeUndefined();
  });
});
