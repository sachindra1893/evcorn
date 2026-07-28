import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { LoggingService } from '../logging/logging.service';
import { NetworkStatusService } from '../network/network-status.service';
import { DISABLE_HTTP_RETRY, HTTP_TIMEOUT_MS } from './http-context-tokens';
import { httpErrorInterceptor } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let logging: { error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
  let network: {
    isOnline: ReturnType<typeof vi.fn>;
    beginBackendWaking: ReturnType<typeof vi.fn>;
    endBackendWaking: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    logging = {
      error: vi.fn(),
      warn: vi.fn()
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
        { provide: LoggingService, useValue: logging },
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
    expect(logging.error).not.toHaveBeenCalled();
  });

  it('does not retry non-transient 404 failures', async () => {
    const promise = firstValueFrom(http.get('/api/missing'));
    const req = httpMock.expectOne('/api/missing');
    req.flush({ error: { code: 'NOT_FOUND' } }, { status: 404, statusText: 'Not Found' });

    await expect(promise).rejects.toMatchObject({ status: 404 });
    httpMock.expectNone('/api/missing');
    expect(logging.error).toHaveBeenCalled();
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
      expect(logging.warn).toHaveBeenCalled();
      expect(logging.error).toHaveBeenCalled();
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
