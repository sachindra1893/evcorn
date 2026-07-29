import { COMPARE_MAX_VEHICLES, clampCompareIds, tryAddCompareId } from '../compare/compare-engine';

describe('CompareStateService helpers (selection)', () => {
  it('enforces MVP max of 2', () => {
    expect(COMPARE_MAX_VEHICLES).toBe(2);
    expect(clampCompareIds(['a', 'b', 'c', 'd'])).toEqual(['a', 'b']);
  });

  it('rejects third vehicle add', () => {
    const result = tryAddCompareId(['id-1', 'id-2'], 'id-3');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('full');
  });
});
