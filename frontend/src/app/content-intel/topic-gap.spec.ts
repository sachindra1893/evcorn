import { describe, it, expect } from 'vitest';
import type { EntityGraph } from '../entity/entity.types';
import type { RelatedReadingPlan, TopicMembership } from './content-intel.types';
import { EDITORIAL_TOPIC_GAPS_MAX } from './content-intel.types';
import { detectMissingTopics } from './topic-gap';

describe('topic-gap (Phase 7.4 M3)', () => {
  const brandTopic: TopicMembership = {
    topic: {
      id: 'topic:brand:tata',
      kind: 'brand',
      label: 'Tata Motors',
      href: '/evs?category=tata-motors',
      entityIds: ['brand:tata']
    },
    confidence: 'grounded',
    evidenceRefs: ['entity:brand']
  };

  const modelTopic: TopicMembership = {
    topic: {
      id: 'topic:model:tata:nexon-ev',
      kind: 'model',
      label: 'Nexon EV',
      href: '/ev/tata-motors/nexon-ev',
      entityIds: ['model:tata:nexon-ev']
    },
    confidence: 'grounded',
    evidenceRefs: ['entity:model']
  };

  const emptyPlan = (): RelatedReadingPlan => ({
    vehicles: [],
    articles: [],
    comparisons: []
  });

  const fullPlan = (): RelatedReadingPlan => ({
    vehicles: [],
    articles: [
      {
        item: { id: 'a1', title: 'Nexon EV buying guide', href: '/articles/a1' },
        topicLabels: [],
        evidence: { source: 'editorial_relationship', refs: ['article_about_vehicle'] }
      }
    ],
    comparisons: [
      {
        item: { label: 'Nexon EV vs ZS EV', href: '/compare?ids=v1,v2' },
        evidence: { source: 'recommendation', refs: ['compares_with'] }
      }
    ]
  });

  const graphWith = (over: Partial<EntityGraph> = {}): EntityGraph => ({
    nodes: [],
    edges: [],
    ...over
  });

  it('detects a vehicle with no article and no comparison', () => {
    const { gaps } = detectMissingTopics({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      graph: graphWith(),
      topics: [modelTopic],
      relatedReading: emptyPlan()
    });
    const kinds = gaps.map((g) => g.kind);
    expect(kinds).toContain('buying_guide');
    expect(kinds).toContain('comparison_article');

    const buying = gaps.find((g) => g.kind === 'buying_guide')!;
    expect(buying.evidenceRefs).toContain('relatedReading.articles=0');
    expect(buying.affectedEntityId).toBe('model:tata:nexon-ev');
    expect(buying.suggestedAction).toMatch(/relatedVehicleIds/);
  });

  it('does not invent gaps when coverage exists', () => {
    const { gaps } = detectMissingTopics({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      graph: graphWith({
        edges: [
          {
            type: 'article_about_brand',
            from: { type: 'article', id: 'article:a1' },
            to: { type: 'brand', id: 'brand:tata' },
            source: 'editorial'
          }
        ]
      }),
      topics: [modelTopic, brandTopic],
      relatedReading: fullPlan()
    });
    expect(gaps).toEqual([]);
  });

  it('flags a brand with no ownership article', () => {
    const { gaps } = detectMissingTopics({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      graph: graphWith(),
      topics: [brandTopic],
      relatedReading: fullPlan()
    });
    const ownership = gaps.find((g) => g.kind === 'ownership_guide');
    expect(ownership?.affectedEntityId).toBe('brand:tata');
    expect(ownership?.evidenceRefs).toContain('article_about_brand=0');
  });





  it('flags an article with no editorial links and no grounded topic', () => {
    const { gaps } = detectMissingTopics({
      pageKind: 'article',
      entityId: 'article:a1',
      graph: graphWith(),
      topics: [
        {
          topic: {
            id: 'topic:article_category:news',
            kind: 'article_category',
            label: 'news',
            entityIds: []
          },
          confidence: 'weak_category',
          evidenceRefs: ['article.categoryId']
        }
      ],
      relatedReading: fullPlan(),
      relationships: {}
    });
    const soft = gaps.find((g) => g.kind === 'editorial_links');
    expect(soft?.severity).toBe('important');
    expect(soft?.evidenceRefs).toContain('topics.confidence!=grounded');
  });

  it('caps gaps and never duplicates a kind for the same entity', () => {
    const { gaps } = detectMissingTopics({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      graph: graphWith({
        nodes: Array.from({ length: 50 }, (_, i) => ({
          type: 'facet' as const,
          id: `facet:portType:p${i}`,
          name: `P${i}`,
          attrs: { facetKind: 'portType', value: `P${i}` }
        }))
      }),
      topics: [modelTopic, brandTopic],
      relatedReading: emptyPlan()
    });
    expect(gaps.length).toBeLessThanOrEqual(EDITORIAL_TOPIC_GAPS_MAX);
    const keys = gaps.map((g) => `${g.kind}:${g.affectedEntityId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('returns no gaps for missing input instead of throwing', () => {
    expect(detectMissingTopics(null)).toEqual({ gaps: [] });
    expect(detectMissingTopics(undefined)).toEqual({ gaps: [] });
  });
});
