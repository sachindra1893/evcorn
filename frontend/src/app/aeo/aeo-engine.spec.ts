import { buildVehiclePageGraph } from '../entity/entity-graph';
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

  it('prefers Entity Graph related edges (entity-href) over raw DTO slate', () => {
    const brand = { id: 'cat-tata', name: 'Tata Motors' };
    const selected = {
      id: 'nexon-1',
      parentModel: 'Nexon EV',
      brandName: 'Tata Motors',
      categoryId: 'cat-tata',
      updatedAt: '2026-07-10T00:00:00.000Z'
    };
    const entityGraph = buildVehiclePageGraph({
      brand,
      variants: [selected],
      selectedVariant: selected,
      recommendedVehicles: [
        { id: 'peer-graph', parentModel: 'ZS EV', brandName: 'MG' }
      ],
      recommendedArticles: [{ id: 'art-graph', title: 'From Graph' }]
    });

    const model = buildVehicleAeo({
      brandName: 'Tata Motors',
      modelName: 'Nexon EV',
      brandSlug: 'tata-motors',
      modelSlug: 'nexon-ev',
      variants: [selected],
      selectedVariant: selected,
      // Conflicting DTO slate — must not win when graph has related edges.
      relatedVehicles: [
        { id: 'peer-dto', parentModel: 'XUV400', brandName: 'Mahindra' }
      ],
      relatedArticles: [{ id: 'art-dto', title: 'From DTO' }],
      entityGraph
    });

    expect(model.relatedVehicles.map((v) => v.id)).toEqual(['peer-graph']);
    expect(model.relatedVehicles[0].href).toBe('/ev/mg/zs-ev');
    expect(model.relatedArticles.map((a) => a.id)).toEqual(['art-graph']);
    expect(model.relatedComparisons.length).toBe(1);
    expect(model.internalLinks.some((l) => l.href === '/faqs')).toBe(true);
  });

  it('falls back to DTO generators when entity graph is empty', () => {
    const selected = {
      id: 'nexon-1',
      parentModel: 'Nexon EV',
      updatedAt: '2026-07-10T00:00:00.000Z'
    };
    const model = buildVehicleAeo({
      brandName: 'Tata Motors',
      modelName: 'Nexon EV',
      brandSlug: 'tata-motors',
      modelSlug: 'nexon-ev',
      variants: [selected],
      selectedVariant: selected,
      relatedVehicles: [
        { id: 'peer-dto', parentModel: 'XUV400', brandName: 'Mahindra' }
      ],
      relatedArticles: [{ id: 'art-dto', title: 'From DTO' }],
      entityGraph: { nodes: [], edges: [] }
    });
    expect(model.relatedVehicles.map((v) => v.id)).toEqual(['peer-dto']);
    expect(model.relatedArticles[0].href).toBe('/articles/art-dto');
  });
});
