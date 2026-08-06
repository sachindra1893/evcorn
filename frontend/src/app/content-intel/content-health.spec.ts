import { describe, it, expect } from 'vitest';
import { deriveContentHealth } from './content-health';
import type {
  FreshnessSignal,
  RelatedReadingPlan,
  TopicMembership
} from './content-intel.types';

describe('content-health (Phase 7.4 M3)', () => {
  const freshness = (over: Partial<FreshnessSignal> = {}): FreshnessSignal => ({
    state: 'fresh',
    reasons: ['updatedAt ≤ 90d'],
    lastUpdated: '2026-07-20T00:00:00.000Z',
    ...over
  });

  const groundedTopic: TopicMembership = {
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

  const weakTopic: TopicMembership = {
    topic: {
      id: 'topic:article_category:news',
      kind: 'article_category',
      label: 'news',
      entityIds: []
    },
    confidence: 'weak_category',
    evidenceRefs: ['article.categoryId']
  };

  const planWith = (over: Partial<RelatedReadingPlan> = {}): RelatedReadingPlan => ({
    vehicles: [],
    articles: [],
    comparisons: [],
    ...over
  });

  const populatedPlan = (): RelatedReadingPlan =>
    planWith({
      vehicles: [
        {
          item: { id: 'v2', name: 'MG ZS EV', href: '/ev/mg/zs-ev' },
          topicLabels: [],
          evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
        }
      ]
    });

  it('reports healthy when fresh, grounded, and connected', () => {
    const health = deriveContentHealth({
      entityId: 'model:tata:nexon-ev',
      freshness: freshness(),
      topics: [groundedTopic],
      relatedReading: populatedPlan()
    });
    expect(health.state).toBe('healthy');
    expect(health.signals.map((s) => s.kind)).toEqual(['recently_updated']);
    expect(health.entityId).toBe('model:tata:nexon-ev');
  });

  it('flags stale content from freshness only', () => {
    const health = deriveContentHealth({
      entityId: 'model:tata:nexon-ev',
      freshness: freshness({ state: 'stale', reasons: ['updatedAt > 180d'] }),
      topics: [groundedTopic],
      relatedReading: populatedPlan()
    });
    expect(health.state).toBe('attention');
    const stale = health.signals.find((s) => s.kind === 'stale');
    expect(stale?.evidenceRefs).toContain('freshness.state=stale');
    expect(stale?.evidenceRefs).toContain('updatedAt > 180d');
  });

  it('flags missing editorial relationships on article pages only', () => {
    const article = deriveContentHealth({
      entityId: 'article:a1',
      freshness: freshness(),
      topics: [groundedTopic],
      relatedReading: populatedPlan(),
      relationships: {},
      supportsEditorialRelationships: true
    });
    expect(article.signals.map((s) => s.kind)).toContain('missing_relationships');

    const vehicle = deriveContentHealth({
      entityId: 'model:tata:nexon-ev',
      freshness: freshness(),
      topics: [groundedTopic],
      relatedReading: populatedPlan(),
      relationships: {},
      supportsEditorialRelationships: false
    });
    expect(vehicle.signals.map((s) => s.kind)).not.toContain('missing_relationships');
  });

  it('does not flag relationships that exist', () => {
    const health = deriveContentHealth({
      entityId: 'article:a1',
      freshness: freshness(),
      topics: [groundedTopic],
      relatedReading: populatedPlan(),
      relationships: { relatedVehicleIds: ['v1'] },
      supportsEditorialRelationships: true
    });
    expect(health.signals.map((s) => s.kind)).not.toContain('missing_relationships');
  });

  it('flags weak coverage when no grounded topic resolves', () => {
    const health = deriveContentHealth({
      entityId: 'article:a1',
      freshness: freshness(),
      topics: [weakTopic],
      relatedReading: populatedPlan()
    });
    expect(health.signals.map((s) => s.kind)).toContain('weak_coverage');
    expect(health.state).toBe('attention');
  });

  it('detects orphan content and escalates to at_risk', () => {
    const health = deriveContentHealth({
      entityId: 'article:a1',
      freshness: freshness(),
      topics: [groundedTopic],
      relatedReading: planWith()
    });
    expect(health.signals.map((s) => s.kind)).toContain('orphan');
    expect(health.state).toBe('at_risk');
  });

  it('escalates stale + missing relationships to at_risk', () => {
    const health = deriveContentHealth({
      entityId: 'article:a1',
      freshness: freshness({ state: 'stale', reasons: ['updatedAt > 180d'] }),
      topics: [groundedTopic],
      relatedReading: populatedPlan(),
      relationships: {},
      supportsEditorialRelationships: true
    });
    expect(health.state).toBe('at_risk');
  });

  it('returns an empty report for missing input instead of throwing', () => {
    expect(deriveContentHealth(null).state).toBe('healthy');
    expect(deriveContentHealth(null).signals).toEqual([]);
    expect(deriveContentHealth(undefined).entityId).toBe('');
  });
});
