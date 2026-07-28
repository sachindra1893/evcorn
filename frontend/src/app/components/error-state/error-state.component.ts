import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Shared error state with a "Try again" action (Tasks 2/12) - professional,
 * human, actionable copy instead of a generic "Something went wrong",
 * styled consistently with the dashed red treatment already used in
 * article-detail.ts's error box.
 */
@Component({
  selector: 'app-error-state',
  standalone: true,
  template: `
    <div class="app-error-state" role="alert">
      <span class="app-error-state-icon">⚠️</span>
      <p class="app-error-state-message">{{ message }}</p>
      @if (showRetry) {
        <button type="button" class="app-error-state-retry" (click)="retry.emit()">{{ retryLabel }}</button>
      }
    </div>
  `,
  styles: [`
    .app-error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 20px;
      background: #FFF5F5;
      border: 1px dashed #FEB2B2;
      border-radius: 12px;
    }
    .app-error-state-icon {
      font-size: 1.8rem;
      margin-bottom: 10px;
    }
    .app-error-state-message {
      font-size: 0.95rem;
      max-width: 420px;
      line-height: 1.5;
      margin: 0;
      color: #7A2E3B;
    }
    .app-error-state-retry {
      margin-top: 16px;
      background: #E53E3E;
      color: white;
      border: none;
      padding: 9px 20px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .app-error-state-retry:hover {
      background: #C53030;
      transform: translateY(-1px);
    }
  `]
})
export class ErrorStateComponent {
  @Input() message = 'Unable to load this content. Please try again in a few moments.';
  @Input() showRetry = true;
  @Input() retryLabel = 'Try Again';
  @Output() retry = new EventEmitter<void>();
}
