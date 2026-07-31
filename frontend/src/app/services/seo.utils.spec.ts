import { describe, expect, it } from 'vitest';
import {
  formatMetaDescription,
  formatSeoTitle,
  slugifySeo,
  toAbsoluteUrl,
  toCanonicalUrl
} from './seo.utils';

describe('seo.utils', () => {
  it('formatSeoTitle avoids double site suffix', () => {
    expect(formatSeoTitle('Browse EVs')).toBe('Browse EVs | EVCorn');
    expect(formatSeoTitle('Browse EVs | EVCorn')).toBe('Browse EVs | EVCorn');
    expect(formatSeoTitle('Privacy Policy | EVCorn')).toBe('Privacy Policy | EVCorn');
    expect(formatSeoTitle('Tata Nexon EV: Price | EVCorn')).toBe('Tata Nexon EV: Price | EVCorn');
  });

  it('formatMetaDescription clamps long copy near 160 chars', () => {
    const long =
      'Discover the Tata Nexon EV electric vehicle in India with detailed price, battery options, claimed range, DC fast charging speeds, safety ratings, and variant comparisons to help you choose the right EV for your commute and family.';
    const out = formatMetaDescription(long);
    expect(out.length).toBeLessThanOrEqual(161);
    expect(out.endsWith('…')).toBe(true);
  });

  it('formatMetaDescription keeps short unique copy', () => {
    const short = 'Read our privacy policy to understand how EVCorn handles and protects your data.';
    expect(formatMetaDescription(short)).toBe(short);
  });

  it('toCanonicalUrl strips query by default and keeps compare query when asked', () => {
    expect(toCanonicalUrl('/evs?brand=tata')).toBe('https://evcorn.com/evs');
    expect(toCanonicalUrl('https://evcorn.com/compare?ids=a,b', { keepQuery: true })).toBe(
      'https://evcorn.com/compare?ids=a,b'
    );
  });

  it('toAbsoluteUrl keeps external hosts and resolves relative paths', () => {
    expect(toAbsoluteUrl('/articles/foo')).toBe('https://evcorn.com/articles/foo');
    expect(toAbsoluteUrl('https://res.cloudinary.com/demo/image.jpg')).toBe(
      'https://res.cloudinary.com/demo/image.jpg'
    );
    expect(slugifySeo('Tata Motors')).toBe('tata-motors');
  });
});

