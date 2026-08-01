const {
  articleHref,
  brandBrowseHref,
  compareHref,
  entitySlugify,
  modelHref,
  resolveModelName
} = require('../../utils/entity-href');

describe('entity-href (BE mirror of FE SSOT)', () => {
  it('slugify matches FE brand/model path segments', () => {
    expect(entitySlugify('Tata Motors')).toBe('tata-motors');
    expect(entitySlugify('Nexon EV')).toBe('nexon-ev');
  });

  it('prefers brandName for /ev/ paths', () => {
    expect(
      modelHref({
        brandName: 'Tata Motors',
        brandSlug: 'tata',
        parentModel: 'Nexon EV'
      })
    ).toBe('/ev/tata-motors/nexon-ev');
  });

  it('resolveModelName prefers parentModel over dirty modelSlug', () => {
    expect(
      resolveModelName({ parentModel: 'Nexon EV', modelSlug: 'wrong-slug' })
    ).toBe('Nexon EV');
  });

  it('brand browse uses name slug not raw category id', () => {
    expect(brandBrowseHref('Tata Motors')).toBe('/evs?category=tata-motors');
  });

  it('article and compare hrefs stay id-stable', () => {
    expect(articleHref('art-1')).toBe('/articles/art-1');
    expect(compareHref(['a', 'b'])).toBe('/compare?ids=a,b');
  });
});
