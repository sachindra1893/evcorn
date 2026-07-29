import { createRequestId, REQUEST_ID_HEADER, SLOW_HTTP_THRESHOLD_MS } from './observability.constants';

describe('observability.constants', () => {
  it('exposes stable request id header and slow threshold', () => {
    expect(REQUEST_ID_HEADER).toBe('X-Request-Id');
    expect(SLOW_HTTP_THRESHOLD_MS).toBeGreaterThan(0);
  });

  it('createRequestId returns a non-empty unique-ish string', () => {
    const a = createRequestId();
    const b = createRequestId();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});
