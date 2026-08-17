/**
 * Article Timestamp & Edit Verification Unit Test Suite
 */
const articleRepository = require('../../repositories/article.repository');
const { toArticleDTO } = require('../../dto/article.dto');

describe('Article Published and Updated Timestamps', () => {
  it('preserves creation date and updates updatedAt on article edit', async () => {
    // 1. Create initial article
    const initialArticle = await articleRepository.create({
      title: 'Original Article Title',
      description: 'Original Description',
      paragraphs: ['Paragraph 1'],
      publishAt: '2026-01-01T10:00:00.000Z',
      createdAt: '2026-01-01T10:00:00.000Z'
    });

    expect(initialArticle.id).toBeDefined();
    const initialDto = toArticleDTO(initialArticle);
    expect(initialDto.createdAt).toBe('2026-01-01T10:00:00.000Z');

    // 2. Perform edit/update on article content
    const updatedArticle = await articleRepository.update(initialArticle.id, {
      description: 'Updated Description Content'
    });

    const updatedDto = toArticleDTO(updatedArticle);

    // 3. Verify creation date is PRESERVED, and updatedAt is updated to recent timestamp
    expect(updatedDto.createdAt).toBe('2026-01-01T10:00:00.000Z');
    expect(updatedDto.updatedAt).toBeDefined();
    expect(new Date(updatedDto.updatedAt).getTime()).toBeGreaterThan(new Date('2026-01-01T10:00:00.000Z').getTime());
  });
});
