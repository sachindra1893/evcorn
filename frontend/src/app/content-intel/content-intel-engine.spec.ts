import { describe, it, expect, beforeEach } from 'vitest';
import { buildVehiclePageGraph, buildArticlePageGraph } from '../entity/entity-graph';
import { modelEntityId } from '../entity/entity-id';
import { modelHref } from '../entity/entity-href';
import {
  clearContentIntelCache,
  contentIntelCacheSize
} from './content-intel-cache';
import {
  buildArticleContentIntel,
  buildVehicleContentIntel,
  safeBuildVehicleContentIntel
} from './content-intel-engine';
import { emptyContentIntelPageModel } from './content-intel.types';

describe('content-intel-engine', () => {
  beforeEach(() => clearContentIntelCache());

  const brand = { id: 'tata', name: 'Tata Motors' };
  const variants = [
    {
      id: 'v1',
      categoryId: 'tata',
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV',
      bodyStyle: 'SUV',
      updatedAt: '2026-07-10T00:00:00.000Z'
    }
  ];

  function vehicleCtx(extra?: {
    recommendedVehicles?: Array<Record<string, string>>;
    recommendedArticles?: Array<Record<string, string>>;
  }) {
    const selected = variants[0];
    const recommendedVehicles = extra?.recommendedVehicles || [
      { id: 'r0', brandName: 'MG', parentModel: 'ZS EV', categoryId: 'mg' },
      { id: 'r1', brandName: 'Mahindra', parentModel: 'XUV400', categoryId: 'mahindra' }
    ];
    const recommendedArticles = extra?.recommendedArticles || [
      { id: 'a0', title: 'Guide' }
    ];
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: selected,
      recommendedVehicles,
      recommendedArticles
    });
    const mid = modelEntityId('tata', selected)!;
    const mhref = modelHref({ brandName: 'Tata Motors', parentModel: 'Nexon EV' })!;
    return {
      entityGraph: graph,
      brand,
      modelEntityId: mid,
      modelHref: mhref,
      variants,
      selectedVariant: selected,
      recommendedVehicles,
      recommendedArticles,
      now: '2026-08-01T00:00:00.000Z'
    };
  }

  it('builds ContentIntelPageModel from page graph + recommendation slate', () => {
    const model = buildVehicleContentIntel(vehicleCtx());
    expect(model.topics.length).toBeGreaterThan(0);
    expect(model.pillar?.href).toContain('/ev/');
    expect(model.clusters.length).toBeGreaterThan(0);
    expect(model.relatedReading.vehicles.map((v) => v.item.id)).toEqual(['r0', 'r1']);
    expect(model.hubLinks.length).toBeGreaterThan(0);
    expect(model.hubLinks.every((l) => l.evidence.refs.length > 0)).toBe(true);
    expect(model.freshness.state).toBe('fresh');
    expect(model.evidenceSummary.length).toBeGreaterThan(0);
  });

  it('is page-local — ignores a large unused catalog (no scan)', () => {
    const catalog = Array.from({ length: 5000 }, (_, i) => ({
      id: `catalog-${i}`,
      parentModel: `Cat ${i}`,
      brandName: 'Other'
    }));
    const t0 = performance.now();
    const model = buildVehicleContentIntel(
      vehicleCtx({
        recommendedVehicles: catalog.slice(0, 3) as never
      })
    );
    const elapsed = performance.now() - t0;
    expect(model.relatedReading.vehicles.length).toBe(3);
    expect(model.relatedReading.vehicles.some((v) => v.item.id === 'catalog-99')).toBe(false);
    expect(elapsed).toBeLessThan(50);
    void catalog;
  });

  it('failure isolation — empty model on missing graph / throw', () => {
    const empty = buildVehicleContentIntel({
      entityGraph: null as never,
      brand,
      modelEntityId: 'model:tata:nexon-ev',
      modelHref: '/ev/tata-motors/nexon-ev',
      variants,
      selectedVariant: variants[0]
    });
    expect(empty).toEqual(emptyContentIntelPageModel());

    const safe = safeBuildVehicleContentIntel({
      entityGraph: { nodes: [], edges: [] },
      brand,
      modelEntityId: 'model:tata:nexon-ev',
      modelHref: '/ev/tata-motors/nexon-ev',
      variants,
      selectedVariant: variants[0]
    });
    // Empty graph still returns a model (hubs may be empty topics) — must not throw
    expect(safe.topics).toEqual([]);
    expect(safe.freshness.state).toBeDefined();
  });

  it('caches by entityId+version and invalidates when related fingerprint changes', () => {
    const ctx = vehicleCtx();
    buildVehicleContentIntel(ctx);
    expect(contentIntelCacheSize()).toBe(1);
    buildVehicleContentIntel(ctx);
    expect(contentIntelCacheSize()).toBe(1);

    const changed = buildVehicleContentIntel(
      vehicleCtx({
        recommendedVehicles: [
          { id: 'new-peer', brandName: 'BYD', parentModel: 'Atto 3', categoryId: 'byd' }
        ]
      })
    );
    expect(changed.relatedReading.vehicles[0].item.id).toBe('new-peer');
    expect(contentIntelCacheSize()).toBe(2);
  });

  it('builds article CI with editorial order and freshness from article dates', () => {
    const article = {
      id: 'art1',
      title: 'Nexon EV review',
      categoryId: 'reviews',
      updatedAt: '2026-07-01T00:00:00.000Z',
      status: 'published',
      relationships: {
        relatedVehicleIds: ['v-edit'],
        relatedBrandIds: ['tata'],
        relatedArticleIds: ['art-edit']
      }
    };
    const graph = buildArticlePageGraph({
      article,
      brands: [{ id: 'tata', name: 'Tata Motors' }],
      editorialVehicles: [
        {
          id: 'v-edit',
          brandName: 'Tata Motors',
          parentModel: 'Nexon EV',
          categoryId: 'tata'
        }
      ],
      editorialArticles: [{ id: 'art-edit', title: 'Related guide' }]
    });

    const model = buildArticleContentIntel({
      entityGraph: graph,
      article,
      brands: [{ id: 'tata', name: 'Tata Motors' }],
      now: '2026-08-01T00:00:00.000Z'
    });

    expect(model.topics.some((t) => t.topic.kind === 'brand')).toBe(true);
    expect(model.topics.some((t) => t.topic.kind === 'article_category')).toBe(true);
    expect(model.relatedReading.vehicles[0].item.id).toBe('v-edit');
    expect(model.relatedReading.vehicles[0].evidence.source).toBe('editorial_relationship');
    expect(model.freshness.state).toBe('fresh');
    expect(model.hubLinks.every((l) => l.evidence.refs.length > 0)).toBe(true);
  });

  it('does not invent topic labels from article title alone', () => {
    const article = {
      id: 'art2',
      title: 'Nexon EV charging secrets in Mumbai',
      categoryId: 'general',
      relationships: {}
    };
    const graph = buildArticlePageGraph({ article });
    const model = buildArticleContentIntel({
      entityGraph: graph,
      article,
      now: '2026-08-01T00:00:00.000Z'
    });
    expect(model.topics.some((t) => t.topic.kind === 'model')).toBe(false);
    expect(model.topics.some((t) => t.topic.kind === 'facet')).toBe(false);
    expect(model.topics.some((t) => /nexon/i.test(t.topic.label))).toBe(false);
  });
});
