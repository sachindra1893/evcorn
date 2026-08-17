/**
 * Location Controller Unit Test Suite
 */
const { sanitizeCityName } = require('../../controllers/location.controller');

describe('Location Controller - City Sanitization', () => {
  it('correctly cleans up raw city strings to pure English city names', () => {
    expect(sanitizeCityName('Noida नोएडा')).toBe('Noida');
    expect(sanitizeCityName('Greater Noida')).toBe('Noida');
    expect(sanitizeCityName('New Delhi')).toBe('Delhi');
    expect(sanitizeCityName('Gurgaon')).toBe('Gurugram');
    expect(sanitizeCityName('Bangalore')).toBe('Bengaluru');
    expect(sanitizeCityName('Mumbai')).toBe('Mumbai');
  });

  it('handles null, empty or invalid strings gracefully', () => {
    expect(sanitizeCityName(null)).toBe('');
    expect(sanitizeCityName(undefined)).toBe('');
    expect(sanitizeCityName('')).toBe('');
    expect(sanitizeCityName(' ')).toBe('');
  });
});
