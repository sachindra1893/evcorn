import { describe, it, expect, beforeEach } from 'vitest';
import {
  CONTENT_INTEL_CACHE_MAX_ENTRIES,
  clearContentIntelCache,
  contentIntelCacheSize,
  getCachedContentIntel,
  setCachedContentIntel
} from './content-intel-cache';
import { emptyContentIntelPageModel } from './content-intel.types';

describe('content-intel-cache', () => {
  beforeEach(() => clearContentIntelCache());

  it('stores derived models by entityId+version only', () => {
    const model = emptyContentIntelPageModel();
    model.evidenceSummary = ['ok'];
    setCachedContentIntel('model:tata:nexon-ev', '2026-07-01', model);
    expect(getCachedContentIntel('model:tata:nexon-ev', '2026-07-01')?.evidenceSummary).toEqual([
      'ok'
    ]);
    expect(getCachedContentIntel('model:tata:nexon-ev', '2026-07-02')).toBeUndefined();
  });

  it('evicts oldest entries when over max size (≤64)', () => {
    for (let i = 0; i < CONTENT_INTEL_CACHE_MAX_ENTRIES + 5; i++) {
      setCachedContentIntel(`id-${i}`, 't', emptyContentIntelPageModel());
    }
    expect(contentIntelCacheSize()).toBe(CONTENT_INTEL_CACHE_MAX_ENTRIES);
    expect(getCachedContentIntel('id-0', 't')).toBeUndefined();
    expect(getCachedContentIntel(`id-${CONTENT_INTEL_CACHE_MAX_ENTRIES + 4}`, 't')).toBeTruthy();
  });
});
