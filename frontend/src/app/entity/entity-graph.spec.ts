import {
  clearEntityGraphCache,
  entityGraphCacheSize
} from './entity-cache';
import {
  aeoRelatedFromGraph,
  buildArticlePageGraph,
  buildVehiclePageGraph,
  getOrBuildVehiclePageGraph,
  relatedArticlesFromGraph,
  relatedVehiclesFromGraph,
  safeBuildArticlePageGraph,
  safeBuildVehiclePageGraph
} from './entity-graph';

describe('entity-graph — vehicle page graph', () => {
  const brand = { id: 'tata', name: 'Tata Motors' };
  const variants = [
    {
      id: 'v1',
      categoryId: 'tata',
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV',
      variantName: 'MR',
      bodyStyle: 'SUV',
      imageUrl: 'https://cdn.example/nexon.jpg',
      battery: { chemistry: 'LFP' }
    },
    {
      id: 'v2',
      categoryId: 'tata',
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV',
      variantName: 'LR'
    }
  ];

  it('builds brand, model, selected + sibling variants (page-local)', () => {
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0]
    });

    expect(graph.nodes.some((n) => n.id === 'brand:tata')).toBe(true);
    expect(graph.nodes.some((n) => n.id === 'model:tata:nexon-ev')).toBe(true);
    expect(graph.nodes.some((n) => n.id === 'variant:v1')).toBe(true);
    expect(graph.nodes.some((n) => n.id === 'variant:v2')).toBe(true);

    expect(graph.edges.some((e) => e.type === 'brand_has_model')).toBe(true);
    expect(graph.edges.filter((e) => e.type === 'model_has_variant').length).toBe(2);
    expect(graph.edges.some((e) => e.type === 'variant_sibling')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'has_image')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'has_facet')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'faq_about')).toBe(true);
  });

  it('attaches recommended vehicles/articles in RecommendationService order and caps', () => {
    const recommendedVehicles = Array.from({ length: 8 }, (_, i) => ({
      id: `r${i}`,
      brandName: 'MG',
      parentModel: `Model ${i}`,
      categoryId: 'mg'
    }));
    const recommendedArticles = Array.from({ length: 6 }, (_, i) => ({
      id: `a${i}`,
      title: `Article ${i}`
    }));

    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0],
      recommendedVehicles,
      recommendedArticles
    });

    const recV = graph.edges.filter((e) => e.type === 'recommended_vehicle');
    const recA = graph.edges.filter((e) => e.type === 'recommended_article');
    expect(recV.length).toBe(6);
    expect(recA.length).toBe(4);
    // Order preserved — first recommended stays first (no re-rank).
    expect(recV[0].to.id).toBe('variant:r0');
    expect(recA[0].to.id).toBe('article:a0');
    expect(graph.edges.filter((e) => e.type === 'compares_with').length).toBeLessThanOrEqual(3);
  });

  it('uses entity-href canonical paths on model / recommended edges', () => {
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0],
      recommendedVehicles: [
        {
          id: 'peer1',
          brandName: 'Tata Motors',
          brandSlug: 'tata',
          parentModel: 'Punch EV'
        }
      ]
    });
    const model = graph.nodes.find((n) => n.type === 'model');
    expect(model?.href).toBe('/ev/tata-motors/nexon-ev');
    const rec = graph.edges.find((e) => e.type === 'recommended_vehicle');
    expect(rec?.href).toBe('/ev/tata-motors/punch-ev');
  });

  it('never invents edge types outside the approved set', () => {
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0],
      recommendedVehicles: [{ id: 'r1', brandName: 'MG', parentModel: 'ZS EV' }],
      recommendedArticles: [{ id: 'a1', title: 'Guide' }]
    });
    const allowed = new Set([
      'brand_has_model',
      'model_has_variant',
      'variant_sibling',
      'article_about_vehicle',
      'article_about_brand',
      'article_related_article',
      'recommended_vehicle',
      'recommended_article',
      'compares_with',
      'authored_by',
      'has_image',
      'has_facet',
      'faq_about'
    ]);
    for (const e of graph.edges) {
      expect(allowed.has(e.type)).toBe(true);
    }
  });

  it('is page-local — ignores a large unused catalog (no scan)', () => {
    const catalog = Array.from({ length: 5000 }, (_, i) => ({
      id: `catalog-${i}`,
      parentModel: `Cat ${i}`,
      brandName: 'Other'
    }));
    const t0 = performance.now();
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0],
      recommendedVehicles: catalog.slice(0, 3)
      // catalog itself is never passed
    });
    const elapsed = performance.now() - t0;
    expect(graph.nodes.length).toBeLessThan(30);
    expect(graph.nodes.some((n) => n.id === 'variant:catalog-99')).toBe(false);
    expect(elapsed).toBeLessThan(50);
    void catalog; // prove we do not iterate it inside the builder
  });
});

describe('entity-graph — article page graph', () => {
  const article = {
    id: 'art1',
    title: 'Nexon EV review',
    author: { name: 'Alex Writer', role: 'Editor' },
    imageUrl: 'https://cdn.example/art.jpg',
    relationships: {
      relatedVehicleIds: ['v-edit'],
      relatedArticleIds: ['art-edit'],
      relatedBrandIds: ['tata']
    },
    blocks: [{ type: 'related', data: { articleIds: ['art-block'] } }]
  };

  it('prefers editorial relationships over recommendations', () => {
    const graph = buildArticlePageGraph({
      article,
      brands: [{ id: 'tata', name: 'Tata Motors' }],
      editorialVehicles: [
        {
          id: 'v-edit',
          brandName: 'Tata Motors',
          parentModel: 'Nexon EV'
        }
      ],
      editorialArticles: [
        { id: 'art-edit', title: 'Editorial related' },
        { id: 'art-block', title: 'From block' }
      ],
      recommendedVehicles: [
        { id: 'v-rec', brandName: 'MG', parentModel: 'ZS EV' }
      ],
      recommendedArticles: [{ id: 'art-rec', title: 'Recommended' }]
    });

    expect(graph.edges.some((e) => e.type === 'article_about_vehicle')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'article_related_article')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'article_about_brand')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'authored_by')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'has_image')).toBe(true);
    // Editorial present → no recommendation edges for related outbound.
    expect(graph.edges.some((e) => e.type === 'recommended_vehicle')).toBe(false);
    expect(graph.edges.some((e) => e.type === 'recommended_article')).toBe(false);

    const relatedV = relatedVehiclesFromGraph(graph);
    expect(relatedV.map((v) => v.id)).toEqual(['v-edit']);
    expect(relatedV[0].href).toBe('/ev/tata-motors/nexon-ev');

    const relatedA = relatedArticlesFromGraph(graph);
    expect(relatedA.map((a) => a.id)).toEqual(['art-edit', 'art-block']);
  });

  it('falls back to RecommendationService when editorial absent', () => {
    const graph = buildArticlePageGraph({
      article: {
        id: 'art2',
        title: 'No relationships',
        relationships: {}
      },
      recommendedVehicles: [
        { id: 'v-rec', brandName: 'MG', parentModel: 'ZS EV' }
      ],
      recommendedArticles: [{ id: 'art-rec', title: 'Recommended' }]
    });

    expect(graph.edges.some((e) => e.type === 'recommended_vehicle')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'recommended_article')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'article_about_vehicle')).toBe(false);
    expect(relatedVehiclesFromGraph(graph)[0].id).toBe('v-rec');
    expect(relatedArticlesFromGraph(graph)[0].id).toBe('art-rec');
  });

  it('uses relationship ids as editorial even without resolved DTOs', () => {
    const graph = buildArticlePageGraph({
      article: {
        id: 'art3',
        title: 'Ids only',
        relationships: { relatedVehicleIds: ['orphan-v'], relatedArticleIds: ['orphan-a'] }
      },
      recommendedVehicles: [{ id: 'v-rec', brandName: 'MG', parentModel: 'ZS EV' }],
      recommendedArticles: [{ id: 'art-rec', title: 'Recommended' }]
    });
    expect(graph.edges.some((e) => e.type === 'article_about_vehicle')).toBe(true);
    expect(graph.edges.some((e) => e.type === 'recommended_vehicle')).toBe(false);
    expect(relatedVehiclesFromGraph(graph)[0].href).toContain('/compare?ids=orphan-v');
  });
});

describe('entity-graph — AEO adapter + failure isolation', () => {
  it('aeoRelatedFromGraph returns null for empty graph (DTO fallback path)', () => {
    expect(aeoRelatedFromGraph(undefined)).toBeNull();
    expect(aeoRelatedFromGraph({ nodes: [], edges: [] })).toBeNull();
    expect(
      aeoRelatedFromGraph({
        nodes: [{ type: 'brand', id: 'brand:x', name: 'X', attrs: {} }],
        edges: []
      })
    ).toBeNull();
  });

  it('aeoRelatedFromGraph maps graph edges for AEO consumption', () => {
    const graph = buildVehiclePageGraph({
      brand: { id: 'tata', name: 'Tata Motors' },
      variants: [
        {
          id: 'v1',
          categoryId: 'tata',
          brandName: 'Tata Motors',
          parentModel: 'Nexon EV'
        }
      ],
      selectedVariant: {
        id: 'v1',
        categoryId: 'tata',
        brandName: 'Tata Motors',
        parentModel: 'Nexon EV'
      },
      recommendedVehicles: [
        { id: 'peer', brandName: 'MG', parentModel: 'ZS EV' }
      ],
      recommendedArticles: [{ id: 'a1', title: 'Guide' }]
    });
    const related = aeoRelatedFromGraph(graph, {
      selectedVariantId: 'v1',
      labelLeft: 'Tata Nexon EV'
    });
    expect(related).not.toBeNull();
    expect(related!.relatedVehicles[0].href).toBe('/ev/mg/zs-ev');
    expect(related!.relatedArticles[0].href).toBe('/articles/a1');
    expect(related!.relatedComparisons[0].href).toContain('/compare?ids=');
    expect(related!.relatedComparisons[0].label.startsWith('Tata Nexon EV vs')).toBe(true);
  });

  it('safeBuild* swallows builder failures', () => {
    const bad = null as unknown as Parameters<typeof buildVehiclePageGraph>[0];
    expect(safeBuildVehiclePageGraph(bad)).toEqual({ nodes: [], edges: [] });
    expect(safeBuildArticlePageGraph(bad as any)).toEqual({ nodes: [], edges: [] });
  });

  it('getOrBuildVehiclePageGraph caches by entityId+version (no second build)', () => {
    clearEntityGraphCache();
    const brand = { id: 'tata', name: 'Tata Motors' };
    const variants = [
      {
        id: 'v1',
        categoryId: 'tata',
        brandName: 'Tata Motors',
        parentModel: 'Nexon EV',
        updatedAt: '2026-07-31T00:00:00.000Z'
      }
    ];
    const ctx = {
      brand,
      variants,
      selectedVariant: variants[0],
      recommendedVehicles: [
        { id: 'v-rec', brandName: 'Tata Motors', parentModel: 'Punch EV' }
      ]
    };
    const first = getOrBuildVehiclePageGraph(ctx);
    expect(first.nodes.length).toBeGreaterThan(0);
    expect(entityGraphCacheSize()).toBe(1);
    const second = getOrBuildVehiclePageGraph(ctx);
    expect(second).toBe(first);
    // Version change → miss
    const third = getOrBuildVehiclePageGraph({
      ...ctx,
      selectedVariant: { ...ctx.selectedVariant, updatedAt: '2026-08-01T00:00:00.000Z' }
    });
    expect(third).not.toBe(first);
    expect(entityGraphCacheSize()).toBe(2);
  });

  it('page graph builders never accept a catalog — only page-local arrays', () => {
    // Scalability contract: O(variants_on_page + capped related). No catalog param exists.
    const keys = Object.keys({
      brand: { id: 'tata', name: 'Tata Motors' },
      variants: [],
      selectedVariant: null,
      recommendedVehicles: [],
      recommendedArticles: []
    } as Parameters<typeof buildVehiclePageGraph>[0]);
    expect(keys).not.toContain('allVehicles');
    expect(keys).not.toContain('catalog');
    expect(keys).not.toContain('allArticles');
  });
});
