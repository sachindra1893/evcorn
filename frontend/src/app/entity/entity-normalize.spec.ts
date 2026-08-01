import {
  compactArticleRelationships,
  normalizeArticleNode,
  normalizeArticleRelationships,
  normalizeBrandNode,
  normalizeModelNode,
  normalizeVariantNode
} from './entity-normalize';

describe('entity-normalize — relationships + nodes', () => {
  it('maps schema *Ids keys', () => {
    expect(
      normalizeArticleRelationships({
        relatedArticleIds: ['a1', 'a1', ' a2 '],
        relatedVehicleIds: ['v1'],
        relatedBrandIds: ['tata']
      })
    ).toEqual({
      relatedArticleIds: ['a1', 'a2'],
      relatedVehicleIds: ['v1'],
      relatedBrandIds: ['tata']
    });
  });

  it('accepts historical short names and normalizes to *Ids', () => {
    expect(
      normalizeArticleRelationships({
        relatedArticles: ['a1'],
        relatedVehicles: ['v1'],
        relatedBrands: ['tata']
      })
    ).toEqual({
      relatedArticleIds: ['a1'],
      relatedVehicleIds: ['v1'],
      relatedBrandIds: ['tata']
    });
  });

  it('prefers *Ids when both shapes are present', () => {
    expect(
      normalizeArticleRelationships({
        relatedArticleIds: ['from-ids'],
        relatedArticles: ['from-short']
      }).relatedArticleIds
    ).toEqual(['from-ids']);
  });

  it('omits empty relationship arrays when compacting', () => {
    expect(
      compactArticleRelationships({
        relatedArticleIds: [],
        relatedVehicleIds: ['v1'],
        relatedBrandIds: []
      })
    ).toEqual({ relatedVehicleIds: ['v1'] });
  });

  it('normalizes brand / model / variant / article nodes with stable ids', () => {
    const brand = normalizeBrandNode({ id: 'tata', name: 'Tata Motors' });
    expect(brand?.id).toBe('brand:tata');
    expect(brand?.href).toBe('/evs?category=tata-motors');

    const model = normalizeModelNode(
      'tata',
      { parentModel: 'Nexon EV', modelSlug: 'stale', brandName: 'Tata Motors' },
      { brandName: 'Tata Motors' }
    );
    expect(model?.id).toBe('model:tata:nexon-ev');
    expect(model?.href).toBe('/ev/tata-motors/nexon-ev');

    const variant = normalizeVariantNode({
      id: 'v1',
      categoryId: 'tata',
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV',
      variantName: 'LR',
      modelSlug: 'stale'
    });
    expect(variant?.id).toBe('variant:v1');
    expect(variant?.href).toBe('/ev/tata-motors/nexon-ev');

    const article = normalizeArticleNode({
      id: 'art-1',
      title: 'Guide',
      slug: 'guide',
      relationships: { relatedVehicles: ['v1'] }
    });
    expect(article?.id).toBe('article:art-1');
    expect(article?.href).toBe('/articles/art-1');
    expect(article?.attrs['relatedVehicleIds']).toEqual(['v1']);
    expect(article?.attrs['relatedArticleIds']).toBeUndefined();
  });
});
