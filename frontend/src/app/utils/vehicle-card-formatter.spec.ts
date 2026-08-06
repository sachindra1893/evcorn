import { describe, it, expect } from 'vitest';
import { formatCardRange, formatCardBattery } from './vehicle-card-formatter';

describe('Vehicle Card Formatter', () => {
  describe('formatCardRange', () => {
    it('formats range with standard suffixes into numeric + km', () => {
      expect(formatCardRange('526 km (MIDC)')).toBe('526 km');
      expect(formatCardRange('650 km WLTP')).toBe('650 km');
      expect(formatCardRange('453.5km')).toBe('453.5 km');
      expect(formatCardRange('425 km (EPA)')).toBe('425 km');
      expect(formatCardRange('600 km (CLTC)')).toBe('600 km');
    });

    it('handles numeric input', () => {
      expect(formatCardRange(650)).toBe('650 km');
    });

    it('returns N/A for missing or empty inputs', () => {
      expect(formatCardRange(null)).toBe('N/A');
      expect(formatCardRange(undefined)).toBe('N/A');
      expect(formatCardRange('N/A')).toBe('N/A');
      expect(formatCardRange('')).toBe('N/A');
    });
  });

  describe('formatCardBattery', () => {
    it('formats battery with chemistry or marketing name into numeric + kWh', () => {
      expect(formatCardBattery('82.56 kWh LFP')).toBe('82.56 kWh');
      expect(formatCardBattery('40.5 kWh Blade Battery')).toBe('40.5 kWh');
      expect(formatCardBattery('75kWh (NMC)')).toBe('75 kWh');
      expect(formatCardBattery('30.2 kWh Ultium')).toBe('30.2 kWh');
    });

    it('handles numeric input', () => {
      expect(formatCardBattery(82.56)).toBe('82.56 kWh');
    });

    it('returns N/A for missing or empty inputs', () => {
      expect(formatCardBattery(null)).toBe('N/A');
      expect(formatCardBattery(undefined)).toBe('N/A');
      expect(formatCardBattery('N/A')).toBe('N/A');
      expect(formatCardBattery('')).toBe('N/A');
    });
  });
});
