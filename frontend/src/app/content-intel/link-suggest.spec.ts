import { describe, it, expect } from 'vitest';
import {
  canonicalLinkSuggestions,
  mergeLinkEvidence
} from './link-canonical';
import {
  filterProvenLinkSuggestions,
  suggestContextualLinks,
  suggestHubLinks
} from './link-suggest';
import type { LinkSuggestion, RelatedReadingPlan, TopicMembership } from './content-intel.types';

describe('link-suggest', () => {
  const memberships: TopicMembership[] = [
    {
      topic: {
        id: 'topic:brand:tata',
        kind: 'brand',
        label: 'Tata Motors',
        href: '/evs?category=tata-motors',
        entityIds: ['brand:tata']
      },
      confidence: 'grounded',
      evidenceRefs: ['entity:brand']
    },
    {
      topic: {
        id: 'topic:model:tata:nexon-ev',
        kind: 'model',
        label: 'Nexon EV',
        href: '/ev/tata-motors/nexon-ev',
        entityIds: ['model:tata:nexon-ev']
      },
      confidence: 'grounded',
      evidenceRefs: ['entity:model']
    }
  ];

  it('never self-links the current model page, including via its pillar', () => {
    const selfHref = '/ev/tata-motors/nexon-ev';
    const hubs = suggestHubLinks(memberships, {
      excludeModelHref: selfHref,
      selectedVariantId: 'v1',
      pillar: {
        id: 'pillar:model:tata:nexon-ev',
        label: 'Nexon EV',
        href: selfHref,
        topicIds: ['topic:model:tata:nexon-ev']
      }
    });
    expect(hubs.some((h) => h.href === selfHref)).toBe(false);

    // A pillar pointing somewhere else is still emitted.
    const brandPillar = suggestHubLinks(memberships, {
      excludeModelHref: selfHref,
      pillar: {
        id: 'pillar:brand:tata',
        label: 'Tata Motors',
        href: '/evs?category=tata-motors',
        topicIds: ['topic:brand:tata']
      }
    });
    expect(brandPillar.some((h) => h.href === '/evs?category=tata-motors')).toBe(true);
  });

  it('builds hub links via entity-href with evidence and canonical targets', () => {
    const hubs = suggestHubLinks(memberships, {
      excludeModelHref: '/ev/tata-motors/nexon-ev',
      selectedVariantId: 'v1'
    });
    expect(hubs.length).toBeGreaterThan(0);
    expect(hubs.every((h) => h.evidence.refs.length > 0)).toBe(true);
    expect(hubs.every((h) => h.href.startsWith('/'))).toBe(true);
    expect(hubs.every((h) => !!h.targetEntityId)).toBe(true);
    expect(new Set(hubs.map((h) => h.targetEntityId)).size).toBe(hubs.length);
    // Self model overview skipped
    expect(hubs.some((h) => h.href === '/ev/tata-motors/nexon-ev')).toBe(false);
    expect(hubs.some((h) => h.href.includes('/compare'))).toBe(true);
  });

  it('discards unproven LinkSuggestions (no evidence / no href / no entityId)', () => {
    const bad: LinkSuggestion[] = [
      {
        label: 'X',
        href: '',
        targetEntityId: 'site_hub:x',
        relKind: 'hub',
        evidence: { source: 'hub_taxonomy', refs: ['x'] }
      },
      {
        label: 'Y',
        href: '/articles',
        targetEntityId: 'site_hub:articles',
        relKind: 'hub',
        evidence: { source: 'hub_taxonomy', refs: [] }
      },
      {
        label: 'No id',
        href: '/faqs',
        targetEntityId: '',
        relKind: 'hub',
        evidence: { source: 'hub_taxonomy', refs: ['site_hub:faqs'] }
      },
      {
        label: 'Z',
        href: '/faqs',
        targetEntityId: 'site_hub:faqs',
        relKind: 'hub',
        evidence: { source: 'hub_taxonomy', refs: ['site_hub:faqs'] }
      }
    ];
    const proven = filterProvenLinkSuggestions(bad);
    expect(proven).toHaveLength(1);
    expect(proven[0].href).toBe('/faqs');
    expect(proven[0].targetEntityId).toBe('site_hub:faqs');
  });

  it('contextual links preserve related slate hrefs and cap ≤8', () => {
    const relatedReading: RelatedReadingPlan = {
      vehicles: Array.from({ length: 6 }, (_, i) => ({
        item: {
          id: `r${i}`,
          name: `Peer ${i}`,
          href: `/ev/mg/model-${i}`
        },
        topicLabels: [],
        evidence: { source: 'recommendation' as const, refs: ['recommended_vehicle'] }
      })),
      articles: Array.from({ length: 4 }, (_, i) => ({
        item: { id: `a${i}`, title: `Art ${i}`, href: `/articles/a${i}` },
        topicLabels: [],
        evidence: { source: 'recommendation' as const, refs: ['recommended_article'] }
      })),
      comparisons: [
        {
          item: { label: 'A vs B', href: '/compare?ids=v1,r0' },
          evidence: { source: 'recommendation' as const, refs: ['compares_with'] }
        }
      ]
    };

    const links = suggestContextualLinks(relatedReading);
    expect(links.length).toBeLessThanOrEqual(8);
    expect(links[0].href).toBe('/ev/mg/model-0');
    expect(links[0].targetEntityId).toBe('variant:r0');
    expect(links.every((l) => l.evidence.refs.length > 0)).toBe(true);
    expect(new Set(links.map((l) => l.targetEntityId)).size).toBe(links.length);
  });

  it('dedupes contextual against excluded hub entityIds', () => {
    const relatedReading: RelatedReadingPlan = {
      vehicles: [
        {
          item: { id: 'r0', name: 'Peer', href: '/evs?category=tata-motors' },
          topicLabels: [],
          evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
        }
      ],
      articles: [],
      comparisons: []
    };
    const links = suggestContextualLinks(relatedReading, {
      excludeEntityIds: ['variant:r0']
    });
    expect(links).toHaveLength(0);
  });

  it('dedupes contextual against excluded hub hrefs (legacy)', () => {
    const relatedReading: RelatedReadingPlan = {
      vehicles: [
        {
          item: { id: 'r0', name: 'Peer', href: '/evs?category=tata-motors' },
          topicLabels: [],
          evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
        }
      ],
      articles: [],
      comparisons: []
    };
    const links = suggestContextualLinks(relatedReading, {
      excludeHrefs: ['/evs?category=tata-motors']
    });
    expect(links).toHaveLength(0);
  });
});

describe('LinkSuggestion canonicality', () => {
  it('collapses duplicate URLs into one LinkSuggestion per entity', () => {
    const suggestions: LinkSuggestion[] = [
      {
        label: 'Peer A',
        href: '/ev/mg/zs-ev',
        targetEntityId: 'variant:r0',
        relKind: 'related_reading',
        evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
      },
      {
        label: 'Peer A again',
        href: '/ev/mg/zs-ev',
        targetEntityId: 'variant:r0',
        relKind: 'related_reading',
        evidence: { source: 'editorial_relationship', refs: ['relationships.relatedVehicleIds'] }
      }
    ];
    const out = canonicalLinkSuggestions(suggestions);
    expect(out).toHaveLength(1);
    expect(out[0].href).toBe('/ev/mg/zs-ev');
    expect(out[0].targetEntityId).toBe('variant:r0');
  });

  it('collapses duplicate entityIds even when URLs differ', () => {
    const suggestions: LinkSuggestion[] = [
      {
        label: 'First href',
        href: '/ev/mg/zs-ev',
        targetEntityId: 'variant:r0',
        relKind: 'related_reading',
        evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
      },
      {
        label: 'Alt href same entity',
        href: '/ev/mg/zs-ev?ref=alt',
        targetEntityId: 'variant:r0',
        relKind: 'entity_mention',
        evidence: { source: 'shared_entity', refs: ['shared_entity'] }
      }
    ];
    const out = canonicalLinkSuggestions(suggestions);
    expect(out).toHaveLength(1);
    expect(out[0].href).toBe('/ev/mg/zs-ev');
    expect(out[0].label).toBe('First href');
  });

  it('preserves RecommendationService order after deduplication', () => {
    const orderEntityIds = ['variant:r0', 'variant:r1', 'variant:r2', 'article:a0'];
    const suggestions: LinkSuggestion[] = [
      {
        label: 'r0',
        href: '/ev/a/0',
        targetEntityId: 'variant:r0',
        relKind: 'related_reading',
        evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
      },
      {
        label: 'r1',
        href: '/ev/a/1',
        targetEntityId: 'variant:r1',
        relKind: 'related_reading',
        evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
      },
      {
        label: 'r0 dup',
        href: '/ev/a/0-alt',
        targetEntityId: 'variant:r0',
        relKind: 'related_reading',
        evidence: { source: 'editorial_relationship', refs: ['relationships.relatedVehicleIds'] }
      },
      {
        label: 'r2',
        href: '/ev/a/2',
        targetEntityId: 'variant:r2',
        relKind: 'related_reading',
        evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
      },
      {
        label: 'a0',
        href: '/articles/a0',
        targetEntityId: 'article:a0',
        relKind: 'related_reading',
        evidence: { source: 'recommendation', refs: ['recommended_article'] }
      }
    ];
    const out = canonicalLinkSuggestions(suggestions, orderEntityIds);
    expect(out.map((s) => s.targetEntityId)).toEqual([
      'variant:r0',
      'variant:r1',
      'variant:r2',
      'article:a0'
    ]);
  });

  it('merges evidence from multiple sources for the same entity', () => {
    const merged = mergeLinkEvidence(
      { source: 'recommendation', refs: ['recommended_vehicle', 'RecommendationService'] },
      {
        source: 'editorial_relationship',
        refs: ['relationships.relatedVehicleIds', 'article_about_vehicle']
      }
    );
    expect(merged.source).toBe('editorial_relationship');
    expect(merged.refs).toEqual(
      expect.arrayContaining([
        'recommended_vehicle',
        'RecommendationService',
        'relationships.relatedVehicleIds',
        'article_about_vehicle',
        'source:recommendation'
      ])
    );

    const out = canonicalLinkSuggestions([
      {
        label: 'Peer',
        href: '/ev/mg/zs-ev',
        targetEntityId: 'variant:r0',
        relKind: 'related_reading',
        evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
      },
      {
        label: 'Peer editorial',
        href: '/ev/mg/zs-ev',
        targetEntityId: 'variant:r0',
        relKind: 'related_reading',
        evidence: {
          source: 'editorial_relationship',
          refs: ['relationships.relatedVehicleIds']
        }
      }
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].evidence.source).toBe('editorial_relationship');
    expect(out[0].evidence.refs).toEqual(
      expect.arrayContaining([
        'recommended_vehicle',
        'relationships.relatedVehicleIds',
        'source:recommendation'
      ])
    );
  });

  it('never emits two LinkSuggestions for the same entity', () => {
    const relatedReading: RelatedReadingPlan = {
      vehicles: [
        {
          item: { id: 'r0', name: 'Peer', href: '/ev/mg/zs-ev' },
          topicLabels: [],
          evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
        },
        {
          item: { id: 'r0', name: 'Peer dup', href: '/ev/mg/zs-ev' },
          topicLabels: [],
          evidence: {
            source: 'editorial_relationship',
            refs: ['relationships.relatedVehicleIds']
          }
        },
        {
          item: { id: 'r1', name: 'Other', href: '/ev/mahindra/xuv400' },
          topicLabels: [],
          evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
        }
      ],
      articles: [
        {
          item: { id: 'a0', title: 'Guide', href: '/articles/a0' },
          topicLabels: [],
          evidence: { source: 'recommendation', refs: ['recommended_article'] }
        },
        {
          item: { id: 'a0', title: 'Guide again', href: '/articles/a0?x=1' },
          topicLabels: [],
          evidence: { source: 'related_block', refs: ['related_block'] }
        }
      ],
      comparisons: []
    };

    const links = suggestContextualLinks(relatedReading);
    expect(links.map((l) => l.targetEntityId)).toEqual(['variant:r0', 'variant:r1', 'article:a0']);
    expect(new Set(links.map((l) => l.targetEntityId)).size).toBe(links.length);
    expect(links[0].evidence.refs).toEqual(
      expect.arrayContaining(['recommended_vehicle', 'relationships.relatedVehicleIds'])
    );
  });
});
