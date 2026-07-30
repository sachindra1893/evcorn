import { assertArticleUpdateTarget, hydrateArticleBlocks, resolveArticleId, upsertArticleInList } from './article-edit.util';
import { ArticleBlock } from '../../models/blocks.model';

describe('article-edit.util', () => {
  describe('resolveArticleId', () => {
    it('prefers id and accepts _id fallback', () => {
      expect(resolveArticleId({ id: 'abc' })).toBe('abc');
      expect(resolveArticleId({ _id: 'mongo1' })).toBe('mongo1');
      expect(resolveArticleId({ id: 'keep', _id: 'other' })).toBe('keep');
    });

    it('rejects missing or blank ids', () => {
      expect(resolveArticleId(null)).toBeNull();
      expect(resolveArticleId({})).toBeNull();
      expect(resolveArticleId({ id: '' })).toBeNull();
      expect(resolveArticleId({ id: '   ' })).toBeNull();
    });
  });

  describe('hydrateArticleBlocks', () => {
    it('deserializes __EVBLOCKS__ from paragraphs like article-detail', () => {
      const blocks: ArticleBlock[] = [
        { type: 'paragraph', id: 'p1', data: { text: 'Hello EV world' } },
        { type: 'heading', id: 'h1', data: { level: 2, text: 'Range' } }
      ];
      const art = {
        blocks: [] as ArticleBlock[],
        paragraphs: [`__EVBLOCKS__${JSON.stringify(blocks)}`, 'fallback unused']
      };

      const hydrated = hydrateArticleBlocks(art);
      expect(hydrated).toEqual(blocks);
      expect(hydrated).not.toBe(blocks);
    });

    it('uses explicit blocks when present', () => {
      const blocks: ArticleBlock[] = [{ type: 'paragraph', id: 'x', data: { text: 'Direct' } }];
      expect(hydrateArticleBlocks({ blocks, paragraphs: ['ignored'] })).toEqual(blocks);
    });

    it('falls back to plain paragraph migration', () => {
      const hydrated = hydrateArticleBlocks({ paragraphs: ['One', 'Two'] });
      expect(hydrated).toHaveLength(2);
      expect(hydrated[0].type).toBe('paragraph');
      expect((hydrated[0].data as { text: string }).text).toBe('One');
    });
  });

  describe('assertArticleUpdateTarget', () => {
    it('requires update (not create) when edit mode is active', () => {
      expect(assertArticleUpdateTarget(true, 'art-1')).toEqual({ ok: true, id: 'art-1' });
      const lost = assertArticleUpdateTarget(true, null);
      expect(lost.ok).toBe(false);
      if (!lost.ok) {
        expect(lost.reason).toMatch(/refusing to create a duplicate/i);
      }
    });

    it('signals not-editing so caller can POST create', () => {
      expect(assertArticleUpdateTarget(false, null)).toEqual({ ok: false, reason: 'not-editing' });
    });
  });

  describe('upsertArticleInList', () => {
    it('replaces the matching article so list title updates after PUT', () => {
      const list = [
        { id: 'a1', title: 'Old Title', description: 'keep-me' },
        { id: 'a2', title: 'Other' }
      ];
      const next = upsertArticleInList(list, { id: 'a1', title: 'New Title' });
      expect(next[0]).toEqual({ id: 'a1', title: 'New Title', description: 'keep-me' });
      expect(next[1].title).toBe('Other');
      expect(next).not.toBe(list);
    });

    it('matches by _id and prepends unknown ids', () => {
      const byMongo = upsertArticleInList(
        [{ _id: 'm1', title: 'Before' }],
        { id: 'm1', title: 'After' }
      );
      expect(byMongo).toEqual([{ _id: 'm1', id: 'm1', title: 'After' }]);

      const prepended = upsertArticleInList([{ id: 'x', title: 'Existing' }], {
        id: 'new',
        title: 'Fresh'
      });
      expect(prepended[0]).toEqual({ id: 'new', title: 'Fresh' });
      expect(prepended).toHaveLength(2);
    });
  });
});
