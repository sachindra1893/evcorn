import {
  AEO_CACHE_MAX_ENTRIES,
  aeoCacheSize,
  clearAeoCache,
  getCachedAeo,
  setCachedAeo
} from './aeo-cache';
import { emptyAeoPageModel } from './aeo.types';

describe('AeoCache', () => {
  beforeEach(() => clearAeoCache());

  it('stores AeoPageModel by entityId+updatedAt only', () => {
    const model = emptyAeoPageModel();
    model.quickAnswer = 'hello';
    setCachedAeo('e1', '2026-07-01', model);
    expect(getCachedAeo('e1', '2026-07-01')).toBe(model);
    expect(getCachedAeo('e1', '2026-07-02')).toBeUndefined();
  });

  it('evicts oldest entries when over max size', () => {
    for (let i = 0; i < AEO_CACHE_MAX_ENTRIES + 5; i++) {
      setCachedAeo(`id-${i}`, 't', emptyAeoPageModel());
    }
    expect(aeoCacheSize()).toBe(AEO_CACHE_MAX_ENTRIES);
    expect(getCachedAeo('id-0', 't')).toBeUndefined();
    expect(getCachedAeo(`id-${AEO_CACHE_MAX_ENTRIES + 4}`, 't')).toBeTruthy();
  });
});
