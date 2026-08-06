import { describe, it, expect, beforeEach } from 'vitest';
import { buildVehicleContentIntel } from './content-intel-engine';
import { clearContentIntelCache } from './content-intel-cache';
import { buildVehiclePageGraph } from '../entity/entity-graph';
import { modelEntityId } from '../entity/entity-id';
import { modelHref } from '../entity/entity-href';
import type { LinkSuggestion, RelatedReadingPlan } from './content-intel.types';
import { emptyContentIntelPageModel } from './content-intel.types';
import {
  EXPLORE_LINKS_MAX,
  buildTopicNav,
  exploreLinksForPage,
  mergeExploreLinks,
  relatedReadingLabelMap
} from './page-nav';

describe('page-nav (Phase 7.4 M2)', () => {
  beforeEach(() => clearContentIntelCache());

  const aeoLinks = [
    { label: 'All Tata Motors EVs', href: '/evs?category=tata-motors' },
    { label: 'Compare this EV', href: '/compare?ids=v1' },
    { label: 'EV articles & guides', href: '/articles' },
    { label: 'EVCorn FAQs', href: '/faqs' }
  ];

  const hubLinks: LinkSuggestion[] = [
    {
      label: 'All Tata Motors EVs',
      href: '/evs?category=tata-motors',
      targetEntityId: 'brand:tata',
      relKind: 'hub',
      evidence: { source: 'structural_entity', refs: ['entity:brand'] }
    },
    {
      label: 'Energy & charging',
      href: '/energy',
      targetEntityId: 'site_hub:energy',
      relKind: 'hub',
      evidence: { source: 'hub_taxonomy', refs: ['site_hub:energy'] }
    },
    {
      label: 'Related EV dup',
      href: '/ev/mg/zs-ev',
      targetEntityId: 'model:mg:zs-ev',
      relKind: 'hub',
      evidence: { source: 'hub_taxonomy', refs: ['x'] }
    },
    {
      label: 'No evidence',
      href: '/orphan',
      targetEntityId: 'site_hub:orphan',
      relKind: 'hub',
      evidence: { source: 'hub_taxonomy', refs: [] }
    },
    {
      label: 'Contextual should skip',
      href: '/articles/a0',
      targetEntityId: 'article:a0',
      relKind: 'related_reading',
      evidence: { source: 'recommendation', refs: ['RecommendationService'] }
    }
  ];

  it('merges hub links into Explore without duplicating destinations', () => {
    const merged = mergeExploreLinks(aeoLinks, hubLinks, {
      excludeHrefs: ['/ev/mg/zs-ev', '/articles/a0']
    });
    expect(merged.map((l) => l.href)).toEqual([
      '/evs?category=tata-motors',
      '/compare?ids=v1',
      '/articles',
      '/faqs',
      '/energy'
    ]);
    expect(new Set(merged.map((l) => l.href.split('?')[0])).size).toBe(
      new Set(merged.map((l) => l.href.split('?')[0])).size
    );
    expect(merged.some((l) => l.href === '/ev/mg/zs-ev')).toBe(false);
    expect(merged.some((l) => l.href === '/articles/a0')).toBe(false);
    expect(merged.some((l) => l.label === 'No evidence')).toBe(false);
    expect(merged.some((l) => l.label === 'Contextual should skip')).toBe(false);
  });

  it('treats query strings as distinct destinations', () => {
    // A Related comparison must not evict the Explore compare deep-link (different ids).
    const merged = mergeExploreLinks(aeoLinks, hubLinks, {
      excludeHrefs: ['/compare?ids=v1,peer', '/ev/mg/zs-ev']
    });
    expect(merged.some((l) => l.href === '/compare?ids=v1')).toBe(true);

    const brandHubs: LinkSuggestion[] = [
      {
        label: 'All MG EVs',
        href: '/evs?category=mg',
        targetEntityId: 'brand:mg',
        relKind: 'hub',
        evidence: { source: 'structural_entity', refs: ['entity:brand'] }
      }
    ];
    const brands = mergeExploreLinks(aeoLinks, brandHubs);
    expect(brands.some((l) => l.href === '/evs?category=tata-motors')).toBe(true);
    expect(brands.some((l) => l.href === '/evs?category=mg')).toBe(true);

    // Exact-href exclusion still wins.
    const excluded = mergeExploreLinks(aeoLinks, hubLinks, {
      excludeHrefs: ['/compare?ids=v1']
    });
    expect(excluded.some((l) => l.href === '/compare?ids=v1')).toBe(false);
  });

  it('preserves AEO Internal Links order and respects explore cap', () => {
    const manyHubs: LinkSuggestion[] = Array.from({ length: 20 }, (_, i) => ({
      label: `Hub ${i}`,
      href: `/hub-${i}`,
      targetEntityId: `site_hub:h${i}`,
      relKind: 'hub' as const,
      evidence: { source: 'hub_taxonomy' as const, refs: [`h${i}`] }
    }));
    const merged = mergeExploreLinks(aeoLinks, manyHubs);
    expect(merged.length).toBe(EXPLORE_LINKS_MAX);
    expect(merged.slice(0, aeoLinks.length)).toEqual(aeoLinks);
  });

  it('failure isolation — exploreLinksForPage falls back to AEO links', () => {
    const fallback = exploreLinksForPage(aeoLinks, null);
    expect(fallback).toEqual(aeoLinks);
  });

  it('failure isolation — an empty CI model leaves AEO chrome fully intact', () => {
    const empty = emptyContentIntelPageModel();

    // Explore keeps every AEO Internal Link, in order.
    expect(exploreLinksForPage(aeoLinks, empty.hubLinks)).toEqual(aeoLinks);
    expect(
      exploreLinksForPage(aeoLinks, empty.hubLinks, ['/ev/mg/zs-ev'])
    ).toEqual(aeoLinks);

    // Topic nav collapses rather than rendering a heading with no links.
    expect(buildTopicNav(empty)).toEqual([]);

    // Related* rows get no labels, so the views fall back to plain cards.
    const labels = relatedReadingLabelMap(empty.relatedReading);
    expect(labels).toEqual({ vehicles: {}, articles: {} });
  });

  it('builds RelatedReading labels without inventing a second Related* list', () => {
    const plan: RelatedReadingPlan = {
      vehicles: [
        {
          item: {
            id: 'r0',
            name: 'MG ZS EV',
            href: '/ev/mg/zs-ev',
            brandName: 'MG'
          },
          topicLabels: ['SUV'],
          evidence: { source: 'recommendation', refs: ['RecommendationService'] },
          reason: 'Recommended in the same category'
        }
      ],
      articles: [
        {
          item: { id: 'a0', title: 'Guide', href: '/articles/a0' },
          topicLabels: [],
          evidence: {
            source: 'editorial_relationship',
            refs: ['relationships.relatedArticleIds']
          },
          reason: 'Linked by editor to this guide'
        }
      ],
      comparisons: []
    };
    const map = relatedReadingLabelMap(plan);
    expect(map.vehicles['r0'].reason).toBe('Recommended in the same category');
    expect(map.vehicles['r0'].topicLabels).toEqual(['SUV']);
    expect(map.articles['a0'].reason).toBe('Linked by editor to this guide');
    // Contract: label map is keyed lookup only — not a renderable Related* section
    expect(Object.keys(map.vehicles)).toEqual(['r0']);
    expect(Object.keys(map.articles)).toEqual(['a0']);
  });

  it('topic nav only includes evidence-backed items with real hrefs', () => {
    const brand = { id: 'tata', name: 'Tata Motors' };
    const selected = {
      id: 'v1',
      categoryId: 'tata',
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV',
      bodyStyle: 'SUV',
      updatedAt: '2026-07-10T00:00:00.000Z'
    };
    const recommendedVehicles = [
      { id: 'r0', brandName: 'MG', parentModel: 'ZS EV', categoryId: 'mg' }
    ];
    const graph = buildVehiclePageGraph({
      brand,
      variants: [selected],
      selectedVariant: selected,
      recommendedVehicles,
      recommendedArticles: [{ id: 'a0', title: 'Guide' }]
    });
    const mid = modelEntityId('tata', selected)!;
    const mhref = modelHref({ brandName: 'Tata Motors', parentModel: 'Nexon EV' })!;
    const model = buildVehicleContentIntel({
      entityGraph: graph,
      brand,
      modelEntityId: mid,
      modelHref: mhref,
      variants: [selected],
      selectedVariant: selected,
      recommendedVehicles,
      recommendedArticles: [{ id: 'a0', title: 'Guide' }],
      now: '2026-08-01T00:00:00.000Z'
    });

    const nav = buildTopicNav(model);
    expect(nav.length).toBeGreaterThan(0);
    expect(nav.every((n) => n.href.startsWith('/') && n.evidenceRefs.length > 0)).toBe(
      true
    );
    expect(nav.every((n) => !!n.label.trim())).toBe(true);
    // No invented placeholder topics
    expect(nav.some((n) => /placeholder|todo|coming soon/i.test(n.label))).toBe(false);

    // Hub merge with live CI model — no duplicate Related* destinations in Explore
    const relatedHrefs = model.relatedReading.vehicles.map((v) => v.item.href);
    const explore = mergeExploreLinks(
      [{ label: 'EVCorn FAQs', href: '/faqs' }],
      model.hubLinks,
      { excludeHrefs: relatedHrefs }
    );
    expect(explore.every((l) => !relatedHrefs.includes(l.href))).toBe(true);
    expect(new Set(explore.map((l) => l.href)).size).toBe(explore.length);

    // RecommendationService order preserved in related reading (not re-ranked by CI)
    expect(model.relatedReading.vehicles.map((v) => v.item.id)).toEqual(['r0']);
  });

  it('topic nav drops destinations already shown in Related* / Explore', () => {
    const model = {
      topics: [
        {
          topic: {
            id: 'topic:model:mg:windsor-ev',
            kind: 'model' as const,
            label: 'MG Windsor EV',
            href: '/ev/mg/windsor-ev',
            entityIds: ['model:mg:windsor-ev']
          },
          confidence: 'grounded' as const,
          evidenceRefs: ['entity:model']
        },
        {
          topic: {
            id: 'topic:brand:mg',
            kind: 'brand' as const,
            label: 'MG',
            href: '/evs?category=mg',
            entityIds: ['brand:mg']
          },
          confidence: 'grounded' as const,
          evidenceRefs: ['entity:brand']
        }
      ],
      clusters: [],
      relatedReading: { vehicles: [], articles: [], comparisons: [] },
      contextualLinks: [],
      hubLinks: [],
      freshness: { state: 'unknown' as const, reasons: [] },
      evidenceSummary: []
    };

    expect(buildTopicNav(model).map((n) => n.href)).toEqual([
      '/ev/mg/windsor-ev',
      '/evs?category=mg'
    ]);

    const deduped = buildTopicNav(model, {
      excludeHrefs: ['/ev/mg/windsor-ev']
    });
    expect(deduped.map((n) => n.href)).toEqual(['/evs?category=mg']);
  });

  it('empty topic nav when model lacks evidence / hrefs', () => {
    expect(
      buildTopicNav({
        topics: [
          {
            topic: {
              id: 'topic:weak',
              kind: 'article_category',
              label: 'News',
              entityIds: []
            },
            confidence: 'weak_category',
            evidenceRefs: []
          }
        ],
        clusters: [],
        relatedReading: { vehicles: [], articles: [], comparisons: [] },
        contextualLinks: [],
        hubLinks: [],
        freshness: { state: 'unknown', reasons: [] },
        evidenceSummary: []
      })
    ).toEqual([]);
  });
});
