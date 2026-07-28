import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BlogDataService, Article, Category } from '../../services/blog-data.service';
import { AuthService } from '../../services/auth.service';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { getOptimizedImageUrl } from '../../utils/image.utils';
import { ErrorStateComponent } from '../../components/error-state/error-state.component';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent, ErrorStateComponent],
  template: `
    <div class="articles-page animate-premium-fade">
      <div class="articles-header">
        <app-breadcrumb [paths]="[{label: 'Insights', url: '/articles'}]"></app-breadcrumb>
        <h1>EVCorn Insights</h1>
        <p class="subtitle">Latest reviews, guides, and comparisons from the Indian EV ecosystem</p>
      </div>

      <!-- Articles Section -->
      @if (loading) {
        <div class="skeleton-grid">
          @for (item of [1, 2, 3]; track item) {
            <div class="skeleton-card">
              <div class="skeleton-image"></div>
              <div class="skeleton-text line1"></div>
              <div class="skeleton-text line2"></div>
            </div>
          }
        </div>
      } @else if (error) {
        <app-error-state
          message="Unable to load insights right now. Please try again in a few moments."
          (retry)="loadData()">
        </app-error-state>
      } @else {
        @if (filteredArticles.length > 0) {
          
          <!-- Top Magazine Grid (Hero + Trending Side Stack) -->
          @if (selectedCategory === 'all' && heroArticle) {
            <div class="magazine-top-grid" [class.single-article]="trendingArticles.length === 0">
              <!-- Big Featured Hero Card -->
              <div class="hero-card-wrapper">
                <a [routerLink]="['/articles', heroArticle.id]" class="hero-article-link">
                  <div class="hero-article-card">
                    @if (heroArticle.imageUrl) {
                      <img [src]="getOptimizedUrl(heroArticle.imageUrl, 1200)" class="hero-image" alt="{{heroArticle.title}}" fetchpriority="high" decoding="async">
                    } @else {
                      <div class="hero-image-placeholder">⚡ EVCorn Featured</div>
                    }
                    <div class="hero-content">
                      <span class="hero-category-badge">{{ getCategoryName(heroArticle.categoryId, heroArticle.title) }}</span>
                      <h2>{{ heroArticle.title }}</h2>
                      <p>{{ heroArticle.description }}</p>
                      <span class="hero-read-more">Read Review →</span>
                    </div>
                  </div>
                </a>
              </div>

              <!-- Trending Side Stack -->
              @if (trendingArticles.length > 0) {
                <div class="trending-stack">
                  <h3 class="section-sub-title">Trending Insights</h3>
                  @for (art of trendingArticles; track art.id) {
                    <a [routerLink]="['/articles', art.id]" class="trending-row-link">
                      <div class="trending-row">
                        @if (art.imageUrl) {
                          <img [src]="getOptimizedUrl(art.imageUrl, 300)" class="trending-thumb" alt="{{art.title}}" loading="lazy" decoding="async" width="80" height="60">
                        }
                        <div class="trending-info">
                          <span class="trending-badge">{{ getCategoryName(art.categoryId, art.title) }}</span>
                          <h4>{{ art.title }}</h4>
                        </div>
                      </div>
                    </a>
                  }
                </div>
              }
            </div>
          }

          <!-- Bottom Feed (List View) -->
          <div class="feed-section">
            <h3 class="section-sub-title">
              {{ selectedCategory === 'all' ? 'Latest Stories' : getCategoryName(selectedCategory) + ' Articles' }}
            </h3>
            
            <div class="list-feed">
              @for (art of feedArticles; track art.id) {
                <div class="feed-item-card" [class.inactive-preview]="!art.active">
                  @if (art.active) {
                    <a [routerLink]="['/articles', art.id]" class="feed-item-layout">
                      <div class="feed-media">
                        @if (art.imageUrl) {
                          <img [src]="getOptimizedUrl(art.imageUrl, 600)" class="feed-thumb" alt="{{art.title}}" loading="lazy" decoding="async" width="280" height="180">
                        } @else {
                          <div class="feed-thumb-placeholder">⚡</div>
                        }
                      </div>
                      
                      <div class="feed-details">
                        <div class="feed-header-row">
                          <span class="feed-badge">{{ getCategoryName(art.categoryId, art.title) }}</span>
                          @if (authService.isAuthenticated()) {
                            <button 
                              (click)="onDeleteArticle(art.id!, art.title, $event)" 
                              class="delete-card-btn"
                              title="Delete Article"
                            >
                              🗑️
                            </button>
                          }
                        </div>
                        <h4>{{ art.title }}</h4>
                        <p>{{ art.description }}</p>
                        <span class="feed-read-more">Read Article →</span>
                      </div>
                    </a>
                  } @else {
                    <div class="feed-item-layout coming-soon-layout" (click)="showComingSoonAlert(art.title)">
                      <div class="feed-media">
                        @if (art.imageUrl) {
                          <img [src]="getOptimizedUrl(art.imageUrl, 600)" class="feed-thumb" alt="{{art.title}}" loading="lazy" decoding="async" width="280" height="180">
                        } @else {
                          <div class="feed-thumb-placeholder">⚡</div>
                        }
                      </div>
                      
                      <div class="feed-details">
                        <div class="feed-header-row">
                          <span class="feed-badge preview-badge">Preview</span>
                          @if (authService.isAuthenticated()) {
                            <button 
                              (click)="onDeleteArticle(art.id!, art.title, $event)" 
                              class="delete-card-btn"
                              title="Delete Article"
                            >
                              🗑️
                            </button>
                          }
                        </div>
                        <h4>{{ art.title }}</h4>
                        <p>{{ art.description }}</p>
                        <span class="badge-coming-soon">Coming Soon</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

        } @else {
          <div class="no-articles">
            <p>No insights published for this brand category yet.</p>
            @if (authService.isAuthenticated()) {
              <a routerLink="/admin" class="write-btn">Publish an Article</a>
            }
          </div>
        }
      }
    </div>
  `,
  styles: []
})
export class ArticlesComponent implements OnInit {
  articles: Article[] = [];
  categories: Category[] = [];
  selectedCategory = 'all';
  loading = true;
  /** Distinguishes a confirmed backend failure from genuinely zero articles (Task 6/8). */
  error = false;

  constructor(
    private route: ActivatedRoute,
    private dataService: BlogDataService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private seoService: SeoService,
    private schemaService: SchemaService,
    public authService: AuthService
  ) {}

  getOptimizedUrl(url: string | undefined | null, width?: number): string {
    return getOptimizedImageUrl(url, width);
  }

  ngOnInit() {
    this.seoService.updateSeo({
      title: 'EV Reviews & News India 2026 | EVCorn Insights',
      description: 'Read the latest electric vehicle reviews, news, battery technology updates, and charging infrastructure developments in India.'
    });

    this.schemaService.setSchema([
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '' },
        { name: 'Articles', url: '/articles' }
      ]),
      this.schemaService.buildCollectionPage(
        'EV Reviews & News India',
        'Read the latest electric vehicle reviews, news, battery technology updates, and charging infrastructure developments in India.'
      )
    ]);
    
    this.loadData();

    // Subscribe to query parameters to support brand filtering redirects from home page
    this.route.queryParams.subscribe(params => {
      const categoryParam = params['category'];
      if (categoryParam) {
        this.selectedCategory = categoryParam;
      } else {
        this.selectedCategory = 'all';
      }
      this.cdr.detectChanges();
    });
  }

  loadData() {
    this.loading = true;
    this.error = false;

    // Load categories
    this.dataService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.categories = [];
        this.cdr.detectChanges();
      }
    });

    // Load lightweight article overview cards (no heavy body content) — 0ms instant load
    this.dataService.getArticlesLight().subscribe({
      next: (data) => {
        this.articles = ((data as Article[]) || []).sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // Confirmed network/server failure - distinct from a genuinely empty
        // catalog, so the user sees a retry-able error instead of "No
        // insights published yet" (Task 6/8).
        this.articles = [];
        this.loading = false;
        this.error = true;
        this.cdr.detectChanges();
      }
    });
  }

  selectCategory(catId: string) {
    this.selectedCategory = catId;
    this.cdr.detectChanges();
  }

  getCategoryName(catId: string | undefined, title?: string): string {
    if (title) {
      const tLower = title.toLowerCase();
      // General guides, maintenance, battery, charging topics should ALWAYS be tagged as "EV"
      if (
        tLower.includes('battery') || 
        tLower.includes('batteries') || 
        tLower.includes('lifespan') || 
        tLower.includes('degradation') || 
        tLower.includes('charging') ||
        tLower.includes('guide') ||
        tLower.includes('cost')
      ) {
        return 'EV';
      }
    }
    if (!catId || catId === 'ev' || catId === 'general') return 'EV';
    const cat = this.categories.find(c => c.id === catId);
    return cat ? cat.name : 'EV';
  }

  hasArticlesForCategory(catId: string): boolean {
    return this.articles.some(art => art.categoryId === catId && art.active);
  }

  get filteredArticles(): Article[] {
    const activeArticles = this.articles.filter(art => art.active !== false);
    if (!this.selectedCategory || this.selectedCategory === 'all') {
      return activeArticles;
    }
    return activeArticles.filter(art => art.categoryId === this.selectedCategory);
  }

  get heroArticle(): Article | null {
    const list = this.filteredArticles.filter(a => a.active !== false);
    return list.length > 0 ? list[0] : null;
  }

  get trendingArticles(): Article[] {
    const list = this.filteredArticles.filter(a => a.active !== false);
    return list.length > 1 ? list.slice(1, 4) : []; // Up to 3 trending items
  }

  get feedArticles(): Article[] {
    const activeList = this.filteredArticles;
    
    if (this.selectedCategory === 'all') {
      const hero = this.heroArticle;
      const trending = this.trendingArticles;
      const skipIds = [hero?.id, ...trending.map(t => t.id)].filter(Boolean);
      
      return activeList.filter(art => !skipIds.includes(art.id));
    }
    
    return activeList;
  }

  showComingSoonAlert(title: string) {
    alert(`"${title}" is currently under preparation and will be published soon!`);
  }

  onDeleteArticle(id: string, title: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      this.dataService.deleteArticle(id).subscribe(() => {
        this.loadData();
      });
    }
  }
}
