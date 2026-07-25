import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found-page">
      <div class="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>Oops! We couldn't find the page you're looking for. It might have been moved, deleted, or perhaps it never existed.</p>
        <div class="actions">
          <a routerLink="/" class="btn-primary">Go to Homepage</a>
          <a routerLink="/search" class="btn-secondary">Search EVCorn</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-page {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F8FAFC;
      padding: 2rem;
      text-align: center;
    }
    .not-found-content {
      max-width: 500px;
      padding: 3rem;
      background: #FFFFFF;
      border-radius: 24px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.02);
    }
    h1 {
      font-size: 6rem;
      font-weight: 900;
      color: #7952FF;
      margin: 0;
      line-height: 1;
      background: linear-gradient(135deg, #7952FF, #10B981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h2 {
      font-size: 1.8rem;
      color: #0F172A;
      margin: 1rem 0;
      font-weight: 800;
    }
    p {
      font-size: 1.1rem;
      color: #64748B;
      line-height: 1.6;
      margin-bottom: 2.5rem;
    }
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #7952FF;
      color: white;
      border: none;
    }
    .btn-primary:hover {
      background: #6039DF;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(121, 82, 255, 0.2);
    }
    .btn-secondary {
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #E2E8F0;
    }
    .btn-secondary:hover {
      background: #E2E8F0;
      color: #0F172A;
      transform: translateY(-2px);
    }
  `]
})
export class NotFoundComponent implements OnInit {
  constructor(private seoService: SeoService) {}

  ngOnInit() {
    this.seoService.updateSeo({
      title: 'Page Not Found',
      description: 'The page you are looking for does not exist on EVCorn.',
      noindex: true
    });
  }
}
