import { generateRelatedComparisons } from './related-comparison.generator';

describe('RelatedComparisonGenerator', () => {
  it('builds compare links from related peer ids only', () => {
    const out = generateRelatedComparisons(
      { id: 'sel-1', parentModel: 'Nexon EV' },
      [
        { id: 'peer-1', parentModel: 'XUV400', brandSlug: 'mahindra' },
        { id: 'sel-1', parentModel: 'dup' },
        { id: 'peer-2', name: 'ZS EV' }
      ],
      { brandName: 'Tata', modelName: 'Nexon EV' }
    );
    expect(out.length).toBe(2);
    expect(out[0].href).toBe('/compare?ids=sel-1,peer-1');
    expect(out[0].label).toContain('Nexon EV');
  });

  it('returns empty without selected id', () => {
    expect(generateRelatedComparisons(undefined, [{ id: 'p1' }])).toEqual([]);
  });
});
