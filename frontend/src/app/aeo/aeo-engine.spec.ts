import { buildArticleAeo, buildVehicleAeo } from './aeo-engine';
import { clearAeoCache, getCachedAeo } from './aeo-cache';

describe('AeoEngine', () => {
  beforeEach(() => clearAeoCache());

  it('builds vehicle AeoPageModel and caches by entityId+updatedAt', () => {
    const ctx = {
      brandName: 'Tata',
      modelName: 'Nexon EV',
      brandSlug: 'tata',
      modelSlug: 'nexon-ev',
      variants: [
        {
          id: 'nexon-1',
          price: '₹12 Lakh',
          batteryCapacity: '40 kWh',
          range: '400 km',
          dcCharging: '50 kW',
          updatedAt: '2026-07-10T00:00:00.000Z'
        }
      ],
      selectedVariant: {
        id: 'nexon-1',
        price: '₹12 Lakh',
        batteryCapacity: '40 kWh',
        range: '400 km',
        dcCharging: '50 kW',
        keyHighlights: 'Long range',
        updatedAt: '2026-07-10T00:00:00.000Z'
      }
    };

    const first = buildVehicleAeo(ctx);
    expect(first.quickAnswer).toContain('Tata');
    expect(first.keyTakeaways.length).toBeGreaterThan(0);
    expect(first.specSummary.length).toBeGreaterThan(0);
    expect(first.toc.length).toBe(3);
    expect(first.lastUpdated).toBe('2026-07-10T00:00:00.000Z');
    expect(first.faqs.length).toBeGreaterThan(0);
    expect(first.buyingRecommendation).toBeTruthy();
    expect(first.ctas.compare?.href).toContain('nexon-1');
    expect(first.relatedVehicles).toEqual([]);

    const cached = getCachedAeo('nexon-1', '2026-07-10T00:00:00.000Z');
    expect(cached?.quickAnswer).toBe(first.quickAnswer);

    const second = buildVehicleAeo(ctx);
    expect(second.quickAnswer).toBe(first.quickAnswer);
  });

  it('overlays related DTOs after cache hit without full-catalog scan', () => {
    const base = {
      brandName: 'Tata',
      modelName: 'Nexon EV',
      brandSlug: 'tata',
      modelSlug: 'nexon-ev',
      variants: [
        {
          id: 'nexon-1',
          price: '₹12 Lakh',
          batteryCapacity: '40 kWh',
          range: '400 km',
          updatedAt: '2026-07-10T00:00:00.000Z'
        }
      ],
      selectedVariant: {
        id: 'nexon-1',
        price: '₹12 Lakh',
        batteryCapacity: '40 kWh',
        range: '400 km',
        updatedAt: '2026-07-10T00:00:00.000Z'
      }
    };

    buildVehicleAeo(base);
    const withRelated = buildVehicleAeo({
      ...base,
      relatedVehicles: [
        { id: 'peer-1', parentModel: 'XUV400', brandSlug: 'mahindra', modelSlug: 'xuv400' }
      ],
      relatedArticles: [{ id: 'art-1', title: 'Guide' }]
    });
    expect(withRelated.relatedVehicles.length).toBe(1);
    expect(withRelated.relatedComparisons.length).toBe(1);
    expect(withRelated.relatedArticles[0].href).toBe('/articles/art-1');
  });


  it('invalidates cache when updatedAt changes', () => {
    const base = {
      brandName: 'Tata',
      modelName: 'Nexon EV',
      brandSlug: 'tata',
      modelSlug: 'nexon-ev',
      variants: [
        {
          id: 'nexon-1',
          price: '₹12 Lakh',
          batteryCapacity: '40 kWh',
          range: '400 km',
          updatedAt: '2026-07-10T00:00:00.000Z'
        }
      ],
      selectedVariant: {
        id: 'nexon-1',
        price: '₹12 Lakh',
        batteryCapacity: '40 kWh',
        range: '400 km',
        updatedAt: '2026-07-10T00:00:00.000Z'
      }
    };

    const a = buildVehicleAeo(base);
    const b = buildVehicleAeo({
      ...base,
      variants: [{ ...base.variants[0], updatedAt: '2026-07-31T00:00:00.000Z' }],
      selectedVariant: { ...base.selectedVariant, updatedAt: '2026-07-31T00:00:00.000Z' }
    });
    expect(b).not.toBe(a);
    expect(b.lastUpdated).toBe('2026-07-31T00:00:00.000Z');
  });

  it('skips a failed section without breaking the page model', () => {
    const model = buildArticleAeo({
      id: 'art-1',
      title: 'Test',
      description: 'A solid quick answer.',
      updatedAt: '2026-07-01T00:00:00.000Z',
      // Force TOC path with malformed block data — generator should not throw via engine
      blocks: [{ type: 'heading', data: null as unknown as Record<string, unknown> }]
    });
    expect(model.quickAnswer).toBe('A solid quick answer.');
    expect(Array.isArray(model.toc)).toBe(true);
    expect(Array.isArray(model.keyTakeaways)).toBe(true);
  });

  it('article View Specs CTA uses vehicle route, never in-page #aeo-specs', () => {
    const model = buildArticleAeo({
      id: 'art-cta',
      title: 'Compare guide',
      description: 'Quick answer for CTA wiring.',
      brandSlug: 'tata-motors',
      modelSlug: 'nexon-ev',
      updatedAt: '2026-07-01T00:00:00.000Z'
    });
    expect(model.ctas.viewSpecs?.href).toBe('/ev/tata-motors/nexon-ev#aeo-specs');
    expect(model.ctas.viewSpecs?.href.startsWith('#')).toBe(false);
  });
});
