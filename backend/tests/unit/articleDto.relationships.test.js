const { toArticleDTO } = require('../../dto/article.dto');

describe('toArticleDTO relationships normalize', () => {
  it('emits schema *Ids keys from Mongo shape', () => {
    const dto = toArticleDTO({
      _id: 'art1',
      title: 'Guide',
      relationships: {
        relatedArticleIds: ['a1', 'a1'],
        relatedVehicleIds: ['v1'],
        relatedBrandIds: ['tata']
      }
    });
    expect(dto.relationships).toEqual({
      relatedArticleIds: ['a1'],
      relatedVehicleIds: ['v1'],
      relatedBrandIds: ['tata']
    });
    expect(dto.relationships.relatedArticles).toBeUndefined();
  });

  it('accepts historical short names and maps to *Ids', () => {
    const dto = toArticleDTO({
      id: 'art2',
      title: 'Guide',
      relationships: {
        relatedArticles: ['a9'],
        relatedVehicles: ['v9'],
        relatedBrands: ['mg']
      }
    });
    expect(dto.relationships).toEqual({
      relatedArticleIds: ['a9'],
      relatedVehicleIds: ['v9'],
      relatedBrandIds: ['mg']
    });
  });

  it('defaults to empty *Ids arrays', () => {
    const dto = toArticleDTO({ id: 'art3', title: 'Guide' });
    expect(dto.relationships).toEqual({
      relatedArticleIds: [],
      relatedVehicleIds: [],
      relatedBrandIds: []
    });
  });
});
