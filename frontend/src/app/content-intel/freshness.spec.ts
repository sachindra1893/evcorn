import { describe, it, expect } from 'vitest';
import {
  FRESHNESS_AGING_MAX_DAYS,
  FRESHNESS_FRESH_MAX_DAYS,
  deriveFreshness,
  deriveVehicleFreshness
} from './freshness';

describe('freshness', () => {
  const now = '2026-08-01T00:00:00.000Z';

  it('marks fresh when ageDays ≤ 90', () => {
    const signal = deriveFreshness(
      { updatedAt: '2026-07-01T00:00:00.000Z' },
      now
    );
    expect(signal.state).toBe('fresh');
    expect(signal.ageDays).toBeLessThanOrEqual(FRESHNESS_FRESH_MAX_DAYS);
    expect(signal.reasons.some((r) => r.includes('≤'))).toBe(true);
  });

  it('marks aging at 91–180 days', () => {
    const signal = deriveFreshness(
      { updatedAt: '2026-03-01T00:00:00.000Z' },
      now
    );
    expect(signal.state).toBe('aging');
    expect(signal.ageDays).toBeGreaterThan(FRESHNESS_FRESH_MAX_DAYS);
    expect(signal.ageDays).toBeLessThanOrEqual(FRESHNESS_AGING_MAX_DAYS);
    expect(signal.editorialPriority).toBe('review');
  });

  it('marks stale when ageDays > 180', () => {
    const signal = deriveFreshness(
      { updatedAt: '2025-01-01T00:00:00.000Z' },
      now
    );
    expect(signal.state).toBe('stale');
    expect(signal.ageDays).toBeGreaterThan(FRESHNESS_AGING_MAX_DAYS);
    expect(signal.editorialPriority).toBe('urgent');
  });

  it('returns unknown without usable dates', () => {
    const signal = deriveFreshness({ status: 'published' }, now);
    expect(signal.state).toBe('unknown');
  });

  it('prefers updatedAt via resolveLastUpdated order', () => {
    const signal = deriveFreshness(
      {
        createdAt: '2025-01-01T00:00:00.000Z',
        publishAt: '2025-06-01T00:00:00.000Z',
        updatedAt: '2026-07-15T00:00:00.000Z'
      },
      now
    );
    expect(signal.lastUpdated).toBe('2026-07-15T00:00:00.000Z');
    expect(signal.state).toBe('fresh');
  });

  it('deriveVehicleFreshness uses latest sibling variant date', () => {
    const signal = deriveVehicleFreshness(
      [
        { id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'b', updatedAt: '2026-07-20T00:00:00.000Z' }
      ],
      { id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' },
      now
    );
    expect(signal.lastUpdated).toBe('2026-07-20T00:00:00.000Z');
    expect(signal.state).toBe('fresh');
  });
});
