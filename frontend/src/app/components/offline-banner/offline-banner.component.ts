import { Component, inject } from '@angular/core';
import { NetworkStatusService } from '../../core/network/network-status.service';

/**
 * Task 7 - Offline detection. Bound directly to NetworkStatusService's
 * signal so it appears/disappears immediately as the browser's online
 * status changes, with no page-specific wiring needed.
 */
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  template: `
    @if (!network.online()) {
      <div class="offline-banner" role="status">
        📡 You appear to be offline. We'll keep trying automatically once you're back online.
      </div>
    }
  `,
  styles: [`
    .offline-banner {
      position: sticky;
      top: 0;
      z-index: 1001;
      width: 100%;
      padding: 8px 16px;
      background: #FEE2E2;
      color: #991B1B;
      font-size: 0.85rem;
      text-align: center;
      border-bottom: 1px solid #FCA5A5;
    }
  `]
})
export class OfflineBannerComponent {
  readonly network = inject(NetworkStatusService);
}
