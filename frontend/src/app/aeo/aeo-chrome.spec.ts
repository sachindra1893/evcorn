import { emptyAeoPageModel, hasAeoChrome, hasArticleAnswerChrome } from './aeo.types';

describe('AEO chrome visibility helpers', () => {
  it('hasAeoChrome is false for empty model', () => {
    expect(hasAeoChrome(null)).toBe(false);
    expect(hasAeoChrome(undefined)).toBe(false);
    expect(hasAeoChrome(emptyAeoPageModel())).toBe(false);
  });

  it('hasAeoChrome is true when any section has content', () => {
    expect(hasAeoChrome({ ...emptyAeoPageModel(), quickAnswer: 'Hello' })).toBe(true);
    expect(hasAeoChrome({ ...emptyAeoPageModel(), faqs: [{ question: 'Q?', answer: 'A' }] })).toBe(
      true
    );
    expect(
      hasAeoChrome({
        ...emptyAeoPageModel(),
        toc: [{ id: 'x', text: 'X', level: 2 }]
      })
    ).toBe(true);
  });

  it('hasArticleAnswerChrome ignores TOC / related outside the answer box', () => {
    const withTocOnly = {
      ...emptyAeoPageModel(),
      toc: [{ id: 'h2', text: 'Section', level: 2 }],
      relatedVehicles: [{ id: 'v1', name: 'EV', href: '/ev/a/b' }]
    };
    expect(hasArticleAnswerChrome(withTocOnly)).toBe(false);
    expect(hasArticleAnswerChrome({ ...emptyAeoPageModel(), quickAnswer: 'Summary' })).toBe(true);
  });
});
