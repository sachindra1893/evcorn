import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { classifyHttpError, isTransientStatus } from './app-http-error';

function httpErr(status: number, body?: unknown): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText: 'Error',
    url: '/api/test',
    error: body,
    headers: new HttpHeaders()
  });
}

describe('classifyHttpError', () => {
  it('marks offline when the browser is offline', () => {
    const result = classifyHttpError(httpErr(500), false);
    expect(result.category).toBe('offline');
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toContain('offline');
  });

  it('classifies status 0 as a retryable network error', () => {
    const result = classifyHttpError(httpErr(0), true);
    expect(result.category).toBe('network');
    expect(result.retryable).toBe(true);
  });

  it('classifies 401/403 as non-retryable auth errors', () => {
    expect(classifyHttpError(httpErr(401), true).category).toBe('auth');
    expect(classifyHttpError(httpErr(403), true).retryable).toBe(false);
  });

  it('classifies 429 as non-retryable rateLimit', () => {
    const result = classifyHttpError(httpErr(429, { error: { code: 'TOO_MANY_REQUESTS' } }), true);
    expect(result.category).toBe('rateLimit');
    expect(result.code).toBe('TOO_MANY_REQUESTS');
    expect(result.retryable).toBe(false);
  });

  it('classifies 408 and TimeoutError as retryable timeouts', () => {
    expect(classifyHttpError(httpErr(408), true).category).toBe('timeout');
    const timeout = classifyHttpError({ name: 'TimeoutError' }, true);
    expect(timeout.category).toBe('timeout');
    expect(timeout.retryable).toBe(true);
  });

  it('classifies 5xx as server, retryable only for transient statuses', () => {
    expect(classifyHttpError(httpErr(503), true).retryable).toBe(true);
    expect(classifyHttpError(httpErr(500), true).retryable).toBe(false);
    expect(classifyHttpError(httpErr(500), true).category).toBe('server');
  });

  it('classifies 4xx as non-retryable client errors with 404-specific copy', () => {
    const notFound = classifyHttpError(httpErr(404), true);
    expect(notFound.category).toBe('client');
    expect(notFound.userMessage).toContain('could not find');
    expect(notFound.retryable).toBe(false);
  });

  it('falls back to unknown for non-HTTP errors', () => {
    const result = classifyHttpError(new Error('boom'), true);
    expect(result.category).toBe('unknown');
    expect(result.retryable).toBe(false);
  });
});

describe('isTransientStatus', () => {
  it('treats 0/502/503/504 as transient', () => {
    expect(isTransientStatus(0)).toBe(true);
    expect(isTransientStatus(502)).toBe(true);
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(504)).toBe(true);
    expect(isTransientStatus(500)).toBe(false);
    expect(isTransientStatus(404)).toBe(false);
  });
});
