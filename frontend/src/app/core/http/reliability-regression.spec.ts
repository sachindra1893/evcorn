/**
 * Permanent frontend unit regressions for Phase 1 reliability hooks:
 * timeout, offline, retry classification, request-id extraction.
 * Complements http-error.interceptor.spec.ts / async-state.spec.ts.
 */
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { classifyHttpError, extractRequestId, isTransientStatus } from './app-http-error';
import { isEmptyValue } from '../async-state/async-state';

describe('Phase 1/2 permanent reliability regressions', () => {
  it('does not treat empty Published-style empty arrays as success data', () => {
    // AsyncState maps empty arrays to `empty` — prevents infinite "wait for vehicles" spin.
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue([{ id: 1 }])).toBe(false);
  });

  it('classifies offline distinctly from generic network errors', () => {
    const offline = classifyHttpError(
      new HttpErrorResponse({ status: 0, statusText: 'Unknown' }),
      false
    );
    expect(offline.category).toBe('offline');
    expect(offline.retryable).toBe(true);
    expect(offline.userMessage.toLowerCase()).toContain('offline');
  });

  it('classifies TimeoutError as retryable timeout', () => {
    const result = classifyHttpError({ name: 'TimeoutError' }, true);
    expect(result.category).toBe('timeout');
    expect(result.retryable).toBe(true);
  });

  it('marks only transient HTTP statuses as retryable', () => {
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(502)).toBe(true);
    expect(isTransientStatus(504)).toBe(true);
    expect(isTransientStatus(0)).toBe(true);
    expect(isTransientStatus(500)).toBe(false);
    expect(isTransientStatus(404)).toBe(false);
  });

  it('propagates request-id from response headers', () => {
    const headers = new HttpHeaders({ 'x-request-id': 'hdr-regression-1' });
    const err = new HttpErrorResponse({
      status: 500,
      statusText: 'Error',
      headers,
      error: { error: { code: 'INTERNAL_SERVER_ERROR' } }
    });
    expect(extractRequestId(err)).toBe('hdr-regression-1');
  });

  it('prefers body requestId over header when both exist', () => {
    const headers = new HttpHeaders({ 'x-request-id': 'hdr-2' });
    const err = new HttpErrorResponse({
      status: 500,
      headers,
      error: { requestId: 'body-2' }
    });
    const classified = classifyHttpError(err, true);
    expect(classified.requestId).toBe('body-2');
  });
});
