import { describe, it, expect } from 'vitest';
import { buildArticlePageGraph, buildVehiclePageGraph } from '../entity/entity-graph';
import { deriveTopicsFromGraph } from './topic-derive';

describe('topic-derive', () => {
  const brand = { id: 'tata', name: 'Tata Motors' };
  const variants = [
    {
      id: 'v1',
      categoryId: 'tata',
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV',
      bodyStyle: 'SUV',
      battery: { chemistry: 'LFP' }
    }
  ];

  it('derives brand, model, facet, and site hub topics from vehicle graph', () => {
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0]
    });
    const topics = deriveTopicsFromGraph(graph, {
      pageKind: 'vehicle',
      selectedVariantId: 'v1'
    });

    expect(topics.some((t) => t.topic.id === 'topic:brand:tata')).toBe(true);
    expect(topics.some((t) => t.topic.kind === 'model')).toBe(true);
    expect(topics.some((t) => t.topic.kind === 'facet' && t.confidence === 'inferred_facet')).toBe(
      true
    );
    expect(topics.some((t) => t.topic.id === 'topic:site_hub:evs')).toBe(true);
    expect(topics.some((t) => t.topic.id === 'topic:site_hub:compare')).toBe(true);

    const brandTopic = topics.find((t) => t.topic.kind === 'brand');
    expect(brandTopic?.confidence).toBe('grounded');
    expect(brandTopic?.topic.href).toContain('/evs');
    expect(brandTopic?.evidenceRefs.length).toBeGreaterThan(0);
  });

  it('never invents topics without graph / CMS evidence', () => {
    expect(deriveTopicsFromGraph(undefined)).toEqual([]);
    expect(deriveTopicsFromGraph({ nodes: [], edges: [] })).toEqual([]);
  });

  it('does not emit weak article_category for general/empty', () => {
    const graph = buildArticlePageGraph({
      article: {
        id: 'art1',
        title: 'Guide',
        categoryId: 'general',
        relationships: {}
      }
    });
    const topics = deriveTopicsFromGraph(graph, {
      pageKind: 'article',
      article: { id: 'art1', title: 'Guide', categoryId: 'general' }
    });
    expect(topics.some((t) => t.topic.kind === 'article_category')).toBe(false);
  });

  it('emits article_category when categoryId is non-general', () => {
    const graph = buildArticlePageGraph({
      article: {
        id: 'art1',
        title: 'Guide',
        categoryId: 'charging',
        relationships: {}
      }
    });
    const topics = deriveTopicsFromGraph(graph, {
      pageKind: 'article',
      article: { id: 'art1', title: 'Guide', categoryId: 'charging' }
    });
    const cat = topics.find((t) => t.topic.kind === 'article_category');
    expect(cat?.topic.id).toBe('topic:article_category:charging');
    expect(cat?.confidence).toBe('weak_category');
  });

  it('emits brand topics only from resolved editorial brand ids', () => {
    const graph = buildArticlePageGraph({
      article: {
        id: 'art1',
        title: 'Guide',
        relationships: { relatedBrandIds: ['tata', 'missing-brand'] }
      },
      brands: [{ id: 'tata', name: 'Tata Motors' }]
    });
    const topics = deriveTopicsFromGraph(graph, {
      pageKind: 'article',
      article: {
        id: 'art1',
        title: 'Guide',
        relationships: { relatedBrandIds: ['tata', 'missing-brand'] }
      },
      brands: [{ id: 'tata', name: 'Tata Motors' }]
    });
    expect(topics.some((t) => t.topic.id === 'topic:brand:tata')).toBe(true);
    expect(topics.some((t) => t.topic.id === 'topic:brand:missing-brand')).toBe(false);
  });

  it('adds energy hub only when charging/chemistry facet evidence exists', () => {
    const withPort = buildArticlePageGraph({
      article: {
        id: 'art1',
        title: 'Charging guide',
        relationships: { relatedVehicleIds: ['v1'] }
      },
      editorialVehicles: [
        {
          id: 'v1',
          brandName: 'Tata Motors',
          parentModel: 'Nexon EV',
          charging: { portType: 'CCS2' }
        } as never
      ]
    });
    // Facets attach on vehicle graph hosts; article graph may not attach facets from editorial vehicles.
    // Seed a facet node + edge to prove the rule without inventing from title.
    withPort.nodes.push({
      type: 'facet',
      id: 'facet:portType:ccs2',
      name: 'CCS2',
      attrs: { facetKind: 'portType', value: 'CCS2' }
    });
    withPort.edges.push({
      type: 'has_facet',
      from: { type: 'variant', id: 'variant:v1' },
      to: { type: 'facet', id: 'facet:portType:ccs2' },
      source: 'derived'
    });

    const topics = deriveTopicsFromGraph(withPort, {
      pageKind: 'article',
      article: { id: 'art1', title: 'Charging guide' }
    });
    expect(topics.some((t) => t.topic.id === 'topic:site_hub:energy')).toBe(true);

    const plain = buildArticlePageGraph({
      article: { id: 'art2', title: 'News', relationships: {} }
    });
    const plainTopics = deriveTopicsFromGraph(plain, {
      pageKind: 'article',
      article: { id: 'art2', title: 'News' }
    });
    expect(plainTopics.some((t) => t.topic.id === 'topic:site_hub:energy')).toBe(false);
  });

  it('caps topics at ≤8', () => {
    const graph = buildVehiclePageGraph({
      brand,
      variants: [
        {
          ...variants[0],
          bodyStyle: 'SUV',
          battery: { chemistry: 'LFP' },
          charging: { portType: 'CCS2' },
          performance: { drivetrain: 'AWD' }
        } as never
      ],
      selectedVariant: {
        ...variants[0],
        bodyStyle: 'SUV',
        battery: { chemistry: 'LFP' },
        charging: { portType: 'CCS2' },
        performance: { drivetrain: 'AWD' }
      } as never
    });
    const topics = deriveTopicsFromGraph(graph, {
      pageKind: 'vehicle',
      selectedVariantId: 'v1'
    });
    expect(topics.length).toBeLessThanOrEqual(8);
  });
});
