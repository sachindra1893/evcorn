/**
 * Phase 4 unit tests — cache fingerprint + TTL namespaces
 */
const appCache = require('../../utils/cache');

describe('Phase 4 cache utility', () => {
  beforeEach(() => {
    appCache.flushAll();
  });

  it('fingerprintQuery sorts keys and lowercases values', () => {
    const a = appCache.fingerprintQuery({ brand: 'Tata', light: 'true' });
    const b = appCache.fingerprintQuery({ light: 'TRUE', brand: 'tata' });
    expect(a).toBe(b);
    expect(a).toContain('brand=tata');
    expect(a).toContain('light=true');
  });

  it('fingerprintQuery omits empty and listed keys', () => {
    const fp = appCache.fingerprintQuery(
      { brand: 'tata', admin: '1', search: '' },
      ['admin']
    );
    expect(fp).toBe('brand=tata');
  });

  it('stores and retrieves category list key', () => {
    const key = appCache.KEYS.CATEGORIES();
    appCache.set(key, [{ id: 'tata', name: 'Tata' }], appCache.TTL.CATEGORIES);
    expect(appCache.get(key)).toEqual([{ id: 'tata', name: 'Tata' }]);
  });

  it('stats() reports hits/misses after get', () => {
    const key = appCache.KEYS.SEARCH_AUTOCOMPLETE('nexon');
    expect(appCache.get(key)).toBeUndefined();
    appCache.set(key, [], 60);
    expect(appCache.get(key)).toEqual([]);
    const s = appCache.stats();
    expect(s.keys).toBeGreaterThanOrEqual(1);
    expect(typeof s.hits).toBe('number');
    expect(typeof s.misses).toBe('number');
  });
});
