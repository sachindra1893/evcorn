import {
  collectRelatedArticleIds,
  generateRelatedArticles
} from './related-article.generator';

describe('RelatedArticleGenerator', () => {
  it('maps DTOs and excludes current article', () => {
    const out = generateRelatedArticles(
      [
        { id: 'a1', title: 'One' },
        { id: 'a2', title: 'Two' },
        { id: 'a1', title: 'One dup' }
      ],
      { excludeId: 'a1' }
    );
    expect(out).toEqual([{ id: 'a2', title: 'Two', href: '/articles/a2' }]);
  });

  it('collects relationship + related-block ids', () => {
    const ids = collectRelatedArticleIds(['x'], [
      { type: 'related', data: { articleIds: ['y', 'x'] } },
      { type: 'paragraph', data: { text: 'nope' } }
    ]);
    expect(ids).toEqual(['x', 'y']);
  });
});
