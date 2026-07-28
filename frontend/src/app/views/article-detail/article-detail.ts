import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { BlogDataService, Article } from '../../services/blog-data.service';
import { getOptimizedImageUrl } from '../../utils/image.utils';
import { BlockRendererComponent } from '../../components/block-renderer/block-renderer.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { CommonModule } from '@angular/common';
import { classifyHttpError } from '../../core/http/app-http-error';
import { NetworkStatusService } from '../../core/network/network-status.service';

type ArticleLoadState = 'loading' | 'loaded' | 'notFound';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [RouterLink, BlockRendererComponent, CommonModule, BreadcrumbComponent],
  template: `
    <div class="article-page animate-premium-fade">
      @if (state === 'loading') {
        <div class="article-container" aria-busy="true" aria-live="polite">
          <div class="banner-container skeleton-block"></div>
          <div class="article-content">
            <div class="skeleton-line skeleton-breadcrumb"></div>
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-title short"></div>
            <div class="skeleton-line skeleton-meta"></div>
            <div class="skeleton-line skeleton-paragraph"></div>
            <div class="skeleton-line skeleton-paragraph"></div>
            <div class="skeleton-line skeleton-paragraph short"></div>
            <div class="skeleton-line skeleton-paragraph"></div>
            <div class="skeleton-line skeleton-paragraph medium"></div>
          </div>
        </div>
      } @else if (state === 'loaded' && loadedArticles.length > 0) {
        @for (article of loadedArticles; track article.id) {
          <div class="article-container">
            @if (article.imageUrl) {
              <div class="banner-container">
                <img [src]="getOptimizedUrl(article.imageUrl, 1200)" class="banner-image" alt="{{article.title}}" fetchpriority="high" decoding="async">
              </div>
            }
            <div class="article-content">
              <app-breadcrumb [paths]="[{label: 'Insights', url: '/articles'}, {label: article.title, url: '/articles/' + article.id}]"></app-breadcrumb>
              <span class="category-tag">News</span>
              <h1>{{ article.title }}</h1>
              
              <!-- Under title Share Bar -->
              <div class="article-meta-row">
                <span class="post-date">Published by EVCorn • ⏳ {{ getReadingTime(article) }} min read</span>
                <button (click)="shareArticle(article)" class="share-btn" title="Share this article">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7L15.9 7.33c.53.48 1.22.78 1.98.78 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.52 9.34 6.84 9.05 6 9.05c-1.66 0-3 1.34-3 3s1.34 3 3 3c.84 0 1.52-.29 2.04-.76l7.97 4.65c-.03.22-.05.45-.05.67 0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9-1.3-2.9-2.9-2.9z"/>
                  </svg>
                  <span>Share</span>
                </button>
              </div>
              
              <!-- Table of Contents -->
              <div *ngIf="getTOC(article).length > 0" class="toc-container">
                <h4 class="toc-title">Table of Contents</h4>
                <ul class="toc-list">
                  <li *ngFor="let item of getTOC(article)" [ngClass]="{'toc-h2': item.level === 2, 'toc-h3': item.level === 3}">
                    <a (click)="scrollToId(item.id)">{{ item.text }}</a>
                  </li>
                </ul>
              </div>
              
              <app-block-renderer *ngIf="article.blocks && article.blocks.length > 0" [blocks]="article.blocks" [vehicles]="vehicles"></app-block-renderer>
              
              <!-- Backward compatibility for old articles without blocks -->
              <ng-container *ngIf="!article.blocks || article.blocks.length === 0">
                @for (paragraph of article.paragraphs; track paragraph) {
                  <p *ngIf="!paragraph.startsWith('__EVBLOCKS__')" [innerHTML]="autoLinkOld(paragraph)"></p>
                }
              </ng-container>
              
              <!-- Door 1: Join the Discussion Button -->
              @if (!commentsLoaded[article.id!]) {
                <div class="comments-trigger-container">
                  <button (click)="loadComments(article)" class="comments-trigger-btn">
                    💬 Join the Discussion
                  </button>
                </div>
              }

              <!-- Door 2: Native Disqus Comments -->
              @if (commentsLoaded[article.id!]) {
                <div [id]="'comments-placeholder-' + article.id" class="comments-section">
                  <!-- Disqus thread will mount here -->
                </div>
              }

              <!-- Automated Related Cars -->
              <div *ngIf="getRelatedCars(article).length > 0" class="related-cars-section">
                <h3>Cars Mentioned in this Article</h3>
                <div class="related-grid">
                  <a *ngFor="let car of getRelatedCars(article)" [routerLink]="['/compare']" [queryParams]="{ model: car.model }" class="related-card">
                    <div class="related-img-wrapper" *ngIf="car.imageUrl">
                      <img [src]="getOptimizedUrl(car.imageUrl, 200)" [alt]="car.brand + ' ' + car.model" loading="lazy" decoding="async" width="60" height="40" />
                    </div>
                    <div class="related-card-content">
                      <h4>{{ car.brand }} {{ car.model }}</h4>
                      <p class="car-spec-mini" *ngIf="car.range">Range: {{ car.range }} km</p>
                    </div>
                  </a>
                </div>
              </div>

              <!-- Automatic Related Articles -->
              <div *ngIf="getRelatedArticles(article).length > 0" class="related-articles-section">
                <h3>Keep Reading</h3>
                <div class="related-grid">
                  <a *ngFor="let rel of getRelatedArticles(article)" [routerLink]="['/articles', rel.id]" class="related-card" (click)="scrollToTop()">
                    <div class="related-img-wrapper" *ngIf="rel.imageUrl">
                      <img [src]="getOptimizedUrl(rel.imageUrl, 300)" [alt]="rel.title" loading="lazy" decoding="async" width="80" height="50" />
                    </div>
                    <div class="related-card-content">
                      <h4>{{ rel.title }}</h4>
                    </div>
                  </a>
                </div>
              </div>

              <!-- Loop Navigation -->
              <div class="article-footer-nav">
                <a routerLink="/articles" class="back-btn-flat">Back to Articles</a>
                @if (articlesQueue.length > 0) {
                  <span class="scroll-prompt">
                    Keep scrolling down for the next story... ↓
                  </span>
                }
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="article-container not-found">
          <div class="article-content">
            @if (errorKind === 'network') {
              <h1>Unable to Load Article</h1>
              <p>{{ errorMessage }}</p>
              <button type="button" (click)="retryLoad()" class="back-btn" style="background: none; cursor: pointer; margin-right: 12px;">↻ Try Again</button>
            } @else {
              <h1>Article Not Found</h1>
              <p>The requested article could not be loaded.</p>
            }
            <a routerLink="/articles" class="back-btn">Back to Articles</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .article-page {
      min-height: 90vh;
      background: #F8F9FA;
      padding: clamp(100px, 12vh, 120px) clamp(10px, 4vw, 20px) 60px clamp(10px, 4vw, 20px);
    }
    .article-container {
      max-width: 900px;
      margin: clamp(20px, 5vw, 40px) auto 60px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      border: 1px solid rgba(0, 0, 0, 0.06);
      overflow: hidden;
      padding: 0;
    }
    .banner-container {
      width: 100%;
      aspect-ratio: 21 / 9;
      height: auto;
      min-height: 200px;
      max-height: 420px;
      overflow: hidden;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    .banner-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .article-content {
      padding: clamp(20px, 5vw, 40px);
    }
    .not-found {
      text-align: center;
    }

    /* Loading skeleton */
    .skeleton-block {
      background: linear-gradient(90deg, #EEF1F4 25%, #E4E8EC 37%, #EEF1F4 63%);
      background-size: 400% 100%;
      animation: skeleton-shimmer 1.4s ease infinite;
    }
    .skeleton-line {
      height: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      background: linear-gradient(90deg, #EEF1F4 25%, #E4E8EC 37%, #EEF1F4 63%);
      background-size: 400% 100%;
      animation: skeleton-shimmer 1.4s ease infinite;
    }
    .skeleton-breadcrumb {
      width: 40%;
      height: 14px;
      margin-bottom: 24px;
    }
    .skeleton-title {
      width: 90%;
      height: 30px;
      margin-bottom: 12px;
    }
    .skeleton-title.short {
      width: 55%;
      margin-bottom: 25px;
    }
    .skeleton-meta {
      width: 45%;
      height: 14px;
      margin-bottom: 25px;
    }
    .skeleton-paragraph {
      width: 100%;
    }
    .skeleton-paragraph.short {
      width: 65%;
    }
    .skeleton-paragraph.medium {
      width: 80%;
    }
    @keyframes skeleton-shimmer {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton-block, .skeleton-line {
        animation: none;
      }
    }
    .category-tag {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(0, 136, 204, 0.05);
      color: #0088CC;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    h1 {
      font-size: clamp(1.8rem, 5vw, 2.5rem);
      margin-bottom: clamp(15px, 4vw, 25px);
      text-align: left;
      color: #1D1D1F;
      line-height: 1.3;
    }
    .article-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    .post-date {
      color: #718096;
      font-size: 0.95rem;
      font-weight: 500;
    }
    .share-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid rgba(0, 136, 204, 0.2);
      color: #0088CC;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .share-btn:hover {
      background: rgba(0, 136, 204, 0.05);
      border-color: #0088CC;
      transform: translateY(-1px);
    }
    .share-btn:active {
      transform: translateY(0);
    }
    p {
      font-size: clamp(1.05rem, 2.2vw, 1.15rem);
      line-height: 1.8;
      color: #2D3748;
      margin-bottom: 24px;
      white-space: pre-wrap;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    
    /* Table of Contents */
    .toc-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .toc-title {
      font-size: 1.2rem;
      margin-top: 0;
      margin-bottom: 12px;
      color: #0f172a;
    }
    .toc-list {
      list-style-type: none;
      padding-left: 0;
      margin: 0;
    }
    .toc-list li {
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .toc-list li a {
      color: #0284c7;
      text-decoration: none;
      cursor: pointer;
      transition: color 0.2s;
    }
    .toc-list li a:hover {
      color: #0369a1;
      text-decoration: underline;
    }
    .toc-h2 {
      font-weight: 600;
      font-size: 1.05rem;
    }
    .toc-h3 {
      padding-left: 20px;
      font-size: 0.95rem;
      color: #475569;
    }
    
    /* Related Articles */
    .related-articles-section {
      margin-top: 50px;
      padding-top: 40px;
      border-top: 2px solid #f1f5f9;
    }
    .related-articles-section h3 {
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: #0f172a;
    }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 20px;
    }
    .related-card {
      text-decoration: none;
      color: inherit;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }
    .related-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .related-img-wrapper {
      height: 120px;
      overflow: hidden;
    }
    .related-img-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .related-card-content {
      padding: 15px;
      flex-grow: 1;
    }
    .related-card-content h4 {
      margin: 0;
      font-size: 1rem;
      line-height: 1.4;
      color: #1e293b;
    }
    .car-spec-mini {
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 5px;
      margin-bottom: 0;
    }
    .related-cars-section {
      margin-top: 50px;
      padding-top: 40px;
      border-top: 2px solid #f1f5f9;
    }
    .related-cars-section h3 {
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: #0f172a;
    }

    .comments-trigger-container {
      text-align: center;
      margin-top: 40px;
      padding: 30px 0;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }
    .comments-trigger-btn {
      background: #0088CC;
      color: #FFFFFF;
      border: none;
      padding: 14px 30px;
      border-radius: 30px;
      font-size: 1.05rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(0, 136, 204, 0.15);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .comments-trigger-btn:hover {
      background: #006699;
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(0, 136, 204, 0.25);
    }
    .comments-trigger-btn:active {
      transform: translateY(0);
    }
    .comments-section {
      margin-top: 40px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 30px;
      background: #FAFAFA;
      margin-left: -clamp(20px, 5vw, 40px);
      margin-right: -clamp(20px, 5vw, 40px);
      margin-bottom: -clamp(20px, 5vw, 40px);
      padding-left: clamp(20px, 5vw, 40px);
      padding-right: clamp(20px, 5vw, 40px);
      padding-bottom: clamp(20px, 5vw, 40px);
      min-height: 350px;
    }
    .article-footer-nav {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }
    .back-btn {
      display: inline-block;
      margin-top: 30px;
      padding: 10px 18px;
      border: 1px solid #0088CC;
      border-radius: 6px;
      text-decoration: none;
      color: #0088CC;
      transition: all 0.3s ease;
      font-weight: 600;
    }
    .back-btn:hover {
      background-color: #0088CC;
      color: #FFFFFF;
    }
    .back-btn-flat {
      font-size: 0.95rem;
      text-decoration: none;
      color: #0088CC;
      font-weight: 600;
      transition: color 0.2s ease;
    }
    .back-btn-flat:hover {
      color: #005580;
    }
    .scroll-prompt {
      font-size: 0.9rem;
      color: #718096;
      font-style: italic;
    }
    @media (max-width: 768px) {
      .article-page {
        padding: 85px 8px 30px 8px;
      }
      .article-container {
        margin: 10px auto 40px auto;
        border-radius: 8px;
      }
      .banner-container {
        aspect-ratio: 16 / 9;
        min-height: 160px;
      }
      .article-content {
        padding: 20px 16px;
      }
      .comments-section {
        margin-left: -16px;
        margin-right: -16px;
        margin-bottom: -20px;
        padding-left: 16px;
        padding-right: 16px;
        padding-bottom: 20px;
      }
      h1 {
        font-size: 1.6rem;
        margin-bottom: 15px;
      }
      p {
        font-size: 1.05rem;
        line-height: 1.7;
        margin-bottom: 18px;
      }
    }
  `]
})
export class ArticleDetailComponent implements OnInit, OnDestroy {
  private sub = new Subscription();
  /**
   * Explicit tri-state instead of inferring "not found" from an empty array.
   * `loadedArticles` starts empty every time (before this fix, the template
   * treated "empty" and "confirmed missing" identically, so it rendered
   * "Article Not Found" for the ~2-3s the network request was in flight,
   * then swapped to the real article once the response arrived).
   */
  state: ArticleLoadState = 'loading';
  /** Distinguishes a confirmed-missing article (404) from a network/backend failure so the message and retry action are accurate (Task 12). */
  errorKind: 'notFound' | 'network' = 'notFound';
  loadedArticles: Article[] = [];
  articlesQueue: Article[] = [];
  vehicles: any[] = [];
  commentsLoaded: { [articleId: string]: boolean } = {};
  errorMessage = '';
  loadingNext = false;
  private currentArticleId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private dataService: BlogDataService,
    private cdr: ChangeDetectorRef,
    private seoService: SeoService,
    private schemaService: SchemaService,
    private network: NetworkStatusService
  ) {}

  getOptimizedUrl(url: string | undefined | null, width?: number): string {
    return getOptimizedImageUrl(url, width);
  }

  ngOnInit() {
    this.sub.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (!id) {
          this.state = 'notFound';
          this.cdr.detectChanges();
          return;
        }

        this.currentArticleId = id;
        this.loadArticle(id);
      })
    );
  }

  private loadArticle(id: string) {
    // Reset for every new article id (e.g. navigating from one article's
    // "Keep Reading" link to another re-uses this component instance).
    this.state = 'loading';
    this.loadedArticles = [];
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.sub.add(
      this.dataService.getArticleById(id).subscribe({
        next: (article) => {
          // getArticleById seeds its observable with the last localStorage
          // snapshot (or `null` if none exists) so it can emit synchronously
          // before the network request resolves. A `null` here just means
          // "no cached snapshot yet" — it is NOT confirmation the article is
          // missing, so we stay in the `loading` state and wait for either a
          // real article (this same `next`) or a confirmed failure (`error`).
          if (!article) return;

          // Restore blocks from the serialized payload if the backend stripped the blocks array
          if ((!article.blocks || article.blocks.length === 0) && article.paragraphs && article.paragraphs.length > 0) {
            if (article.paragraphs[0].startsWith('__EVBLOCKS__')) {
              try {
                article.blocks = JSON.parse(article.paragraphs[0].substring(12));
                article.paragraphs.shift(); // Remove the serialized block from paragraphs array
              } catch {
                // Malformed serialized blocks - fall back to rendering plain paragraphs.
              }
            }
          }

          this.loadedArticles = [article];
          this.errorMessage = '';
          this.state = 'loaded';
          this.updateSEOMetadata(article);
          this.cdr.detectChanges();
        },
        error: (err) => {
          // Only reached once the API request has actually completed and
          // failed - either a confirmed 404 (article genuinely missing) or a
          // transient network/server failure. Distinguishing the two avoids
          // telling a user "Not Found" when the real cause is a dropped
          // connection or a sleeping backend, and gives them a way to retry.
          const classified = classifyHttpError(err, this.network.isOnline());
          const isConfirmedMissing = classified.category === 'client' && classified.status === 404;

          this.errorKind = isConfirmedMissing ? 'notFound' : 'network';
          this.errorMessage = isConfirmedMissing ? '' : classified.userMessage;
          this.loadedArticles = [];
          this.state = 'notFound';
          this.updateSEOMetadata(null);
          this.cdr.detectChanges();
        }
      })
    );
  }

  retryLoad() {
    if (this.currentArticleId) {
      this.dataService.clearAllCaches();
      this.loadArticle(this.currentArticleId);
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.schemaService.setSchema([]);
  }

  shareArticle(article: Article) {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const shareUrl = `https://evcorn.com/articles/${article.id}`;
    const shareData = {
      title: article.title,
      text: article.description || 'Check out this article on EVCorn!',
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData)
        .then(() => console.log('Article shared successfully'))
        .catch((err) => console.log('Error sharing article:', err));
    } else {
      // Fallback: Copy link to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard! Share it anywhere.');
      }).catch((err) => {
        console.error('Failed to copy link:', err);
      });
    }
  }

  // --- Automation Helpers ---

  getReadingTime(article: Article): number {
    let wordCount = 0;
    if (article.blocks) {
      article.blocks.forEach(block => {
        if (block.type === 'paragraph' && block.data.text) {
          wordCount += block.data.text.split(/\s+/).length;
        } else if (block.type === 'heading' && block.data.text) {
          wordCount += block.data.text.split(/\s+/).length;
        } else if (block.type === 'quote' && block.data.text) {
          wordCount += block.data.text.split(/\s+/).length;
        }
      });
    } else if (article.paragraphs) {
      article.paragraphs.forEach(p => {
        wordCount += p.split(/\s+/).length;
      });
    }
    const mins = Math.ceil(wordCount / 200);
    return mins < 1 ? 1 : mins;
  }

  getTOC(article: Article): { id: string; text: string; level: number }[] {
    if (!article.blocks) return [];
    return article.blocks
      .filter((b: any) => b.type === 'heading' && (b.data.level === 2 || b.data.level === 3))
      .map((b: any) => ({
        id: b.id,
        text: b.data.text,
        level: b.data.level
      }));
  }

  scrollToId(id: string) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  relatedArticlesCache: { [id: string]: Article[] } = {};

  getRelatedArticles(article: Article): Article[] {
    if (!article.id) return [];
    if (this.relatedArticlesCache[article.id]) {
      return this.relatedArticlesCache[article.id];
    }
    // Pick 3 random articles from the queue
    const shuffled = [...this.articlesQueue].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    this.relatedArticlesCache[article.id] = selected;
    return selected;
  }

  relatedCarsCache: { [id: string]: any[] } = {};

  getRelatedCars(article: Article): any[] {
    if (!article.id || !this.vehicles || this.vehicles.length === 0) return [];
    if (this.relatedCarsCache[article.id]) return this.relatedCarsCache[article.id];

    // Build one large string from all blocks to search
    let fullText = '';
    if (article.blocks) {
      article.blocks.forEach(b => {
        if (b.data && (b.data as any).text) fullText += ' ' + (b.data as any).text.toLowerCase();
      });
    } else if (article.paragraphs) {
      fullText = article.paragraphs.join(' ').toLowerCase();
    }

    const matches: any[] = [];
    const addedModels = new Set<string>();

    for (const v of this.vehicles) {
      if (!v.model) continue;
      const brandStr = v.brand ? v.brand.toLowerCase() : '';
      const modelStr = v.model.toLowerCase();
      
      // Look for explicit matches
      if (fullText.includes(` ${modelStr} `) || (brandStr && fullText.includes(`${brandStr} ${modelStr}`))) {
        if (!addedModels.has(v.model)) {
          matches.push(v);
          addedModels.add(v.model);
        }
      }
    }

    this.relatedCarsCache[article.id] = matches;
    return matches;
  }

  autoLinkOld(text: string): string {
    if (!text || !this.vehicles || this.vehicles.length === 0) return text;
    let linkedText = text;
    const addedModels = new Set<string>();

    for (const v of this.vehicles) {
      if (!v.model) continue;
      const modelRegex = new RegExp(`\\\\b(${v.brand ? v.brand + ' ' : ''}${v.model})\\\\b`, 'gi');
      if (!addedModels.has(v.model) && modelRegex.test(linkedText)) {
        // Replace with an anchor tag to the compare page
        linkedText = linkedText.replace(modelRegex, `<a href="/compare?model=${encodeURIComponent(v.model)}" style="color: #0088CC; text-decoration: underline; font-weight: 500;">$1</a>`);
        addedModels.add(v.model);
      }
    }
    return linkedText;
  }

  scrollToTop() {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Load comments when user triggers "Join the Discussion" button
  loadComments(article: Article) {
    if (!article.id) return;
    this.commentsLoaded[article.id] = true;
    this.cdr.detectChanges();

    // Give Angular a brief microtask to render the placeholder DOM node
    setTimeout(() => {
      this.initDisqus(article.id!, article.title);
    }, 50);
  }

  // Dynamic DOM Shifting and Loading Disqus
  initDisqus(articleId: string, title: string) {
    if (typeof document === 'undefined') return;

    // 1. Get or create the unified disqus thread container
    let thread = document.getElementById('disqus_thread');
    if (!thread) {
      thread = document.createElement('div');
      thread.id = 'disqus_thread';
      thread.style.marginTop = '20px';
    }

    // 2. Find the placeholder for the active article
    const placeholder = document.getElementById(`comments-placeholder-${articleId}`);
    if (placeholder && thread) {
      placeholder.appendChild(thread); // Physically moves the element in the DOM!

      // 3. Reset Disqus or Load script
      if ((window as any).DISQUS) {
        (window as any).DISQUS.reset({
          reload: true,
          config: function() {
            this.page.identifier = articleId;
            this.page.url = `https://evcorn.com/articles/${articleId}`;
            this.page.title = title;
            this.page.developer = 1;
          }
        });
      } else {
        // Load disqus config and script for the first time
        (window as any).disqus_config = function() {
          this.page.identifier = articleId;
          this.page.url = `https://evcorn.com/articles/${articleId}`;
          this.page.title = title;
          this.page.developer = 1;
        };

        const s = document.createElement('script');
        s.src = 'https://evcorn.disqus.com/embed.js';
        s.setAttribute('data-timestamp', (+new Date()).toString());
        document.body.appendChild(s);
      }
    }
  }

  // Monitor page scroll to load next article & update browser state URL
  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // 1. Detect if we are close to the bottom to load the next queued story
    const threshold = 1200; // Load next story when 1200px from the bottom
    const position = window.scrollY + window.innerHeight;
    const height = document.documentElement.scrollHeight;

    if (height - position < threshold) {
      this.loadNextArticle();
    }

    // 2. Detect which article is currently active on the viewport to update URL/SEO metadata
    this.updateActiveArticleUrl();
  }

  loadNextArticle() {
    if (this.articlesQueue.length === 0 || this.loadingNext) return;
    this.loadingNext = true;

    const nextArt = this.articlesQueue.shift();
    if (nextArt) {
      this.loadedArticles.push(nextArt);
      this.cdr.detectChanges();
    }

    // Prevent double triggers during scroll
    setTimeout(() => {
      this.loadingNext = false;
    }, 800);
  }

  updateActiveArticleUrl() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const containers = document.querySelectorAll('.article-container');
    let activeId: string | null = null;
    let activeArticle: Article | null = null;

    for (let index = 0; index < containers.length; index++) {
      const container = containers[index];
      const rect = container.getBoundingClientRect();
      // If the top of the container covers the upper viewport half
      if (rect.top <= window.innerHeight * 0.45 && rect.bottom >= window.innerHeight * 0.45) {
        const art = this.loadedArticles[index];
        if (art && art.id) {
          activeId = art.id;
          activeArticle = art;
        }
      }
    }

    if (activeId && activeArticle && window.location.pathname !== `/articles/${activeId}`) {
      // Update URL silently without full page refresh
      window.history.pushState(null, '', `/articles/${activeId}`);
      
      // Update SEO settings dynamically
      this.updateSEOMetadata(activeArticle);

      // If comments were already loaded for this article, shift the DOM node back into place!
      if (this.commentsLoaded[activeId]) {
        this.initDisqus(activeId, activeArticle.title);
      }
    }
  }

  updateSEOMetadata(art: Article | null) {
    if (art) {
      // Build absolute image URL
      const imageUrl = art.imageUrl
        ? (art.imageUrl.startsWith('http') ? art.imageUrl : `https://evcorn.com${art.imageUrl}`)
        : undefined;

      this.seoService.updateSeo({
        title: art.title,
        description: art.description || '',
        image: imageUrl,
        type: 'article',
        author: 'EVCorn',
        publishDate: art.createdAt
      });
      
      this.schemaService.setSchema([
        this.schemaService.buildBreadcrumbs([
          { name: 'Home', url: '' },
          { name: 'Articles', url: '/articles' },
          { name: art.title, url: `/articles/${art.id}` }
        ]),
        this.schemaService.buildArticle({
          headline: art.title,
          description: art.description,
          image: imageUrl,
          datePublished: art.createdAt,
          dateModified: art.createdAt
        })
      ]);
    } else {
      this.seoService.updateSeo({
        title: 'Article Not Found',
        description: 'The requested article could not be found.'
      });
      this.schemaService.setSchema([]);
    }
  }
}
