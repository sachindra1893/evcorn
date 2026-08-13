import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { PreloadingStrategy, Route, provideRouter, withNavigationErrorHandler, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/http/http-error.interceptor';
import { GlobalErrorHandler } from './core/error-handling/global-error-handler';
import { handleNavigationError } from './core/error-handling/navigation-error-handler';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

/**
 * Phase 4: Selective idle preloading.
 * Prefetch only high-traffic public routes after a short idle delay.
 * Avoids PreloadAllModules downloading admin/energy/compare/etc. on every visit.
 */
export class SelectiveIdlePreloadingStrategy implements PreloadingStrategy {
  private static readonly PRELOAD_PATHS = new Set(['', 'evs', 'articles', 'search', 'about']);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const path = route.path ?? '';
    if (!SelectiveIdlePreloadingStrategy.PRELOAD_PATHS.has(path)) {
      return of(null);
    }
    // Defer past first paint / LCP window
    return timer(2500).pipe(mergeMap(() => load()));
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withPreloading(SelectiveIdlePreloadingStrategy),
      withNavigationErrorHandler(handleNavigationError)
    ),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    SelectiveIdlePreloadingStrategy, provideClientHydration(withEventReplay())
  ],
};
