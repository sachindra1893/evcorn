import { generateBuyingRecommendation } from './buying-recommendation.generator';
import { buildVehicleOverviewFacts } from '../vehicle-facts';

describe('BuyingRecommendationGenerator', () => {
  const facts = buildVehicleOverviewFacts([
    { price: '₹12 Lakh', batteryCapacity: '40 kWh', range: '400 km', dcCharging: '50 kW' }
  ]);

  it('templates from status + range/price for published EVs', () => {
    const text = generateBuyingRecommendation(
      'Tata',
      'Nexon EV',
      { status: 'Published', price: '₹12 Lakh', range: '400 km', bodyStyle: 'SUV' },
      facts
    );
    expect(text).toBeTruthy();
    expect(text).toContain('Nexon EV');
    expect(text!.toLowerCase()).toMatch(/compare|suited|shortlisting/);
  });

  it('returns undefined without brand/model', () => {
    expect(generateBuyingRecommendation('', '', { status: 'Published' }, facts)).toBeUndefined();
  });

  it('omits recommendation when published facts and audience signals are missing', () => {
    expect(
      generateBuyingRecommendation(
        'Brand',
        'Mystery EV',
        { status: 'Published', price: 'N/A', range: 'N/A' },
        { priceRange: 'TBA', batteryOptions: 'N/A', claimedRange: 'N/A', charging: 'N/A' }
      )
    ).toBeUndefined();
  });
});
