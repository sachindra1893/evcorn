import { TestBed } from '@angular/core/testing';
import { DiagnosticsService } from './diagnostics.service';
import { diagnosticKindFromHttp } from './diagnostic.types';
import { LoggingService } from '../logging/logging.service';
import type { AppHttpError } from '../http/app-http-error';

describe('diagnosticKindFromHttp', () => {
  it('maps Phase 1 categories to Phase 2 diagnostic kinds', () => {
    expect(diagnosticKindFromHttp('offline', 0)).toBe('network_offline');
    expect(diagnosticKindFromHttp('timeout', 0)).toBe('timeout');
    expect(diagnosticKindFromHttp('server', 503)).toBe('backend_5xx');
    expect(diagnosticKindFromHttp('client', 404)).toBe('not_found');
    expect(diagnosticKindFromHttp('client', 422)).toBe('validation');
    expect(diagnosticKindFromHttp('client', 400)).toBe('validation');
    expect(diagnosticKindFromHttp('unknown', 0)).toBe('unknown');
  });
});

describe('DiagnosticsService', () => {
  let diagnostics: DiagnosticsService;
  let logging: {
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    logging = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    TestBed.configureTestingModule({
      providers: [DiagnosticsService, { provide: LoggingService, useValue: logging }]
    });
    diagnostics = TestBed.inject(DiagnosticsService);
  });

  it('httpFailure logs structured diagnostic with kind and requestId', () => {
    const classified: AppHttpError = {
      category: 'server',
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      requestId: 'rid-9',
      userMessage: 'down',
      retryable: true,
      originalError: null
    };

    diagnostics.httpFailure('GET /api/x failed', classified, {
      durationMs: 1200,
      endpoint: '/api/x',
      method: 'GET'
    });

    expect(logging.error).toHaveBeenCalledWith(
      'GET /api/x failed',
      expect.objectContaining({
        kind: 'backend_5xx',
        eventType: 'http_failure',
        requestId: 'rid-9',
        durationMs: 1200,
        endpoint: '/api/x',
        status: 503,
        code: 'SERVICE_UNAVAILABLE'
      })
    );
  });

  it('httpSlow emits warn with slow_request kind', () => {
    diagnostics.httpSlow('Slow API', {
      requestId: 'r',
      durationMs: 4000,
      endpoint: '/api/y'
    });
    expect(logging.warn).toHaveBeenCalledWith(
      'Slow API',
      expect.objectContaining({
        eventType: 'http_slow',
        kind: 'slow_request',
        durationMs: 4000
      })
    );
  });

  it('maps 404 client errors to not_found diagnostic kind', () => {
    diagnostics.httpFailure('missing', {
      category: 'client',
      status: 404,
      requestId: 'n1',
      userMessage: 'gone',
      retryable: false,
      originalError: null
    });
    expect(logging.error).toHaveBeenCalledWith(
      'missing',
      expect.objectContaining({ kind: 'not_found' })
    );
  });
});
