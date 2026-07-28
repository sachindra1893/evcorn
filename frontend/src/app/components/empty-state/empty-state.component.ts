import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Shared "meaningful empty state" (Task 6) - reused wherever a successful
 * request legitimately returns nothing (no articles, no vehicles, no search
 * results, no comparison result). Not a redesign - kept intentionally
 * minimal so it matches the plain, muted empty-state text already used
 * across the app (e.g. articles.ts's "No insights published...").
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="app-empty-state" role="status">
      <span class="app-empty-state-icon">{{ icon }}</span>
      <p class="app-empty-state-message">{{ message }}</p>
      @if (actionLabel) {
        <button type="button" class="app-empty-state-action" (click)="action.emit()">{{ actionLabel }}</button>
      }
    </div>
  `,
  styles: [`
    .app-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 20px;
      color: #64748B;
    }
    .app-empty-state-icon {
      font-size: 2rem;
      margin-bottom: 12px;
      opacity: 0.7;
    }
    .app-empty-state-message {
      font-size: 0.95rem;
      max-width: 380px;
      line-height: 1.5;
      margin: 0;
    }
    .app-empty-state-action {
      margin-top: 16px;
      background: transparent;
      border: 1px solid rgba(2, 132, 199, 0.3);
      color: #0284C7;
      padding: 8px 18px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .app-empty-state-action:hover {
      background: rgba(2, 132, 199, 0.05);
      border-color: #0284C7;
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = '📭';
  @Input() message = 'Nothing to show here yet.';
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
