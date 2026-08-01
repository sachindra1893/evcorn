import {
  articleHref,
  brandBrowseHref,
  compareHref,
  modelHref,
  modelSpecsHref
} from './entity-href';

describe('entity-href — canonical path SSOT', () => {
  it('prefers brandName for /ev/ paths (existing Tata Motors URLs)', () => {
    expect(
      modelHref({
        brandName: 'Tata Motors',
        brandSlug: 'tata',
        parentModel: 'Nexon EV'
      })
    ).toBe('/ev/tata-motors/nexon-ev');
  });

  it('falls back to brandSlug when brandName missing', () => {
    expect(
      modelHref({ brandSlug: 'mahindra', parentModel: 'XUV400' })
    ).toBe('/ev/mahindra/xuv400');
  });

  it('prefers parentModel over dirty modelSlug for path (identity-aligned)', () => {
    expect(
      modelHref({
        brandName: 'Tata Motors',
        parentModel: 'Nexon EV',
        modelSlug: 'wrong-slug'
      })
    ).toBe('/ev/tata-motors/nexon-ev');
  });

  it('returns undefined when brand or model path cannot be built', () => {
    expect(modelHref({ parentModel: 'Nexon EV' })).toBeUndefined();
    expect(modelHref({ brandName: 'Tata Motors' })).toBeUndefined();
  });

  it('builds article, compare, brand browse, and specs hrefs', () => {
    expect(articleHref('art-1')).toBe('/articles/art-1');
    expect(compareHref(['a', 'b'])).toBe('/compare?ids=a,b');
    expect(compareHref([])).toBe('/compare');
    expect(brandBrowseHref('Tata Motors')).toBe('/evs?category=tata-motors');
    expect(
      modelSpecsHref({ brandName: 'Tata Motors', parentModel: 'Nexon EV' })
    ).toBe('/ev/tata-motors/nexon-ev#aeo-specs');
  });
});
