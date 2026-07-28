import { Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { AppHttpError, classifyHttpError } from '../http/app-http-error';

/**
 * The one state shape every async view in the app should render from.
 * `empty` is intentionally distinct from `error` (Task 6/8) - a
 * successfully-returned empty list is not a failure.
 */
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty' }
  | { status: 'error'; error: AppHttpError }
  | { status: 'timeout' }
  | { status: 'offline' };

export function isEmptyValue(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  return false;
}

export interface ToAsyncStateOptions {
  /** Defaults to always-online when omitted. */
  isOnline?: () => boolean;
}

/**
 * Wraps any one-shot Observable<T> (a fresh HTTP call, not an already-seeded
 * BehaviorSubject cache - see BlogDataService.getCategoriesState()/
 * getVehiclesState() for that case) into a single AsyncState stream that a
 * template can render with one `@switch` instead of separate
 * loading/error/empty booleans.
 */
export function toAsyncState<T>(
  source$: Observable<T>,
  options: ToAsyncStateOptions = {}
): Observable<AsyncState<T>> {
  const isOnline = options.isOnline ?? (() => true);

  return source$.pipe(
    map((data): AsyncState<T> => (isEmptyValue(data) ? { status: 'empty' } : { status: 'success', data })),
    catchError((err): Observable<AsyncState<T>> => {
      const classified = classifyHttpError(err, isOnline());
      if (classified.category === 'offline') return of({ status: 'offline' });
      if (classified.category === 'timeout') return of({ status: 'timeout' });
      return of({ status: 'error', error: classified });
    }),
    startWith<AsyncState<T>>({ status: 'loading' })
  );
}
