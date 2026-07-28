import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError, toArray } from 'rxjs';
import { isEmptyValue, toAsyncState } from './async-state';

describe('isEmptyValue', () => {
  it('treats null, undefined, and empty arrays as empty', () => {
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue([1])).toBe(false);
    expect(isEmptyValue({ a: 1 })).toBe(false);
  });
});

describe('toAsyncState', () => {
  it('emits loading then success for non-empty data', async () => {
    const states = await firstValueFrom(toAsyncState(of({ id: 1 })).pipe(toArray()));
    expect(states).toEqual([{ status: 'loading' }, { status: 'success', data: { id: 1 } }]);
  });

  it('emits loading then empty for empty arrays', async () => {
    const states = await firstValueFrom(toAsyncState(of([])).pipe(toArray()));
    expect(states).toEqual([{ status: 'loading' }, { status: 'empty' }]);
  });

  it('emits offline when classify detects offline', async () => {
    const err = new HttpErrorResponse({ status: 0, statusText: 'Unknown' });
    const states = await firstValueFrom(
      toAsyncState(throwError(() => err), { isOnline: () => false }).pipe(toArray())
    );
    expect(states).toEqual([{ status: 'loading' }, { status: 'offline' }]);
  });

  it('emits timeout for TimeoutError', async () => {
    const states = await firstValueFrom(
      toAsyncState(throwError(() => ({ name: 'TimeoutError' }))).pipe(toArray())
    );
    expect(states).toEqual([{ status: 'loading' }, { status: 'timeout' }]);
  });

  it('emits error with classified AppHttpError for other failures', async () => {
    const err = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
    const states = await firstValueFrom(toAsyncState(throwError(() => err)).pipe(toArray()));
    expect(states[0]).toEqual({ status: 'loading' });
    expect(states[1].status).toBe('error');
    if (states[1].status === 'error') {
      expect(states[1].error.category).toBe('server');
      expect(states[1].error.status).toBe(500);
    }
  });
});
