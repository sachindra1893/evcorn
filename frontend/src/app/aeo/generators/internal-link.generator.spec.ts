import { generateInternalLinks } from './internal-link.generator';

describe('InternalLinkGenerator', () => {
  it('includes brand, compare, faqs from page context', () => {
    const links = generateInternalLinks({
      brandName: 'Tata',
      brandSlug: 'tata-motors',
      modelName: 'Nexon EV',
      modelSlug: 'nexon-ev',
      selectedVariantId: 'v1'
    });
    expect(links.some((l) => l.href.includes('/evs?category=tata-motors'))).toBe(true);
    expect(links.some((l) => l.href === '/ev/tata-motors/nexon-ev')).toBe(true);
    expect(links.some((l) => l.href.startsWith('/compare?ids='))).toBe(true);
    expect(links.some((l) => l.href === '/faqs')).toBe(true);
  });

  it('can omit model overview to avoid vehicle-page self-links', () => {
    const links = generateInternalLinks({
      brandName: 'Tata',
      brandSlug: 'tata-motors',
      modelSlug: 'nexon-ev',
      selectedVariantId: 'v1',
      includeModelOverview: false
    });
    expect(links.some((l) => l.href === '/ev/tata-motors/nexon-ev')).toBe(false);
  });
});
