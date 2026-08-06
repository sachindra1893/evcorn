// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { LocationService } from './location.service';

describe('LocationService (Release 4.0 Refined Smart Location)', () => {
  let service: LocationService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    service = new LocationService();
  });

  describe('sanitizeEnglishCityName (Generic Sanitizer)', () => {
    it('strips non-Latin/Devanagari scripts cleanly without hardcoded city dictionaries', () => {
      expect(service.sanitizeEnglishCityName('Noida')).toBe('Noida');
      expect(service.sanitizeEnglishCityName('Varanasi')).toBe('Varanasi');
      expect(service.sanitizeEnglishCityName('Delhi')).toBe('Delhi');
      expect(service.sanitizeEnglishCityName('Tokyo')).toBe('Tokyo');
      expect(service.sanitizeEnglishCityName('São Paulo')).toBe('Sao Paulo');
    });

    it('strips Devanagari Unicode characters if any remain in raw response', () => {
      expect(service.sanitizeEnglishCityName('Noida नोएडा')).toBe('Noida');
    });

    it('returns India if input is empty or null', () => {
      expect(service.sanitizeEnglishCityName(null)).toBe('India');
      expect(service.sanitizeEnglishCityName(undefined)).toBe('India');
      expect(service.sanitizeEnglishCityName('')).toBe('India');
    });
  });

  describe('setLocation and Dynamic Cache Storage', () => {
    it('persists location in localStorage with coordinates for distance tracking', () => {
      const mockLoc = {
        city: 'Noida',
        state: 'Uttar Pradesh',
        country: 'India',
        lat: 28.5355,
        lon: 77.391,
        timestamp: Date.now(),
        source: 'gps' as const,
        displayName: 'Noida'
      };

      service.setLocation(mockLoc, 'global', true);

      const saved = localStorage.getItem('evcorn_smart_location_v2');
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed.city).toBe('Noida');
      expect(parsed.lat).toBe(28.5355);
      expect(parsed.lon).toBe(77.391);
    });
  });
});
