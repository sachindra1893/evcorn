import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoggingService } from './logging.service';

describe('LoggingService', () => {
  let logging: LoggingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), LoggingService]
    });
    logging = TestBed.inject(LoggingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('buildEntry produces structured fields with service and level', () => {
    const entry = logging.buildEntry('error', 'boom', {
      requestId: 'rid-1',
      durationMs: 42,
      endpoint: '/api/x',
      kind: 'backend_5xx'
    });
    expect(entry.level).toBe('error');
    expect(entry.service).toBe('evcorn-frontend');
    expect(entry.msg).toBe('boom');
    expect(entry.requestId).toBe('rid-1');
    expect(entry.durationMs).toBe(42);
    expect(entry.endpoint).toBe('/api/x');
    expect(entry.kind).toBe('backend_5xx');
    expect(typeof entry.time).toBe('string');
  });

  it('normalizes legacy reqId into requestId', () => {
    const entry = logging.buildEntry('warn', 'slow', { reqId: 'legacy-1' });
    expect(entry.requestId).toBe('legacy-1');
    expect(entry['reqId']).toBeUndefined();
  });

  it('redacts sensitive keys', () => {
    const sanitized = logging.sanitize({ password: 'secret', token: 'abc', ok: 1 });
    expect(sanitized['password']).toBe('[REDACTED]');
    expect(sanitized['token']).toBe('[REDACTED]');
    expect(sanitized['ok']).toBe(1);
  });

  it('beacons errors without throwing', () => {
    logging.error('client boom', { requestId: 'r1', stack: 'secret-stack' });
    const req = httpMock.expectOne((r) => r.url.includes('/analytics/event'));
    expect(req.request.body.eventName).toBe('client_error');
    expect(req.request.body.metadata.requestId).toBe('r1');
    // Beacon always strips stacks.
    expect(req.request.body.metadata.stack).toBeUndefined();
    req.flush({ ok: true });
  });
});
