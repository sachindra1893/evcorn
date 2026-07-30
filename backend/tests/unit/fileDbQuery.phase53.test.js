/**
 * Phase 5.3 — File-DB query matcher unit tests
 */
const {
  matchesFilter,
  projectDocument,
  queryDocuments,
  countDocuments
} = require('../../utils/fileDbQuery');

describe('fileDbQuery (Phase 5.3)', () => {
  const sample = [
    { id: 'a', name: 'Tata Nexon EV', categoryId: 'tata', status: 'Published', pricing: { exShowroomPriceINR: 1699000 } },
    { id: 'b', name: 'MG ZS EV', categoryId: 'mg', pricing: { exShowroomPriceINR: 1899000 } }, // missing status
    { id: 'c', name: 'Upcoming Concept', categoryId: 'tata', status: 'Upcoming', pricing: { exShowroomPriceINR: 999000 } },
    { id: 'd', name: 'Tata Tiago EV', categoryId: 'tata', status: 'Published', pricing: { exShowroomPriceINR: 899000 }, paragraphs: ['heavy'], blocks: [] }
  ];

  it('matches Published including missing status ($or + $exists)', () => {
    const filter = {
      $or: [{ status: 'Published' }, { status: { $exists: false } }]
    };
    expect(sample.filter((d) => matchesFilter(d, filter)).map((d) => d.id)).toEqual(['a', 'b', 'd']);
  });

  it('matches $and of status + regex search', () => {
    const filter = {
      $and: [
        { $or: [{ status: 'Published' }, { status: { $exists: false } }] },
        { $or: [{ name: /nexon/i }, { parentModel: /nexon/i }] }
      ]
    };
    expect(sample.filter((d) => matchesFilter(d, filter)).map((d) => d.id)).toEqual(['a']);
  });

  it('matches nested $gte/$lte', () => {
    const filter = { 'pricing.exShowroomPriceINR': { $gte: 1000000, $lte: 1800000 } };
    expect(sample.filter((d) => matchesFilter(d, filter)).map((d) => d.id)).toEqual(['a']);
  });

  it('projects inclusion string (light fields)', () => {
    const out = projectDocument(sample[3], 'id name categoryId status');
    expect(out).toEqual({ id: 'd', name: 'Tata Tiago EV', categoryId: 'tata', status: 'Published' });
    expect(out.paragraphs).toBeUndefined();
  });

  it('projects exclusion object (article light)', () => {
    const out = projectDocument(sample[3], { paragraphs: 0, blocks: 0 });
    expect(out.paragraphs).toBeUndefined();
    expect(out.blocks).toBeUndefined();
    expect(out.name).toBe('Tata Tiago EV');
  });

  it('queryDocuments filters, sorts, paginates, projects without mutating source', () => {
    const src = sample.map((d) => ({ ...d }));
    const result = queryDocuments(
      src,
      { categoryId: 'tata', $or: [{ status: 'Published' }, { status: { $exists: false } }] },
      'id name',
      { name: 1 },
      0,
      2
    );
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[0].pricing).toBeUndefined();
    expect(src[0].pricing).toBeDefined(); // source untouched
    expect(countDocuments(src, { categoryId: 'tata' })).toBe(3);
  });
});
