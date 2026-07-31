import {
  formatLastUpdatedLabel,
  resolveLastUpdated,
  resolveLastUpdatedFromVariants
} from './last-updated';

describe('LastUpdated helper', () => {
  it('prefers updatedAt over publishedAt over createdAt', () => {
    expect(
      resolveLastUpdated({
        updatedAt: '2026-07-01T10:00:00.000Z',
        publishedAt: '2026-06-01T10:00:00.000Z',
        createdAt: '2026-05-01T10:00:00.000Z'
      })
    ).toBe('2026-07-01T10:00:00.000Z');

    expect(
      resolveLastUpdated({
        publishedAt: '2026-06-01T10:00:00.000Z',
        createdAt: '2026-05-01T10:00:00.000Z'
      })
    ).toBe('2026-06-01T10:00:00.000Z');

    expect(resolveLastUpdated({ createdAt: '2026-05-01T12:00:00.000Z' })).toBe(
      '2026-05-01T12:00:00.000Z'
    );
  });

  it('supports publishAt alias for articles', () => {
    expect(resolveLastUpdated({ publishAt: '2026-03-15T08:00:00.000Z' })).toBe(
      '2026-03-15T08:00:00.000Z'
    );
  });

  it('picks the latest timestamp across variants', () => {
    expect(
      resolveLastUpdatedFromVariants([
        { updatedAt: '2026-01-01T00:00:00.000Z' },
        { updatedAt: '2026-07-20T00:00:00.000Z' },
        { createdAt: '2025-01-01T00:00:00.000Z' }
      ])
    ).toBe('2026-07-20T00:00:00.000Z');
  });

  it('returns undefined when no dates exist', () => {
    expect(resolveLastUpdated({})).toBeUndefined();
    expect(resolveLastUpdatedFromVariants([])).toBeUndefined();
    expect(formatLastUpdatedLabel(undefined)).toBeUndefined();
  });

  it('formats a readable en-IN label', () => {
    const label = formatLastUpdatedLabel('2026-07-15T00:00:00.000Z');
    expect(label).toMatch(/2026/);
    expect(label).toMatch(/Jul|July/i);
  });
});
