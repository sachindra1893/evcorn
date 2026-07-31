const { buildSitemapXml, slugify } = require('../../utils/sitemap');

describe('sitemap builder', () => {
  it('slugify matches frontend brand/model routes', () => {
    expect(slugify('Tata Motors')).toBe('tata-motors');
    expect(slugify('Nexon EV')).toBe('nexon-ev');
  });

  it('includes static routes, articles, unique vehicle models; excludes admin', () => {
    const xml = buildSitemapXml({
      articles: [
        { id: 'art-1', active: true, createdAt: '2026-01-01' },
        { id: 'art-draft', active: false }
      ],
      vehicles: [
        { categoryId: 'tata', parentModel: 'Nexon EV', status: 'Published' },
        { categoryId: 'tata', parentModel: 'Nexon EV', variantName: 'LR', status: 'Published' },
        { categoryId: 'byd', name: 'Atto 3::Dynamic (Base Variant)', status: 'Published' },
        { categoryId: 'byd', name: 'Atto 3::Premium (Mid Variant)', status: 'Published' },
        { categoryId: 'mg', parentModel: 'ZS EV', status: 'Draft' }
      ],
      categories: [
        { id: 'tata', name: 'Tata Motors' },
        { id: 'byd', name: 'BYD' },
        { id: 'mg', name: 'MG' }
      ]
    });

    expect(xml).toContain('https://evcorn.com/evs');
    expect(xml).toContain('https://evcorn.com/articles/art-1');
    expect(xml).toContain('https://evcorn.com/ev/tata-motors/nexon-ev');
    expect(xml).toContain('https://evcorn.com/ev/byd/atto-3');
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/charging');
    expect(xml).not.toContain('art-draft');
    expect(xml).not.toContain('/ev/mg/zs-ev');
    expect(xml).not.toContain('atto-3dynamic');
    expect((xml.match(/nexon-ev/g) || []).length).toBe(1);
    expect((xml.match(/atto-3/g) || []).length).toBe(1);
  });
});
