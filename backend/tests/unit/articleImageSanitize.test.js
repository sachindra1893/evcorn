const {
  isDataImageUrl,
  stringContainsDataImage,
  assertNoDataImageInArticle
} = require('../../utils/articleImageSanitize');
const { BadRequestError } = require('../../errors/AppError');

describe('articleImageSanitize', () => {
  it('detects data:image URLs', () => {
    expect(isDataImageUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
    expect(isDataImageUrl('data:image/png;base64,iVBOR')).toBe(true);
    expect(isDataImageUrl('https://res.cloudinary.com/demo/image/upload/v1/x.webp')).toBe(false);
    expect(isDataImageUrl('')).toBe(false);
  });

  it('detects data:image embedded in __EVBLOCKS__ paragraphs', () => {
    const para = `__EVBLOCKS__${JSON.stringify([
      { type: 'image', id: 'i1', data: { url: 'data:image/jpeg;base64,abc' } }
    ])}`;
    expect(stringContainsDataImage(para)).toBe(true);
  });

  it('allows CDN cover + body without data URLs', () => {
    expect(() =>
      assertNoDataImageInArticle({
        title: 'Ok',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp',
        paragraphs: [
          `__EVBLOCKS__${JSON.stringify([
            { type: 'image', id: 'i1', data: { url: 'https://res.cloudinary.com/demo/image/upload/v1/body.webp' } }
          ])}`
        ]
      })
    ).not.toThrow();
  });

  it('rejects Base64 cover imageUrl', () => {
    expect(() =>
      assertNoDataImageInArticle({
        title: 'Bad cover',
        imageUrl: 'data:image/jpeg;base64,/9j/aaaa'
      })
    ).toThrow(BadRequestError);
  });

  it('rejects Base64 inside paragraphs / blocks', () => {
    expect(() =>
      assertNoDataImageInArticle({
        title: 'Bad body',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp',
        paragraphs: [
          `__EVBLOCKS__[{"type":"image","id":"i1","data":{"url":"data:image/jpeg;base64,xyz"}}]`
        ]
      })
    ).toThrow(BadRequestError);

    expect(() =>
      assertNoDataImageInArticle({
        title: 'Bad blocks',
        blocks: [{ type: 'gallery', id: 'g1', data: { images: [{ url: 'data:image/png;base64,zzz' }] } }]
      })
    ).toThrow(BadRequestError);
  });
});
