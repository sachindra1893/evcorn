import {
  generateArticleQuickAnswer,
  generateVehicleQuickAnswer
} from './quick-answer.generator';
import { buildVehicleOverviewFacts } from '../vehicle-facts';

describe('QuickAnswerGenerator', () => {
  const variants = [
    {
      id: 'v1',
      price: '₹12.49 Lakh',
      batteryCapacity: '40.5 kWh',
      range: '465 km',
      dcCharging: '50 kW'
    },
    {
      id: 'v2',
      price: '₹14.99 Lakh',
      batteryCapacity: '46 kWh',
      range: '489 km',
      dcCharging: '70 kW'
    }
  ];

  it('builds a one-sentence vehicle answer from overview facts', () => {
    const facts = buildVehicleOverviewFacts(variants);
    const answer = generateVehicleQuickAnswer(
      {
        brandName: 'Tata',
        modelName: 'Nexon EV',
        variants,
        selectedVariant: variants[0]
      },
      facts
    );
    expect(answer).toContain('Tata');
    expect(answer).toContain('Nexon EV');
    expect(answer).toContain(facts.priceRange);
    expect(answer).toContain(facts.claimedRange);
  });

  it('prefers existing seo.metaDescription over auto text', () => {
    const answer = generateVehicleQuickAnswer({
      brandName: 'Tata',
      modelName: 'Nexon EV',
      variants,
      selectedVariant: variants[0],
      seoMetaDescription: 'Editor override blurb for Nexon EV.'
    });
    expect(answer).toBe('Editor override blurb for Nexon EV.');
  });

  it('never invents numeric specs when variants are empty of facts', () => {
    const answer = generateVehicleQuickAnswer({
      brandName: 'BrandX',
      modelName: 'ModelY',
      variants: [{ id: 'x', price: 'N/A', batteryCapacity: '-', range: 'N/A', dcCharging: '' }],
      selectedVariant: { id: 'x', price: 'N/A' }
    });
    expect(answer).toBe('The BrandX ModelY is an electric vehicle listed on EVCorn.');
    expect(answer).not.toMatch(/\d+\s*kWh/);
  });

  it('article: prefers seo → description → first paragraph', () => {
    expect(
      generateArticleQuickAnswer({
        title: 'Guide',
        seoMetaDescription: 'SEO desc',
        description: 'Plain desc',
        paragraphs: ['First para']
      })
    ).toBe('SEO desc');

    expect(
      generateArticleQuickAnswer({
        title: 'Guide',
        description: 'Plain desc',
        paragraphs: ['First para']
      })
    ).toBe('Plain desc');

    expect(
      generateArticleQuickAnswer({
        title: 'Guide',
        blocks: [{ type: 'paragraph', data: { text: 'Block lead sentence here.' } }]
      })
    ).toBe('Block lead sentence here.');
  });
});
