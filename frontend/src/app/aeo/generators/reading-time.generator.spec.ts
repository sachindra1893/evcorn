import {
  AEO_WORDS_PER_MINUTE,
  countArticleWords,
  generateReadingTimeMinutes
} from './reading-time.generator';

describe('ReadingTimeGenerator', () => {
  it('returns undefined for empty body', () => {
    expect(generateReadingTimeMinutes({ title: 'Empty', paragraphs: [] })).toBeUndefined();
    expect(countArticleWords({ title: 'Empty' })).toBe(0);
  });

  it('counts block text at ~220 wpm', () => {
    const words = Array.from({ length: AEO_WORDS_PER_MINUTE }, () => 'word').join(' ');
    const minutes = generateReadingTimeMinutes({
      title: 'One minute',
      blocks: [{ type: 'paragraph', data: { text: words } }]
    });
    expect(minutes).toBe(1);
  });

  it('includes faq / list / pros-cons words', () => {
    const count = countArticleWords({
      title: 'Mixed',
      blocks: [
        { type: 'list', data: { items: ['one two three'] } },
        {
          type: 'faq',
          data: { items: [{ question: 'What is range?', answer: 'About four five six.' }] }
        },
        { type: 'pros-cons', data: { pros: ['good one'], cons: ['bad two'] } }
      ]
    });
    expect(count).toBeGreaterThan(8);
  });

  it('ignores serialized __EVBLOCKS__ paragraphs when blocks are absent', () => {
    expect(
      countArticleWords({
        title: 'Legacy',
        paragraphs: ['__EVBLOCKS__[{"type":"paragraph"}]', 'Plain words here today']
      })
    ).toBe(4);
  });
});
