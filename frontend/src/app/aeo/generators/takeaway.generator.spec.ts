import {
  generateArticleTakeaways,
  generateVehicleTakeaways
} from './takeaway.generator';

describe('TakeawayGenerator', () => {
  it('splits vehicle keyHighlights and adds fact bullets (cap 5)', () => {
    const takeaways = generateVehicleTakeaways(
      {
        id: 'v1',
        keyHighlights: 'Fast charge; Ventilated seats; Premium audio',
        bodyStyle: 'SUV',
        safetyRating: '5 Star'
      },
      [
        {
          id: 'v1',
          price: '₹15 Lakh',
          batteryCapacity: '40 kWh',
          range: '400 km',
          dcCharging: '60 kW'
        }
      ]
    );
    expect(takeaways.length).toBeGreaterThanOrEqual(3);
    expect(takeaways.length).toBeLessThanOrEqual(5);
    expect(takeaways.some((t) => /Fast charge/i.test(t))).toBe(true);
    expect(takeaways.some((t) => /range/i.test(t))).toBe(true);
  });

  it('omits empty highlights and does not invent takeaways from blanks', () => {
    const takeaways = generateVehicleTakeaways(
      { id: 'v1', keyHighlights: 'N/A' },
      [{ id: 'v1', price: 'N/A', batteryCapacity: '-', range: '' }]
    );
    expect(takeaways).toEqual([]);
  });

  it('article: prefers list block items', () => {
    const takeaways = generateArticleTakeaways({
      title: 'Tips',
      blocks: [
        { type: 'list', data: { style: 'unordered', items: ['Tip A', 'Tip B', 'Tip C'] } },
        { type: 'callout', data: { text: 'Ignored when list present', style: 'info' } }
      ]
    });
    expect(takeaways).toEqual(['Tip A', 'Tip B', 'Tip C']);
  });

  it('article: falls back to callouts then heading leads', () => {
    expect(
      generateArticleTakeaways({
        title: 'X',
        blocks: [{ type: 'callout', data: { text: 'Watch battery warranty', style: 'info' } }]
      })
    ).toEqual(['Watch battery warranty']);

    const fromHeadings = generateArticleTakeaways({
      title: 'X',
      blocks: [
        { type: 'heading', data: { text: 'Range', level: 2 } },
        { type: 'paragraph', data: { text: 'Real-world range matters most for city buyers.' } }
      ]
    });
    expect(fromHeadings[0]).toContain('Range');
    expect(fromHeadings[0]).toContain('Real-world range');
  });
});
