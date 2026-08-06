import { describe, it, expect } from 'vitest';
import { buildVehiclePageGraph } from '../entity/entity-graph';
import { deriveClusters, derivePillar } from './pillar-cluster';
import { deriveTopicsFromGraph } from './topic-derive';

describe('pillar-cluster', () => {
  const brand = { id: 'tata', name: 'Tata Motors' };
  const variants = [
    {
      id: 'v1',
      categoryId: 'tata',
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV',
      bodyStyle: 'SUV'
    }
  ];

  it('derives model pillar from existing model href (no new topic routes)', () => {
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0]
    });
    const topics = deriveTopicsFromGraph(graph, {
      pageKind: 'vehicle',
      selectedVariantId: 'v1'
    });
    const pillar = derivePillar(topics, {
      pageKind: 'vehicle',
      modelHref: '/ev/tata-motors/nexon-ev'
    });
    expect(pillar?.href).toBe('/ev/tata-motors/nexon-ev');
    expect(pillar?.id).toContain('pillar:model:');
  });

  it('derives cluster keys for model / brand / facet only from grounded topics', () => {
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0]
    });
    const topics = deriveTopicsFromGraph(graph, {
      pageKind: 'vehicle',
      selectedVariantId: 'v1'
    });
    const clusters = deriveClusters(topics, graph);
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters.length).toBeLessThanOrEqual(4);
    expect(clusters.some((c) => c.id.startsWith('cluster:model:'))).toBe(true);
    expect(clusters.some((c) => c.id.startsWith('cluster:brand:'))).toBe(true);
    expect(clusters.some((c) => c.id.startsWith('cluster:facet:'))).toBe(true);
    for (const c of clusters) {
      expect(c.memberEntityIds.length).toBeGreaterThan(0);
      expect(c.topicId.startsWith('topic:')).toBe(true);
    }
  });

  it('does not create Mongo-style persisted cluster documents — plans are ephemeral refs', () => {
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0]
    });
    const topics = deriveTopicsFromGraph(graph, { pageKind: 'vehicle' });
    const clusters = deriveClusters(topics, graph);
    // Shape contract: ClusterRef only
    expect(clusters[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        label: expect.any(String),
        topicId: expect.any(String),
        memberEntityIds: expect.any(Array),
        memberSuggestions: expect.any(Array)
      })
    );
    expect('body' in clusters[0]).toBe(false);
  });
});
