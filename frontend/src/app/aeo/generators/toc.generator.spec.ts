import {
  generateArticleToc,
  generateVehicleToc,
  VEHICLE_TOC_SECTIONS
} from './toc.generator';

describe('TableOfContentsGenerator', () => {
  it('returns fixed vehicle section anchors', () => {
    const toc = generateVehicleToc();
    expect(toc).toEqual(VEHICLE_TOC_SECTIONS);
    expect(toc.map((t) => t.id)).toEqual(['aeo-overview', 'aeo-variants', 'aeo-specs']);
  });

  it('builds article TOC from h2/h3 blocks and preserves ids', () => {
    const toc = generateArticleToc({
      title: 'Guide',
      blocks: [
        { id: 'intro', type: 'heading', data: { text: 'Intro', level: 2 } },
        { id: 'deep', type: 'heading', data: { text: 'Details', level: 3 } },
        { id: 'skip', type: 'heading', data: { text: 'Title-ish', level: 1 } },
        { type: 'paragraph', data: { text: 'Body' } }
      ]
    });
    expect(toc).toEqual([
      { id: 'intro', text: 'Intro', level: 2 },
      { id: 'deep', text: 'Details', level: 3 }
    ]);
  });

  it('slugifies heading when block id is missing', () => {
    const toc = generateArticleToc({
      title: 'Guide',
      blocks: [{ type: 'heading', data: { text: 'Price & Range', level: 2 } }]
    });
    expect(toc[0].id).toBe('price-range');
    expect(toc[0].text).toBe('Price & Range');
  });
});
