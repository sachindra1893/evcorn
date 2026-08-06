import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { SITE_ORIGIN } from '../../services/seo.constants';
import { BlogDataService, Article } from '../../services/blog-data.service';
import { getOptimizedImageUrl } from '../../utils/image.utils';
import { BlockRendererComponent } from '../../components/block-renderer/block-renderer.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { CommonModule } from '@angular/common';
import { classifyHttpError } from '../../core/http/app-http-error';
import { NetworkStatusService } from '../../core/network/network-status.service';
import {
  AEO_ANSWER_BLOCKS_ENABLED,
  AeoPageModel,
  buildArticleAeo,
  collectRelatedArticleIds,
  emptyAeoPageModel,
  formatLastUpdatedLabel,
  hasArticleAnswerChrome
} from '../../aeo';
import {
  articleHref,
  articlesIndexHref,
  brandBrowseHref,
  getOrBuildArticlePageGraph,
  normalizeArticleRelationships,
  primaryVehicleHintsFromGraph,
  safeArticleSchemaFromGraph
} from '../../entity';
import {
  ContentIntelPageModel,
  ExploreLink,
  RelatedReadingLabelMap,
  TopicNavItem,
  emptyContentIntelPageModel,
  exploreLinksForPage,
  relatedReadingLabelMap,
  buildTopicNav,
  safeBuildArticleContentIntel
} from '../../content-intel';

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
                <img [src]="getOptimizedUrl(article.imageUrl, 1200)" class="banner-image" alt="{{article.title}}" fetchpriority="high" decoding="async" width="1200" height="630">
              </div>
            }
            <div class="article-content">
              <app-breadcrumb [paths]="[{label: 'Insights', url: '/articles'}, {label: article.title, url: '/articles/' + article.id}]"></app-breadcrumb>
              <span class="category-tag">News</span>
              <h1>{{ article.title }}</h1>
              
              <!-- Under title Share Bar -->
              <div class="article-meta-row">
                <span class="post-date">
                  {{ aeoTrustAuthor(article) }}
                  @if (aeoReadingMinutes(article); as mins) {
                    • ⏳ {{ mins }} min read
                  }
                  @if (aeoLastUpdatedLabel) {
                    • Updated {{ aeoLastUpdatedLabel }}
                  }
                </span>
                <button (click)="shareArticle(article)" class="share-btn" title="Share this article">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7L15.9 7.33c.53.48 1.22.78 1.98.78 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.52 9.34 6.84 9.05 6 9.05c-1.66 0-3 1.34-3 3s1.34 3 3 3c.84 0 1.52-.29 2.04-.76l7.97 4.65c-.03.22-.05.45-.05.67 0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9-1.3-2.9-2.9-2.9z"/>
                  </svg>
                  <span>Share</span>
                </button>
              </div>

              @if (aeoEnabled && aeoById[article.id!] && isPrimaryArticle(article) && hasArticleAnswerChrome(aeoById[article.id!])) {
                <section class="aeo-article-chrome" aria-label="Article answer summary">
                  @if (aeoById[article.id!].quickAnswer) {
                    <p class="aeo-quick-answer">{{ aeoById[article.id!].quickAnswer }}</p>
                  }
                  @if (aeoById[article.id!].keyTakeaways.length > 0) {
                    <div class="aeo-takeaways aeo-block">
                      <h2 class="aeo-section-title">Key takeaways</h2>
                      <ul>
                        @for (item of aeoById[article.id!].keyTakeaways; track item) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </div>
                  }
                  @if (aeoById[article.id!].ctas.viewSpecs) {
                    <div class="aeo-ctas aeo-block" role="group" aria-label="Answer actions">
                      <a class="aeo-cta-link" [routerLink]="aeoById[article.id!].ctas.viewSpecs!.href.split('#')[0]">{{ aeoById[article.id!].ctas.viewSpecs!.label }}</a>
                    </div>
                  }
                  @if (aeoById[article.id!].trust?.citationNote) {
                    <p class="aeo-trust aeo-block">{{ aeoById[article.id!].trust!.citationNote }}</p>
                  }
                </section>
              }
              
              <!-- Table of Contents (AEO when enabled; else legacy block headings) -->
              @if (getArticleToc(article); as tocItems) {
                @if (tocItems.length > 0) {
                  <nav class="toc-container" aria-labelledby="article-toc-heading">
                    <h2 id="article-toc-heading" class="toc-title">Table of Contents</h2>
                    <ul class="toc-list">
                      @for (item of tocItems; track item.id) {
                        <li [class.toc-h2]="item.level === 2" [class.toc-h3]="item.level === 3">
                          <a [href]="'#' + item.id" (click)="onTocClick($event, item.id)">{{ item.text }}</a>
                        </li>
                      }
                    </ul>
                  </nav>
                }
              }
              
              <!-- FAQ / pros-cons HTML stay in block-renderer — AEO does not duplicate them -->
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

              <!-- Automated Related Cars (in-article mentions) — skip when AEO related EVs present -->
              <div *ngIf="!(aeoEnabled && aeoById[article.id!]?.relatedVehicles?.length) && getRelatedCars(article).length > 0" class="related-cars-section">
                <h2 class="related-section-title">Cars Mentioned in this Article</h2>
                <div class="related-grid">
                  <a *ngFor="let car of getRelatedCars(article)"
                     [routerLink]="car.brandSlug && car.modelSlug ? ['/ev', car.brandSlug, car.modelSlug] : ['/compare']"
                     [queryParams]="car.brandSlug && car.modelSlug ? null : { model: car.model }"
                     class="related-card">
                    <div class="related-img-wrapper" *ngIf="car.imageUrl">
                      <img [src]="getOptimizedUrl(car.imageUrl, 200)" [alt]="car.brand + ' ' + car.model" loading="lazy" decoding="async" width="60" height="40" />
                    </div>
                    <div class="related-card-content">
                      <h3>{{ car.brand }} {{ car.model }}</h3>
                      <p class="car-spec-mini" *ngIf="car.range">Range: {{ car.range }} km</p>
                    </div>
                  </a>
                </div>
              </div>

              <!-- AEO related EVs (RecommendationService wire) — one related-vehicle UI -->
              <div *ngIf="aeoEnabled && aeoById[article.id!]?.relatedVehicles?.length" class="related-cars-section">
                <h2 class="related-section-title">Related EVs</h2>
                <div class="related-grid">
                  <a *ngFor="let rel of aeoById[article.id!].relatedVehicles"
                     [routerLink]="rel.href.split('?')[0]"
                     [queryParams]="aeoLinkQueryParams(rel.href)"
                     class="related-card"
                     (click)="scrollToTop()">
                    <div class="related-card-content">
                      <h3>{{ rel.name }}</h3>
                      <p class="ci-related-reason" *ngIf="relatedReason(article.id!, 'vehicle', rel.id) as reason">{{ reason }}</p>
                    </div>
                  </a>
                </div>
              </div>

              <!-- AEO related articles (RecommendationService / relationships) when available -->
              <div *ngIf="aeoEnabled && aeoById[article.id!]?.relatedArticles?.length" class="related-articles-section">
                <h2 class="related-section-title">Keep Reading</h2>
                <div class="related-grid">
                  <a *ngFor="let rel of aeoById[article.id!].relatedArticles" [routerLink]="['/articles', rel.id]" class="related-card" (click)="scrollToTop()">
                    <div class="related-card-content">
                      <h3>{{ rel.title }}</h3>
                      <p class="ci-related-reason" *ngIf="relatedReason(article.id!, 'article', rel.id) as reason">{{ reason }}</p>
                    </div>
                  </a>
                </div>
              </div>
              <!-- Fallback related articles when AEO related slate empty -->
              <div *ngIf="!(aeoEnabled && aeoById[article.id!]?.relatedArticles?.length) && getRelatedArticles(article).length > 0" class="related-articles-section">
                <h2 class="related-section-title">Keep Reading</h2>
                <div class="related-grid">
                  <a *ngFor="let rel of getRelatedArticles(article)" [routerLink]="['/articles', rel.id]" class="related-card" (click)="scrollToTop()">
                    <div class="related-img-wrapper" *ngIf="rel.imageUrl">
                      <img [src]="getOptimizedUrl(rel.imageUrl, 300)" [alt]="rel.title" loading="lazy" decoding="async" width="80" height="50" />
                    </div>
                    <div class="related-card-content">
                      <h3>{{ rel.title }}</h3>
                    </div>
                  </a>
                </div>
              </div>

              <!-- Phase 7.4 — Topics + Explore (extends Internal Links; no Related* duplication; no HTML rewrite) -->
              @if (aeoEnabled && topicNavById[article.id!]?.length) {
                <nav class="ci-nav-section" aria-labelledby="ci-topics-{{ article.id }}">
                  <h2 [attr.id]="'ci-topics-' + article.id" class="related-section-title">Topics</h2>
                  <ul class="ci-nav-list">
                    @for (item of topicNavById[article.id!]; track item.href + item.kind) {
                      <li>
                        <a [routerLink]="item.href.split('?')[0]" [queryParams]="aeoLinkQueryParams(item.href)" (click)="scrollToTop()">{{ item.label }}</a>
                      </li>
                    }
                  </ul>
                </nav>
              }
              @if (aeoEnabled && exploreLinksById[article.id!]?.length) {
                <nav class="ci-nav-section" aria-labelledby="ci-explore-{{ article.id }}">
                  <h2 [attr.id]="'ci-explore-' + article.id" class="related-section-title">Explore</h2>
                  <ul class="ci-nav-list">
                    @for (item of exploreLinksById[article.id!]; track item.href) {
                      <li>
                        <a [routerLink]="item.href.split('?')[0]" [queryParams]="aeoLinkQueryParams(item.href)" (click)="scrollToTop()">{{ item.label }}</a>
                      </li>
                    }
                  </ul>
                </nav>
              }

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
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 30px;
      overflow-wrap: anywhere;
    }
    .toc-title {
      font-size: 1.15rem;
      margin-top: 0;
      margin-bottom: 12px;
      color: #0f172a;
      font-weight: 700;
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
      display: inline-block;
      padding: 2px 0;
      min-height: 28px;
    }
    .toc-list li a:hover {
      color: #0369a1;
      text-decoration: underline;
    }
    .toc-list li a:focus-visible {
      outline: 2px solid #0284C7;
      outline-offset: 2px;
      border-radius: 4px;
    }
    .toc-h2 {
      font-weight: 600;
      font-size: 1.05rem;
    }
    .toc-h3 {
      padding-left: 16px;
      font-size: 0.95rem;
      color: #475569;
    }
    
    /* Related Articles / EVs */
    .related-articles-section,
    .related-cars-section {
      margin-top: 50px;
      padding-top: 40px;
      border-top: 2px solid #f1f5f9;
    }
    .related-section-title {
      font-size: 1.35rem;
      margin: 0 0 20px;
      color: #0f172a;
      font-weight: 700;
    }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
      gap: 16px;
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
      min-height: 44px;
    }
    .related-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .related-card:focus-visible {
      outline: 2px solid #0284C7;
      outline-offset: 2px;
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
    .related-card-content h3 {
      margin: 0;
      font-size: 1rem;
      line-height: 1.4;
      color: #1e293b;
      font-weight: 650;
      overflow-wrap: anywhere;
    }
    .car-spec-mini {
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 5px;
      margin-bottom: 0;
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

    .aeo-article-chrome {
      margin: 0 0 22px;
      padding: 18px 20px;
      background: rgba(248, 250, 252, 0.95);
      border: 1px solid rgba(15, 23, 42, 0.06);
      border-radius: 12px;
      overflow-wrap: anywhere;
    }
    .aeo-article-chrome .aeo-block {
      margin: 14px 0 0;
      padding-top: 12px;
      border-top: 1px solid rgba(15, 23, 42, 0.06);
    }
    .aeo-article-chrome > .aeo-block:first-child {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }
    .aeo-quick-answer {
      margin: 0;
      font-size: 1.05rem;
      line-height: 1.55;
      color: #0F172A;
      font-weight: 500;
    }
    .aeo-section-title {
      margin: 0 0 8px;
      font-size: 0.95rem;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.01em;
    }
    .aeo-takeaways ul {
      margin: 0;
      padding-left: 1.15rem;
      color: #334155;
      line-height: 1.5;
    }
    .aeo-takeaways li { margin-bottom: 6px; }
    .aeo-ctas {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .aeo-cta-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 10px 16px;
      border-radius: 8px;
      background: #0284C7;
      color: #fff;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      box-sizing: border-box;
    }
    .aeo-cta-link:hover {
      filter: brightness(0.96);
    }
    .aeo-article-chrome a:focus-visible,
    .aeo-cta-link:focus-visible {
      outline: 2px solid #0284C7;
      outline-offset: 2px;
      border-radius: 4px;
    }
    .aeo-trust {
      margin: 0;
      font-size: 0.8rem;
      color: #64748B;
      line-height: 1.45;
    }
    .ci-related-reason {
      margin: 4px 0 0;
      font-size: 0.78rem;
      color: #64748B;
      line-height: 1.35;
    }
    .ci-nav-section {
      margin: 28px 0 8px;
    }
    .ci-nav-list {
      margin: 0;
      padding-left: 1.15rem;
      color: #334155;
      line-height: 1.5;
    }
    .ci-nav-list li {
      margin-bottom: 6px;
    }
    .ci-nav-list a {
      color: #0284C7;
      text-decoration: none;
    }
    .ci-nav-list a:hover {
      text-decoration: underline;
      color: #0369A1;
    }
    .ci-nav-list a:focus-visible {
      outline: 2px solid #0284C7;
      outline-offset: 2px;
      border-radius: 4px;
    }
    @media (max-width: 640px) {
      .aeo-article-chrome {
        padding: 14px 16px;
        border-radius: 10px;
      }
      .aeo-quick-answer {
        font-size: 1rem;
      }
      .toc-container {
        padding: 16px;
        margin-bottom: 22px;
      }
      .toc-h3 {
        padding-left: 12px;
      }
      .related-section-title {
        font-size: 1.2rem;
      }
      .aeo-cta-link {
        width: 100%;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .related-card {
        transition: none;
      }
      .related-card:hover {
        transform: none;
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

  readonly aeoEnabled = AEO_ANSWER_BLOCKS_ENABLED;
  readonly hasArticleAnswerChrome = hasArticleAnswerChrome;
  aeoById: { [id: string]: AeoPageModel } = {};
  aeoLastUpdatedLabel: string | undefined;
  /** Phase 7.4 M2 — per-article Content Intelligence chrome. */
  contentIntelById: { [id: string]: ContentIntelPageModel } = {};
  exploreLinksById: { [id: string]: ExploreLink[] } = {};
  topicNavById: { [id: string]: TopicNavItem[] } = {};
  relatedReadingLabelsById: { [id: string]: RelatedReadingLabelMap } = {};
  private relatedVehiclesForAeo: any[] = [];
  private relatedArticlesForAeo: any[] = [];
  private relatedSub: Subscription | null = null;
  private categoriesForAeo: { id: string; name: string }[] = [];
  private lastArticleAeoStamp: { [id: string]: string } = {};

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
      this.dataService.getCategories().subscribe({
        next: (cats) => {
          this.categoriesForAeo = (cats || []).map((c) => ({ id: c.id, name: c.name }));
        },
        error: () => {
          this.categoriesForAeo = [];
        }
      })
    );
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
          this.relatedVehiclesForAeo = [];
          this.relatedArticlesForAeo = [];
          if (article.id) {
            delete this.lastArticleAeoStamp[article.id];
            this.clearArticleContentIntel(article.id);
          }
          this.refreshArticleAeo(article);
          this.loadRelatedForAeo(article);
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
    this.relatedSub?.unsubscribe();
    this.schemaService.setSchema([]);
  }

  isPrimaryArticle(article: Article): boolean {
    return !!article.id && article.id === this.currentArticleId;
  }

  aeoTrustAuthor(article: Article): string {
    const model = article.id ? this.aeoById[article.id] : undefined;
    if (model?.trust?.authorLabel) return model.trust.authorLabel;
    if (typeof article.author === 'string' && article.author.trim()) return article.author;
    if (article.author && typeof article.author === 'object' && article.author.name) {
      return article.author.name;
    }
    return 'Published by EVCorn';
  }

  aeoReadingMinutes(article: Article): number {
    const model = article.id ? this.aeoById[article.id] : undefined;
    if (model?.readingTimeMinutes) return model.readingTimeMinutes;
    return this.getReadingTime(article);
  }

  getArticleToc(article: Article): { id: string; text: string; level: number }[] {
    const model = article.id ? this.aeoById[article.id] : undefined;
    if (this.aeoEnabled && model?.toc?.length) return model.toc;
    return this.getTOC(article);
  }

  /** AEO failure must never break article SEO / block rendering. */
  private refreshArticleAeo(article: Article): void {
    if (!this.aeoEnabled || !article.id) return;
    try {
      const rel = normalizeArticleRelationships(article.relationships);
      const relatedIds = collectRelatedArticleIds(
        rel.relatedArticleIds,
        article.blocks as any
      );
      // Resolve editorial ids from already-loaded page data only (no catalog scan / extra API).
      // Preserve editorial order; attach metadata from queue / recommendation slate when present.
      const editorialArticles = relatedIds.length
        ? relatedIds.map((id) => {
            const hit = this.articlesQueue.find((a) => a.id === id);
            return hit
              ? {
                  id: hit.id!,
                  title: hit.title,
                  imageUrl: hit.imageUrl,
                  description: hit.description
                }
              : { id, title: 'Related article' };
          })
        : [];
      const editorialVehicles = rel.relatedVehicleIds.length
        ? rel.relatedVehicleIds.map((id) => {
            const fromPage = (this.vehicles || []).find((v) => v?.id === id);
            if (fromPage) return this.enrichRelatedVehiclesForAeo([fromPage])[0];
            const fromRec = this.relatedVehiclesForAeo.find((v) => v?.id === id);
            return fromRec || { id };
          })
        : [];

      const relatedArticles =
        editorialArticles.length > 0 ? editorialArticles : this.relatedArticlesForAeo;
      const relatedVehicles =
        editorialVehicles.length > 0 ? editorialVehicles : this.relatedVehiclesForAeo;

      const relatedStamp = `${relatedVehicles.length}:${relatedArticles.length}:${
        relatedVehicles[0]?.id || ''
      }:${relatedArticles[0]?.id || ''}`;
      const stamp = `${article.id}|${article.updatedAt || article.createdAt || ''}|${relatedStamp}`;
      if (stamp === this.lastArticleAeoStamp[article.id] && this.aeoById[article.id]) return;

      const entityGraph = getOrBuildArticlePageGraph({
        article: {
          id: article.id,
          title: article.title,
          description: article.description,
          categoryId: article.categoryId,
          imageUrl: article.imageUrl,
          author: article.author,
          seo: article.seo,
          publishAt: article.publishAt,
          updatedAt: article.updatedAt,
          relationships: article.relationships,
          blocks: article.blocks as any
        },
        brands: this.categoriesForAeo,
        editorialVehicles: editorialVehicles.length ? editorialVehicles : undefined,
        editorialArticles: editorialArticles.length ? editorialArticles : undefined,
        recommendedVehicles: this.relatedVehiclesForAeo,
        recommendedArticles: this.relatedArticlesForAeo
      });
      const hints = primaryVehicleHintsFromGraph(entityGraph);

      const model = buildArticleAeo({
        id: article.id,
        title: article.title,
        description: article.description,
        paragraphs: article.paragraphs,
        blocks: article.blocks as any,
        seoMetaDescription: article.seo?.metaDescription,
        updatedAt: article.updatedAt,
        createdAt: article.createdAt,
        author: article.author,
        brandSlug: hints.brandSlug,
        modelSlug: hints.modelSlug,
        relatedVehicles,
        relatedArticles,
        relatedVehicleIds: rel.relatedVehicleIds,
        relatedArticleIds: relatedIds,
        entityGraph
      });
      this.aeoById[article.id] = model;
      this.lastArticleAeoStamp[article.id] = stamp;
      if (article.id === this.currentArticleId) {
        this.aeoLastUpdatedLabel = formatLastUpdatedLabel(model.lastUpdated);
      }
      this.refreshArticleContentIntel(article, entityGraph, model);
    } catch {
      this.aeoById[article.id] = emptyAeoPageModel();
      delete this.lastArticleAeoStamp[article.id];
      if (article.id === this.currentArticleId) this.aeoLastUpdatedLabel = undefined;
      this.clearArticleContentIntel(article.id);
    }
  }

  /** Phase 7.4 — CI failure must never break AEO / Related* / SEO / article HTML. */
  private refreshArticleContentIntel(
    article: Article,
    entityGraph: ReturnType<typeof getOrBuildArticlePageGraph>,
    aeo: AeoPageModel
  ): void {
    if (!article.id) return;
    try {
      const ci = safeBuildArticleContentIntel({
        entityGraph,
        article: {
          id: article.id,
          title: article.title,
          description: article.description,
          categoryId: article.categoryId,
          imageUrl: article.imageUrl,
          author: article.author,
          seo: article.seo,
          publishAt: article.publishAt,
          publishedAt: (article as any).publishedAt,
          updatedAt: article.updatedAt,
          createdAt: article.createdAt,
          status: (article as any).status,
          relationships: article.relationships,
          blocks: article.blocks as any
        },
        brands: this.categoriesForAeo,
        recommendedVehicles: this.relatedVehiclesForAeo,
        recommendedArticles: this.relatedArticlesForAeo
      });
      this.contentIntelById[article.id] = ci;
      const relatedHrefs = [
        ...(aeo.relatedVehicles || []).map((v) => v.href),
        ...(aeo.relatedArticles || []).map((a) => a.href),
        ...(aeo.relatedComparisons || []).map((c) => c.href)
      ];
      this.exploreLinksById[article.id] = exploreLinksForPage(aeo.internalLinks, ci.hubLinks, [
        `/articles/${article.id}`,
        ...relatedHrefs
      ]);
      this.relatedReadingLabelsById[article.id] = relatedReadingLabelMap(ci.relatedReading);
      this.topicNavById[article.id] = buildTopicNav(ci, {
        excludeHrefs: [
          ...relatedHrefs,
          ...this.exploreLinksById[article.id].map((l) => l.href)
        ]
      });
    } catch {
      this.contentIntelById[article.id] = emptyContentIntelPageModel();
      this.exploreLinksById[article.id] = [...(aeo.internalLinks || [])];
      this.relatedReadingLabelsById[article.id] = { vehicles: {}, articles: {} };
      this.topicNavById[article.id] = [];
    }
  }

  private clearArticleContentIntel(articleId: string | undefined | null): void {
    if (!articleId) return;
    delete this.contentIntelById[articleId];
    delete this.exploreLinksById[articleId];
    delete this.topicNavById[articleId];
    delete this.relatedReadingLabelsById[articleId];
  }

  /** Related* reason labels from CI — never invents; lookup only. */
  relatedReason(
    articleId: string,
    kind: 'vehicle' | 'article',
    itemId: string
  ): string | undefined {
    const map = this.relatedReadingLabelsById[articleId];
    if (!map) return undefined;
    const row = kind === 'vehicle' ? map.vehicles[itemId] : map.articles[itemId];
    return row?.reason || undefined;
  }

  private loadRelatedForAeo(article: Article): void {
    if (!this.aeoEnabled || !article.id) return;
    this.relatedSub?.unsubscribe();
    this.relatedSub = this.dataService
      .getRecommendations({
        articleId: article.id,
        categoryId: article.categoryId
      })
      .subscribe({
        next: (data) => {
          this.relatedVehiclesForAeo = this.enrichRelatedVehiclesForAeo(
            data.recommendedVehicles || []
          );
          this.relatedArticlesForAeo = data.recommendedArticles || [];
          this.refreshArticleAeo(article);
          // Related slate feeds Article about/mentions JSON-LD (Phase 7.3 M3).
          this.updateSEOMetadata(article);
          this.cdr.detectChanges();
        },
        error: () => {
          // Related failure → omit AEO related; keep answer chrome + Phase 7.1 schema.
        }
      });
  }

  private enrichRelatedVehiclesForAeo(raw: any[]): any[] {
    return (raw || []).map((v) => {
      const cat = this.categoriesForAeo.find((c) => c.id === v.categoryId);
      const brandName = cat?.name || v.brand || '';
      const brandSlug = brandName
        ? this.slugifyAeo(brandName)
        : this.slugifyAeo(v.brandSlug || v.categoryId || '');
      const modelSlug = this.slugifyAeo(v.modelSlug || v.parentModel || v.name || '');
      return { ...v, brandName, brandSlug, modelSlug };
    });
  }

  private slugifyAeo(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  shareArticle(article: Article) {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const shareUrl = `${SITE_ORIGIN}${articleHref(article.id) || `/articles/${article.id}`}`;
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

  onTocClick(event: Event, id: string) {
    event.preventDefault();
    this.scrollToId(id);
  }

  aeoLinkQueryParams(href: string): Record<string, string> {
    try {
      if (!href.includes('?')) return {};
      const params = new URLSearchParams(href.split('?')[1]);
      const out: Record<string, string> = {};
      params.forEach((value, key) => {
        out[key] = value;
      });
      return out;
    } catch {
      return {};
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
          const brandSlug =
            v.brandSlug ||
            (v.brand || '')
              .toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, '')
              .replace(/[\s_-]+/g, '-');
          const modelSlug =
            v.modelSlug ||
            (v.model || '')
              .toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, '')
              .replace(/[\s_-]+/g, '-');
          matches.push({ ...v, brandSlug, modelSlug });
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
            this.page.url = `${SITE_ORIGIN}${articleHref(articleId) || `/articles/${articleId}`}`;
            this.page.title = title;
            this.page.developer = 1;
          }
        });
      } else {
        // Load disqus config and script for the first time
        (window as any).disqus_config = function() {
          this.page.identifier = articleId;
          this.page.url = `${SITE_ORIGIN}${articleHref(articleId) || `/articles/${articleId}`}`;
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
      const path = articleHref(art.id) || `/articles/${art.id}`;
      const imageUrl = art.imageUrl || undefined;
      const authorName =
        typeof art.author === 'string'
          ? art.author
          : (art.author?.name || 'EVCorn Editorial');
      const metaTitle = art.seo?.metaTitle || art.title;
      const metaDescription =
        art.seo?.metaDescription ||
        art.description ||
        `Read ${art.title} on EVCorn — electric vehicle news, reviews, and buying guides for India.`;

      this.seoService.updateSeo({
        title: metaTitle,
        description: metaDescription,
        image: imageUrl,
        imageAlt: art.title,
        url: path,
        type: 'article',
        author: authorName,
        publishDate: art.createdAt,
        modifiedDate: art.updatedAt || art.createdAt
      });

      // Entity graph → schema inputs (optional). Failure → Phase 7.1 Article only.
      const rel = normalizeArticleRelationships(art.relationships);
      const editorialVehicles = rel.relatedVehicleIds.length
        ? rel.relatedVehicleIds.map((id) => {
            const fromPage = (this.vehicles || []).find((v) => v?.id === id);
            if (fromPage) return this.enrichRelatedVehiclesForAeo([fromPage])[0];
            const fromRec = this.relatedVehiclesForAeo.find((v) => v?.id === id);
            return fromRec || { id };
          })
        : [];
      const entityGraph = getOrBuildArticlePageGraph({
        article: {
          id: art.id,
          title: art.title,
          description: art.description,
          categoryId: art.categoryId,
          imageUrl: art.imageUrl,
          author: art.author,
          seo: art.seo,
          publishAt: art.publishAt,
          updatedAt: art.updatedAt,
          relationships: art.relationships,
          blocks: art.blocks as any
        },
        brands: this.categoriesForAeo,
        editorialVehicles: editorialVehicles.length ? editorialVehicles : undefined,
        recommendedVehicles: this.relatedVehiclesForAeo,
        recommendedArticles: this.relatedArticlesForAeo
      });
      const graphSchema = safeArticleSchemaFromGraph(entityGraph, {
        author: art.author
      });

      const articleSchema = this.schemaService.buildArticle({
        headline: art.title,
        description: metaDescription,
        image: imageUrl,
        datePublished: art.createdAt,
        dateModified: art.updatedAt || art.createdAt,
        author: graphSchema?.authorPerson || authorName,
        path,
        id: graphSchema?.path || path,
        ...(graphSchema?.about ? { about: graphSchema.about } : {}),
        ...(graphSchema?.mentions ? { mentions: graphSchema.mentions } : {})
      });

      const schemas: any[] = [
        this.schemaService.buildBreadcrumbs([
          { name: 'Home', url: '/' },
          { name: 'Articles', url: articlesIndexHref() },
          { name: art.title, url: path }
        ]),
        this.schemaService.buildWebPage(metaTitle, metaDescription, path),
        articleSchema
      ];

      // Related Brand nodes (CMS name + browse @id only) — dedupe by path; no invented sameAs.
      const brandAbout = (graphSchema?.about || []).filter((a) =>
        a.types.includes('Brand')
      );
      const seenBrand = new Set<string>();
      for (const b of brandAbout) {
        if (!b.path || seenBrand.has(b.path)) continue;
        seenBrand.add(b.path);
        const cat = (this.categoriesForAeo || []).find(
          (c) => brandBrowseHref(c.name) === b.path
        );
        schemas.push(
          this.schemaService.buildBrand({
            name: b.name || cat?.name || 'Brand',
            path: b.path,
            identifier: cat?.id
          })
        );
      }

      if (imageUrl) {
        schemas.push(this.schemaService.buildImageObject(imageUrl, art.title, 1200, 630));
      }

      this.schemaService.setSchema(schemas);
    } else {
      this.seoService.updateSeo({
        title: 'Article Not Found',
        description: 'The requested article could not be found on EVCorn. Browse EV reviews and news instead.',
        noindex: true
      });
      this.schemaService.setSchema([]);
    }
  }
}
