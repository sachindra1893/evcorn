import { generateArticleFaqs, generateVehicleFaqs } from './faq.generator';

describe('FAQGenerator', () => {
  it('builds vehicle FAQs only from usable facts', () => {
    const faqs = generateVehicleFaqs(
      {
        brandName: 'Tata',
        modelName: 'Nexon EV',
        selectedVariant: { seating: '5 Seater', bodyStyle: 'SUV' }
      },
      {
        priceRange: '₹12 – ₹15 Lakh',
        batteryOptions: '40 kWh • 46 kWh',
        claimedRange: '400–450 km',
        charging: '50 – 70 kW DC'
      }
    );
    expect(faqs.length).toBeGreaterThan(0);
    expect(faqs.length).toBeLessThanOrEqual(6);
    expect(faqs.every((f) => f.question && f.answer)).toBe(true);
  });

  it('skips N/A vehicle facts', () => {
    const faqs = generateVehicleFaqs(
      { brandName: 'X', modelName: 'Y', selectedVariant: {} },
      { priceRange: 'TBA', batteryOptions: 'N/A', claimedRange: 'N/A', charging: 'N/A' }
    );
    expect(faqs).toEqual([]);
  });

  it('extracts article FAQ blocks only', () => {
    const faqs = generateArticleFaqs({
      blocks: [
        {
          type: 'faq',
          data: {
            items: [
              { question: 'Q1?', answer: 'A1' },
              { question: '', answer: 'skip' }
            ]
          }
        }
      ]
    });
    expect(faqs).toEqual([{ question: 'Q1?', answer: 'A1' }]);
  });
});
