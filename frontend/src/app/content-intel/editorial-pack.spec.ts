import { buildArticlePageGraph, buildVehiclePageGraph } from '../entity/entity-graph';
import { modelEntityId } from '../entity/entity-id';
import { modelHref } from '../entity/entity-href';
import { describe, it, expect, beforeEach } from 'vitest';
import { clearContentIntelCache } from './content-intel-cache';
import {
  buildArticleContentIntel,
  buildVehicleContentIntel
} from './content-intel-engine';
import {
  CONTENT_INTEL_RELATED_VEHICLES_MAX,
  EDITORIAL_RECOMMENDATIONS_MAX,
  EDITORIAL_SUGGEST_BRANDS_MAX,
  EDITORIAL_WARNINGS_MAX,
  emptyContentIntelPageModel
} from './content-intel.types';
import {
  buildEditorialRecoPack,
  safeBuildEditorialRecoPack
} from './editorial-pack';

describe('editorial-pack (Phase 7.4 M3)', () => {
  beforeEach(() => clearContentIntelCache());

  const brand = { id: 'tata', name: 'Tata Motors' };
  const selected = {
    id: 'v1',
    categoryId: 'tata',
    brandName: 'Tata Motors',
    parentModel: 'Nexon EV',
    bodyStyle: 'SUV',
    updatedAt: '2026-07-10T00:00:00.000Z'
  };

  function vehicleModel(
    over: {
      recommendedVehicles?: any[];
      recommendedArticles?: any[];
      now?: string;
    } = {}
  ) {
    const recommendedVehicles = over.recommendedVehicles ?? [
      { id: 'r0', brandName: 'MG', parentModel: 'ZS EV', categoryId: 'mg' }
    ];
    const recommendedArticles = over.recommendedArticles ?? [
      { id: 'a0', title: 'Nexon EV guide' }
    ];
    const graph = buildVehiclePageGraph({
      brand,
      variants: [selected],
      selectedVariant: selected,
      recommendedVehicles,
      recommendedArticles
    });
    const model = buildVehicleContentIntel({
      entityGraph: graph,
      brand,
      modelEntityId: modelEntityId('tata', selected)!,
      modelHref: modelHref({ brandName: 'Tata Motors', parentModel: 'Nexon EV' })!,
      variants: [selected],
      selectedVariant: selected,
      recommendedVehicles,
      recommendedArticles,
      now: over.now ?? '2026-08-01T00:00:00.000Z'
    });
    return { graph, model };
  }

  it('builds a pack whose every recommendation is evidence-backed', () => {
    const { graph, model } = vehicleModel();
    const pack = buildEditorialRecoPack({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      model,
      graph
    });

    expect(pack.recommendations.length).toBeGreaterThan(0);
    for (const reco of pack.recommendations) {
      expect(reco.affectedEntityId.trim()).not.toBe('');
      expect(reco.evidence.refs.length).toBeGreaterThan(0);
      expect(reco.evidence.source).toBeTruthy();
      expect(['high', 'medium', 'low']).toContain(reco.confidence);
      expect(reco.suggestedAction.trim()).not.toBe('');
      expect(reco.id.startsWith('reco:')).toBe(true);
    }
  });

  it('never emits duplicate recommendations', () => {
    const { graph, model } = vehicleModel({
      recommendedArticles: [],
      recommendedVehicles: []
    });
    const pack = buildEditorialRecoPack({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      model,
      graph
    });
    const ids = pack.recommendations.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(EDITORIAL_RECOMMENDATIONS_MAX);
  });

  it('suggests related ids in RecommendationService order without re-ranking', () => {
    const recommendedVehicles = [
      { id: 'r0', brandName: 'MG', parentModel: 'ZS EV', categoryId: 'mg' },
      { id: 'r1', brandName: 'Mahindra', parentModel: 'XUV400', categoryId: 'mahindra' }
    ];
    const { graph, model } = vehicleModel({ recommendedVehicles });
    const pack = buildEditorialRecoPack({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      model,
      graph
    });

    expect(pack.suggestRelatedVehicleIds).toEqual(
      model.relatedReading.vehicles.map((v) => v.item.id)
    );
    expect(pack.suggestRelatedVehicleIds).toEqual(['r0', 'r1']);
    expect(pack.suggestRelatedVehicleIds.length).toBeLessThanOrEqual(
      CONTENT_INTEL_RELATED_VEHICLES_MAX
    );
    expect(pack.suggestRelatedBrandIds).toEqual(['mg', 'mahindra']);
    expect(pack.suggestRelatedBrandIds.length).toBeLessThanOrEqual(
      EDITORIAL_SUGGEST_BRANDS_MAX
    );
  });

  it('never proposes a relationship the editor has already set', () => {
    const article = {
      id: 'art-4',
      title: 'Windsor deep dive',
      categoryId: 'reviews',
      updatedAt: '2026-07-20T00:00:00.000Z',
      relationships: { relatedArticleIds: ['a-existing'] }
    };
    const graph = buildArticlePageGraph({
      article,
      editorialArticles: [{ id: 'a-existing', title: 'Already linked' }]
    });
    const model = buildArticleContentIntel({
      entityGraph: graph,
      article,
      now: '2026-08-01T00:00:00.000Z'
    });

    // The existing relationship is on the page…
    expect(model.relatedReading.articles.map((a) => a.item.id)).toContain('a-existing');

    // …but it is not offered back to the editor as something to add.
    const pack = buildEditorialRecoPack({
      pageKind: 'article',
      entityId: 'article:art-4',
      model,
      graph,
      relationships: article.relationships
    });
    expect(pack.suggestRelatedArticleIds).not.toContain('a-existing');

    const allSuggested = [
      ...pack.suggestRelatedArticleIds,
      ...pack.suggestRelatedVehicleIds,
      ...pack.suggestRelatedBrandIds
    ];
    expect(new Set(allSuggested).size).toBe(allSuggested.length);
  });

  it('keeps editorial relationships authoritative over recommendations', () => {
    const article = {
      id: 'art-1',
      title: 'Windsor vs Punch',
      categoryId: 'comparisons',
      updatedAt: '2026-07-20T00:00:00.000Z',
      relationships: { relatedArticleIds: ['a-editorial'] }
    };
    // Graph contract: editorial ids win; recommendations are the fallback slate.
    const graph = buildArticlePageGraph({
      article,
      editorialArticles: [{ id: 'a-editorial', title: 'Editorial pick' }],
      recommendedArticles: [{ id: 'a-recommended', title: 'Recommended pick' }]
    });
    const model = buildArticleContentIntel({
      entityGraph: graph,
      article,
      recommendedArticles: [
        { id: 'a-editorial', title: 'Editorial pick' },
        { id: 'a-recommended', title: 'Recommended pick' }
      ],
      now: '2026-08-01T00:00:00.000Z'
    });

    const editorialRow = model.relatedReading.articles.find(
      (r) => r.item.id === 'a-editorial'
    );
    expect(editorialRow?.evidence.source).toBe('editorial_relationship');

    const pack = buildEditorialRecoPack({
      pageKind: 'article',
      entityId: 'article:art-1',
      model,
      graph,
      relationships: article.relationships
    });

    // Editorial ids are already authoritative — no "missing relationships" advice.
    expect(pack.health.signals.map((s) => s.kind)).not.toContain('missing_relationships');
    expect(pack.recommendations.some((r) => r.kind === 'missing_related_vehicle')).toBe(
      false
    );
  });

  it('advises adding relationships when only recommendations back the page', () => {
    const article = {
      id: 'art-2',
      title: 'News roundup',
      categoryId: 'news',
      updatedAt: '2026-07-20T00:00:00.000Z'
    };
    const graph = buildArticlePageGraph({
      article,
      recommendedArticles: [{ id: 'a-recommended', title: 'Recommended pick' }]
    });
    const model = buildArticleContentIntel({
      entityGraph: graph,
      article,
      recommendedArticles: [{ id: 'a-recommended', title: 'Recommended pick' }],
      now: '2026-08-01T00:00:00.000Z'
    });
    const pack = buildEditorialRecoPack({
      pageKind: 'article',
      entityId: 'article:art-2',
      model,
      graph,
      relationships: undefined
    });

    expect(pack.health.signals.map((s) => s.kind)).toContain('missing_relationships');
    const reco = pack.recommendations.find((r) => r.kind === 'missing_related_vehicle');
    expect(reco?.confidence).toBe('high');
    expect(reco?.suggestedAction).toMatch(/relationships\./);
  });

  it('surfaces orphan pages through health, audit, and recommendations', () => {
    const { graph, model } = vehicleModel({
      recommendedVehicles: [],
      recommendedArticles: []
    });
    const pack = buildEditorialRecoPack({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      model,
      graph
    });

    expect(pack.health.signals.map((s) => s.kind)).toContain('orphan');
    expect(pack.health.state).toBe('at_risk');
    expect(pack.linkAudit.findings.map((f) => f.kind)).toContain('orphan_page');
    expect(pack.recommendations.some((r) => r.kind === 'missing_internal_link')).toBe(true);
  });

  it('warns about unresolved stub targets without inventing labels', () => {
    const { graph, model } = vehicleModel({
      recommendedVehicles: [{ id: 'stub-1' }]
    });
    const pack = buildEditorialRecoPack({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      model,
      graph
    });
    expect(pack.warnings.length).toBeGreaterThan(0);
    expect(pack.warnings.length).toBeLessThanOrEqual(EDITORIAL_WARNINGS_MAX);
    expect(pack.warnings.some((w) => w.includes('stub-1'))).toBe(true);
  });

  it('reports stale content from date fields only', () => {
    const { graph, model } = vehicleModel({ now: '2027-08-01T00:00:00.000Z' });
    const pack = buildEditorialRecoPack({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      model,
      graph
    });
    expect(pack.freshness.state).toBe('stale');
    const stale = pack.recommendations.find((r) => r.kind === 'stale_content');
    expect(stale?.confidence).toBe('high');
    expect(stale?.evidence.source).toBe('freshness_rule');
  });

  it('stays bounded on oversized page-local input (no catalog scan)', () => {
    const recommendedVehicles = Array.from({ length: 200 }, (_, i) => ({
      id: `rec-${i}`,
      brandName: `Brand ${i}`,
      parentModel: `Model ${i}`,
      categoryId: `brand-${i}`
    }));
    const { graph, model } = vehicleModel({ recommendedVehicles });

    const started = Date.now();
    const pack = buildEditorialRecoPack({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      model,
      graph
    });
    const elapsed = Date.now() - started;

    expect(pack.suggestRelatedVehicleIds.length).toBeLessThanOrEqual(
      CONTENT_INTEL_RELATED_VEHICLES_MAX
    );
    expect(pack.suggestRelatedBrandIds.length).toBeLessThanOrEqual(
      EDITORIAL_SUGGEST_BRANDS_MAX
    );
    expect(pack.recommendations.length).toBeLessThanOrEqual(EDITORIAL_RECOMMENDATIONS_MAX);
    expect(pack.warnings.length).toBeLessThanOrEqual(EDITORIAL_WARNINGS_MAX);
    expect(elapsed).toBeLessThan(250);
  });

  it('returns an empty pack instead of throwing when inputs are hostile', () => {
    const hostile = {
      get relatedReading(): never {
        throw new Error('boom');
      }
    };
    const pack = safeBuildEditorialRecoPack({
      pageKind: 'vehicle',
      entityId: 'model:tata:nexon-ev',
      model: hostile as never
    });
    expect(pack.recommendations).toEqual([]);
    expect(pack.health.state).toBe('healthy');
    expect(pack.health.entityId).toBe('model:tata:nexon-ev');
    expect(pack.linkAudit.findings).toEqual([]);
    expect(pack.gaps.gaps).toEqual([]);

    expect(
      buildEditorialRecoPack({
        pageKind: 'vehicle',
        entityId: '',
        model: emptyContentIntelPageModel()
      }).recommendations
    ).toEqual([]);
  });

  it('is never attached by the public page builders', () => {
    const { model } = vehicleModel();
    expect(model.editorial).toBeUndefined();

    const article = { id: 'art-3', title: 'Guide', categoryId: 'guides' };
    const articleModel = buildArticleContentIntel({
      entityGraph: buildArticlePageGraph({ article }),
      article,
      now: '2026-08-01T00:00:00.000Z'
    });
    expect(articleModel.editorial).toBeUndefined();
  });
});
