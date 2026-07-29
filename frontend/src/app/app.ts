import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { OfflineBannerComponent } from './components/offline-banner/offline-banner.component';
import { NetworkStatusService } from './core/network/network-status.service';
import { AppNotificationService } from './core/error-handling/app-notification.service';
import { RouteTimingService } from './core/observability/route-timing.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer, OfflineBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'evcorn-app';
  isRouteReady = false;

  private readonly network = inject(NetworkStatusService);
  private readonly notifications = inject(AppNotificationService);
  /** Eagerly construct so router navigation timing is recorded app-wide. */
  private readonly _routeTiming = inject(RouteTimingService);

  /**
   * Root-Cause Cluster F (frontend handling): surfaced globally so any
   * page's failed/slow request during a backend cold-start shows a clear
   * "waking up" message instead of silently rendering as an empty/blank
   * section. Now sourced from NetworkStatusService, which every request in
   * the app reports into via the centralized HTTP interceptor - not just
   * BlogDataService's original 6 methods.
   */
  readonly isBackendWaking = this.network.backendWaking;

  /** Global, non-blocking fallback notice driven by GlobalErrorHandler. */
  readonly notice = this.notifications.current;

  onActivate() {
    // Show footer and other deferred elements once the routed component is active
    this.isRouteReady = true;
  }

  dismissNotice() {
    this.notifications.dismiss();
  }

  runNoticeAction() {
    this.notice()?.action?.();
    this.notifications.dismiss();
  }
}
