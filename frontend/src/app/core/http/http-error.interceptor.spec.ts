import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { NetworkStatusService } from '../network/network-status.service';
import { REQUEST_ID_HEADER } from '../observability/observability.constants';
import { DISABLE_HTTP_RETRY, HTTP_TIMEOUT_MS } from './http-context-tokens';
import { httpErrorInterceptor } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let diagnostics: {
    httpFailure: ReturnType<typeof vi.fn>;
    httpSlow: ReturnType<typeof vi.fn>;
    coldStart: ReturnType<typeof vi.fn>;
    retry: ReturnType<typeof vi.fn>;
  };
  let network: {
    isOnline: ReturnType<typeof vi.fn>;
    beginBackendWaking: ReturnType<typeof vi.fn>;
    endBackendWaking: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    diagnostics = {
      httpFailure: vi.fn(),
      httpSlow: vi.fn(),
      coldStart: vi.fn(),
      retry: vi.fn()
    };
    network = {
      isOnline: vi.fn(() => true),
      beginBackendWaking: vi.fn(),
      endBackendWaking: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: DiagnosticsService, useValue: diagnostics },
        { provide: NetworkStatusService, useValue: network }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('passes successful GET responses through unchanged', async () => {
    const promise = firstValueFrom(http.get('/api/ok'));
    const req = httpMock.expectOne('/api/ok');
    req.flush({ ok: true });
    await expect(promise).resolves.toEqual({ ok: true });
    expect(diagnostics.httpFailure).not.toHaveBeenCalled();
  });

  it('attaches X-Request-Id to outbound requests', async () => {
    const promise = firstValueFrom(http.get('/api/ok'));
    const req = httpMock.expectOne('/api/ok');
    const id = req.request.headers.get(REQUEST_ID_HEADER);
    expect(id).toBeTruthy();
    expect(id!.length).toBeGreaterThan(8);
    req.flush({ ok: true });
    await promise;
  });

  it('preserves an existing X-Request-Id header', async () => {
    const promise = firstValueFrom(
      http.get('/api/ok', { headers: { [REQUEST_ID_HEADER]: 'client-fixed-id' } })
    );
    const req = httpMock.expectOne('/api/ok');
    expect(req.request.headers.get(REQUEST_ID_HEADER)).toBe('client-fixed-id');
    req.flush({ ok: true });
    await promise;
  });

  it('does not retry non-transient 404 failures and logs with requestId', async () => {
    const promise = firstValueFrom(http.get('/api/missing'));
    const req = httpMock.expectOne('/api/missing');
    const outboundId = req.request.headers.get(REQUEST_ID_HEADER);
    req.flush(
      { requestId: 'server-rid', error: { code: 'NOT_FOUND' } },
      { status: 404, statusText: 'Not Found' }
    );

    await expect(promise).rejects.toMatchObject({ status: 404 });
    httpMock.expectNone('/api/missing');
    expect(diagnostics.httpFailure).toHaveBeenCalled();
    const [, classified, extras] = diagnostics.httpFailure.mock.calls[0];
    expect(classified.category).toBe('client');
    expect(classified.requestId).toBe('server-rid');
    expect(extras.requestId).toBe('server-rid');
    expect(extras.endpoint).toContain('/api/missing');
    expect(outboundId).toBeTruthy();
    expect(network.beginBackendWaking).not.toHaveBeenCalled();
  });

  it('retries transient 503 GET failures with backoff then logs terminal failure', async () => {
    vi.useFakeTimers();
    try {
      const promise = firstValueFrom(http.get('/api/slow'));

      httpMock.expectOne('/api/slow').flush('down', { status: 503, statusText: 'Unavailable' });
      await vi.advanceTimersByTimeAsync(1000);
      httpMock.expectOne('/api/slow').flush('down', { status: 503, statusText: 'Unavailable' });
      await vi.advanceTimersByTimeAsync(2000);
      httpMock.expectOne('/api/slow').flush('down', { status: 503, statusText: 'Unavailable' });

      await expect(promise).rejects.toMatchObject({ status: 503 });
      expect(network.beginBackendWaking).toHaveBeenCalled();
      expect(network.endBackendWaking).toHaveBeenCalled();
      expect(diagnostics.coldStart).toHaveBeenCalled();
      expect(diagnostics.retry).toHaveBeenCalled();
      expect(diagnostics.httpFailure).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips retry when DISABLE_HTTP_RETRY context is set', async () => {
    const context = new HttpContext().set(DISABLE_HTTP_RETRY, true).set(HTTP_TIMEOUT_MS, 5000);
    const promise = firstValueFrom(http.get('/api/once', { context }));
    httpMock.expectOne('/api/once').flush('down', { status: 503, statusText: 'Unavailable' });
    await expect(promise).rejects.toMatchObject({ status: 503 });
    httpMock.expectNone('/api/once');
    expect(network.beginBackendWaking).not.toHaveBeenCalled();
  });

  it('does not retry mutating POST requests by default', async () => {
    const promise = firstValueFrom(http.post('/api/write', { a: 1 }));
    httpMock.expectOne('/api/write').flush('down', { status: 503, statusText: 'Unavailable' });
    await expect(promise).rejects.toMatchObject({ status: 503 });
    httpMock.expectNone('/api/write');
  });
});
