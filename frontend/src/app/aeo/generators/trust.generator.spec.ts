import { generateTrust } from './trust.generator';

describe('TrustGenerator', () => {
  it('builds vehicle citation with updated label', () => {
    const trust = generateTrust({
      kind: 'vehicle',
      brandName: 'Tata',
      lastUpdated: '2026-07-10T00:00:00.000Z'
    });
    expect(trust.citationNote).toContain('independent');
    expect(trust.updatedLabel).toContain('Updated');
    expect(trust.authorLabel).toBeUndefined();
  });

  it('includes article author defaults', () => {
    const trust = generateTrust({
      kind: 'article',
      author: { name: 'Alex', role: 'Editor' },
      lastUpdated: '2026-07-10T00:00:00.000Z'
    });
    expect(trust.authorLabel).toContain('Alex');
    expect(trust.citationNote).toContain('independent');
  });
});
