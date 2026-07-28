import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LoggingService } from '../logging/logging.service';
import { AppNotificationService } from './app-notification.service';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let logging: { error: ReturnType<typeof vi.fn> };
  let notifications: { show: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    logging = { error: vi.fn() };
    notifications = { show: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: LoggingService, useValue: logging },
        { provide: AppNotificationService, useValue: notifications }
      ]
    });

    handler = TestBed.inject(GlobalErrorHandler);
  });

  it('ignores HttpErrorResponse so interceptor-owned failures are not double-reported', () => {
    handler.handleError(new HttpErrorResponse({ status: 500, statusText: 'Server Error' }));
    expect(logging.error).not.toHaveBeenCalled();
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('ignores zone-wrapped HttpErrorResponse rejections', () => {
    handler.handleError({
      rejection: new HttpErrorResponse({ status: 404, statusText: 'Not Found' })
    });
    expect(logging.error).not.toHaveBeenCalled();
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('logs and shows a refresh notice for uncaught application errors', () => {
    handler.handleError(new Error('component boom'));
    expect(logging.error).toHaveBeenCalledWith(
      'Unhandled application error',
      expect.objectContaining({ name: 'Error', message: 'component boom' })
    );
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('unexpected'),
        actionLabel: 'Refresh'
      })
    );
  });

  it('normalizes non-Error values into a string context', () => {
    handler.handleError('string failure');
    expect(logging.error).toHaveBeenCalledWith(
      'Unhandled application error',
      expect.objectContaining({ value: 'string failure' })
    );
    expect(notifications.show).toHaveBeenCalled();
  });
});
