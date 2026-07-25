import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="breadcrumb-nav" aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        <li class="breadcrumb-item">
          <a routerLink="/" class="breadcrumb-link" aria-label="Home">
            <svg class="home-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </a>
        </li>
        
        <ng-container *ngFor="let path of paths; let last = last">
          <li class="breadcrumb-separator" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </li>
          <li class="breadcrumb-item" [attr.aria-current]="last ? 'page' : null">
            <a *ngIf="!last" [routerLink]="path.url" class="breadcrumb-link">{{ path.label }}</a>
            <span *ngIf="last" class="breadcrumb-current">{{ path.label }}</span>
          </li>
        </ng-container>
      </ol>
    </nav>
  `,
  styles: [`
    .breadcrumb-nav {
      padding: 1rem 0;
      margin-bottom: 0.5rem;
    }
    
    .breadcrumb-list {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      list-style: none;
      padding: 0;
      margin: 0;
      gap: 0.5rem;
    }
    
    .breadcrumb-item {
      display: flex;
      align-items: center;
    }
    
    .breadcrumb-link {
      color: #64748B;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      transition: color 0.2s ease, text-decoration-color 0.2s ease;
      text-decoration-color: transparent;
    }
    
    .breadcrumb-link:hover {
      color: #0F172A;
      text-decoration: underline;
      text-decoration-color: rgba(15, 23, 42, 0.2);
    }
    
    .home-icon {
      width: 16px;
      height: 16px;
    }
    
    .breadcrumb-separator {
      color: #CBD5E1;
      display: flex;
      align-items: center;
    }
    
    .breadcrumb-current {
      color: #0F172A;
      font-size: 0.9rem;
      font-weight: 600;
    }
    
    @media (max-width: 640px) {
      .breadcrumb-nav {
        padding: 0.75rem 0;
      }
      .breadcrumb-link, .breadcrumb-current {
        font-size: 0.85rem;
      }
    }
  `]
})
export class BreadcrumbComponent {
  @Input() paths: { label: string, url: string }[] = [];
}
