import { describe, it, expect } from 'vitest';
import { buildArticlePageGraph, buildVehiclePageGraph } from '../entity/entity-graph';
import {
  buildRelatedReadingPlan,
  linkSuggestionsFromRelatedReading
} from './related-reading';
import { deriveTopicsFromGraph } from './topic-derive';

describe('related-reading', () => {
  const brand = { id: 'tata', name: 'Tata Motors' };
  const variants = [
    {
      id: 'v1',
      categoryId: 'tata',
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV'
    }
  ];

  it('preserves RecommendationService order for related vehicles/articles', () => {
    const recommendedVehicles = [
      { id: 'r0', brandName: 'MG', parentModel: 'ZS EV', categoryId: 'mg' },
      { id: 'r1', brandName: 'Mahindra', parentModel: 'XUV400', categoryId: 'mahindra' },
      { id: 'r2', brandName: 'Tata Motors', parentModel: 'Punch EV', categoryId: 'tata' }
    ];
    const recommendedArticles = [
      { id: 'a0', title: 'First' },
      { id: 'a1', title: 'Second' },
      { id: 'a2', title: 'Third' }
    ];

    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0],
      recommendedVehicles,
      recommendedArticles
    });
    const topics = deriveTopicsFromGraph(graph, { pageKind: 'vehicle' });
    const plan = buildRelatedReadingPlan(graph, topics, { excludeVehicleId: 'v1' });

    expect(plan.vehicles.map((v) => v.item.id)).toEqual(['r0', 'r1', 'r2']);
    expect(plan.articles.map((a) => a.item.id)).toEqual(['a0', 'a1', 'a2']);
    expect(plan.vehicles[0].evidence.source).toBe('recommendation');
    expect(plan.vehicles.every((v) => v.evidence.refs.length > 0)).toBe(true);
  });

  it('labels editorial relationships when present (does not reorder)', () => {
    const graph = buildArticlePageGraph({
      article: {
        id: 'art1',
        title: 'Review',
        relationships: {
          relatedVehicleIds: ['v-edit', 'v-edit-2'],
          relatedArticleIds: ['art-edit']
        }
      },
      editorialVehicles: [
        { id: 'v-edit', brandName: 'Tata Motors', parentModel: 'Nexon EV', categoryId: 'tata' },
        { id: 'v-edit-2', brandName: 'MG', parentModel: 'ZS EV', categoryId: 'mg' }
      ],
      editorialArticles: [{ id: 'art-edit', title: 'Editorial related' }],
      recommendedVehicles: [{ id: 'v-rec', brandName: 'Other', parentModel: 'X' }],
      recommendedArticles: [{ id: 'art-rec', title: 'Rec' }]
    });
    const topics = deriveTopicsFromGraph(graph, {
      pageKind: 'article',
      article: {
        id: 'art1',
        title: 'Review',
        relationships: {
          relatedVehicleIds: ['v-edit', 'v-edit-2'],
          relatedArticleIds: ['art-edit']
        }
      },
      brands: [{ id: 'tata', name: 'Tata Motors' }]
    });
    const plan = buildRelatedReadingPlan(graph, topics);

    expect(plan.vehicles.map((v) => v.item.id)).toEqual(['v-edit', 'v-edit-2']);
    expect(plan.articles.map((a) => a.item.id)).toEqual(['art-edit']);
    expect(plan.vehicles[0].evidence.source).toBe('editorial_relationship');
    expect(plan.vehicles[0].reason).toContain('editor');
  });

  it('emits canonical LinkSuggestions preserving RecommendationService order', () => {
    const recommendedVehicles = [
      { id: 'r0', brandName: 'MG', parentModel: 'ZS EV', categoryId: 'mg' },
      { id: 'r1', brandName: 'Mahindra', parentModel: 'XUV400', categoryId: 'mahindra' }
    ];
    const recommendedArticles = [
      { id: 'a0', title: 'First' },
      { id: 'a1', title: 'Second' }
    ];
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0],
      recommendedVehicles,
      recommendedArticles
    });
    const plan = buildRelatedReadingPlan(graph, [], { excludeVehicleId: 'v1' });
    const links = linkSuggestionsFromRelatedReading(plan);
    const ids = links.map((l) => l.targetEntityId);

    // Vehicles then articles (RecommendationService order), then compares — no entity dupes
    expect(ids.slice(0, 4)).toEqual([
      'variant:r0',
      'variant:r1',
      'article:a0',
      'article:a1'
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(links.every((l) => l.href.startsWith('/') && !!l.targetEntityId)).toBe(true);
  });

  it('caps related vehicles ≤6 and articles ≤4', () => {
    const recommendedVehicles = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      brandName: 'MG',
      parentModel: `M${i}`,
      categoryId: 'mg'
    }));
    const recommendedArticles = Array.from({ length: 8 }, (_, i) => ({
      id: `a${i}`,
      title: `A${i}`
    }));
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0],
      recommendedVehicles,
      recommendedArticles
    });
    const plan = buildRelatedReadingPlan(graph, []);
    expect(plan.vehicles.length).toBeLessThanOrEqual(6);
    expect(plan.articles.length).toBeLessThanOrEqual(4);
  });
});
