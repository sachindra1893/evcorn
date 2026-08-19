import { Component, Input, Output, EventEmitter, OnInit, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BlogDataService, Category, CarSpec, Article } from '../../services/blog-data.service';
import { getOptimizedImageUrl, handleImageError } from '../../utils/image.utils';

export interface SearchResultItem {
  id: string;
  name: string;
  type: 'vehicle' | 'brand' | 'article';
  vehicleType?: 'car' | 'two-wheeler';
  brandName?: string;
  brandSlug?: string;
  modelSlug?: string;
  rangeText?: string;
  batteryText?: string;
  priceText?: string;
  imageUrl?: string;
  url?: string[];
  trackId: string;
}

@Component({
  selector: 'app-ev-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ev-search-wrapper" [class.hero-variant]="variant === 'hero'">
      <div class="search-input-container">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          [placeholder]="placeholderText" 
          [(ngModel)]="searchQuery" 
          (input)="onSearchInput()" 
          (focus)="onFocus()"
          class="search-input"
          autocomplete="off"
          spellcheck="false"
        >
        <button *ngIf="searchQuery" type="button" class="clear-btn" (click)="clearSearch()" aria-label="Clear search">
          ✕
        </button>
      </div>

      <!-- Live Results Dropdown -->
      <div *ngIf="isOpen && searchQuery.trim()" class="search-dropdown animate-dropdown">
        <div *ngIf="loading" class="search-loading">
          <div class="spinner"></div>
          <span>Searching catalog...</span>
        </div>

        <div *ngIf="!loading && results.length === 0" class="no-results">
          No matches found for "<strong>{{ searchQuery }}</strong>"
        </div>

        <div *ngIf="!loading && results.length > 0" class="results-list">
          <div 
            *ngFor="let item of results; trackBy: trackByFn" 
            class="result-item" 
            (click)="onItemClick(item)"
          >
            <!-- Thumbnail / Icon -->
            <div class="result-media">
              <img 
                *ngIf="item.imageUrl" 
                [src]="getThumbnail(item.imageUrl, item.name)" 
                (error)="onImgErr($event, item.name)"
                [alt]="item.name"
                class="result-thumb"
              >
              <div *ngIf="!item.imageUrl" class="result-fallback-icon">
                <span *ngIf="item.type === 'brand'">🏷️</span>
                <span *ngIf="item.type === 'article'">📰</span>
                <span *ngIf="item.type === 'vehicle' && item.vehicleType === 'two-wheeler'">🛵</span>
                <span *ngIf="item.type === 'vehicle' && item.vehicleType !== 'two-wheeler'">🚗</span>
              </div>
            </div>

            <!-- Content Details -->
            <div class="result-details">
              <div class="result-title-row">
                <span class="result-name">{{ item.name }}</span>
                <span class="type-badge" [ngClass]="'badge-' + (item.vehicleType || item.type)">
                  {{ getBadgeLabel(item) }}
                </span>
              </div>
              <div class="result-meta" *ngIf="item.brandName || item.rangeText || item.priceText">
                <span *ngIf="item.brandName" class="meta-brand">{{ item.brandName }}</span>
                <span *ngIf="item.rangeText && item.rangeText !== 'N/A'" class="meta-dot">•</span>
                <span *ngIf="item.rangeText && item.rangeText !== 'N/A'" class="meta-spec">{{ item.rangeText }}</span>
                <span *ngIf="item.priceText && item.priceText !== 'N/A'" class="meta-dot">•</span>
                <span *ngIf="item.priceText && item.priceText !== 'N/A'" class="meta-price">{{ item.priceText }}</span>
              </div>
            </div>

            <!-- Arrow indicator -->
            <div class="result-action">
              <span class="arrow-icon">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ev-search-wrapper {
      position: relative;
      width: 100%;
      z-index: 40;
    }

    .search-input-container {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      background: #FFFFFF;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .search-input-container:focus-within {
      border-color: #0088CC;
      box-shadow: 0 6px 24px rgba(0, 136, 204, 0.12);
    }

    .hero-variant .search-input-container {
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
    }

    .search-icon {
      position: absolute;
      left: 18px;
      width: 20px;
      height: 20px;
      stroke: #64748B;
      pointer-events: none;
      transition: stroke 0.2s;
    }

    .search-input-container:focus-within .search-icon {
      stroke: #0088CC;
    }

    .search-input {
      width: 100%;
      padding: 16px 44px 16px 50px;
      font-size: 1.05rem;
      font-family: inherit;
      color: #0F172A;
      background: transparent;
      border: none;
      outline: none;
      border-radius: 14px;
    }

    .hero-variant .search-input {
      padding: 18px 48px 18px 54px;
      font-size: 1.125rem;
    }

    .search-input::placeholder {
      color: #94A3B8;
      font-weight: 400;
    }

    .clear-btn {
      position: absolute;
      right: 14px;
      background: #F1F5F9;
      border: none;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748B;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      transition: all 0.15s ease;
    }

    .clear-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    /* Results Dropdown */
    .search-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      background: #FFFFFF;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 14px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.1);
      max-height: 440px;
      overflow-y: auto;
      z-index: 100;
    }

    .animate-dropdown {
      animation: dropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes dropdownIn {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.99);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .search-loading, .no-results {
      padding: 28px 20px;
      text-align: center;
      color: #64748B;
      font-size: 0.95rem;
    }

    .search-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(0, 136, 204, 0.2);
      border-left-color: #0088CC;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .results-list {
      padding: 6px;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .result-item:hover {
      background: #F8FAFC;
    }

    .result-media {
      width: 52px;
      height: 40px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .result-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .result-fallback-icon {
      font-size: 1.25rem;
    }

    .result-details {
      flex: 1;
      min-width: 0;
    }

    .result-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
    }

    .result-name {
      font-weight: 600;
      font-size: 0.95rem;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .type-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      flex-shrink: 0;
    }

    .badge-car {
      background: #E0F2FE;
      color: #0284C7;
    }

    .badge-two-wheeler {
      background: #FEF3C7;
      color: #D97706;
    }

    .badge-brand {
      background: #EDE9FE;
      color: #7C3AED;
    }

    .badge-article {
      background: #DCFCE7;
      color: #16A34A;
    }

    .result-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: #64748B;
    }

    .meta-brand {
      font-weight: 500;
    }

    .meta-dot {
      color: #CBD5E1;
    }

    .meta-price {
      color: #0F172A;
      font-weight: 600;
    }

    .result-action {
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
      color: #0088CC;
      font-weight: bold;
      font-size: 1.1rem;
      padding-right: 4px;
    }

    .result-item:hover .result-action {
      opacity: 1;
      transform: translateX(2px);
    }
  `]
})
export class EvSearchComponent implements OnInit {
  @Input() scope: 'all' | 'car' | 'two-wheeler' = 'all';
  @Input() placeholder: string = '';
  @Input() variant: 'hero' | 'default' = 'default';
  @Output() selectBrand = new EventEmitter<string>();

  searchQuery = '';
  results: SearchResultItem[] = [];
  isOpen = false;
  loading = false;

  private allVehicles: CarSpec[] = [];
  private categories: Category[] = [];
  private articles: Article[] = [];
  private catalogLoaded = false;

  constructor(
    private blogDataService: BlogDataService,
    private router: Router,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  get placeholderText(): string {
    if (this.placeholder) return this.placeholder;
    if (this.scope === 'car') return 'Search electric cars, brands or models...';
    if (this.scope === 'two-wheeler') return 'Search electric scooters, bikes or brands...';
    return 'Search EVs, two-wheelers, articles, or brands...';
  }

  onFocus(): void {
    if (!this.catalogLoaded) {
      this.loadCatalog();
    }
    if (this.searchQuery.trim().length > 0) {
      this.isOpen = true;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  loadCatalog(): void {
    this.loading = true;
    this.blogDataService.getCategories().subscribe(cats => {
      this.categories = cats || [];
    });

    this.blogDataService.getVehicles().subscribe({
      next: (vehs) => {
        this.allVehicles = vehs || [];
        this.catalogLoaded = true;
        this.loading = false;
        if (this.searchQuery.trim().length > 0) {
          this.performSearch();
        }
      },
      error: () => {
        this.catalogLoaded = true;
        this.loading = false;
      }
    });

    if (this.scope === 'all') {
      this.blogDataService.getArticles().subscribe(arts => {
        this.articles = arts || [];
      });
    }
  }

  onSearchInput(): void {
    if (!this.searchQuery.trim()) {
      this.results = [];
      this.isOpen = false;
      return;
    }

    this.isOpen = true;
    if (!this.catalogLoaded) {
      this.loadCatalog();
    } else {
      this.performSearch();
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.results = [];
    this.isOpen = false;
  }

  performSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.results = [];
      return;
    }

    const items: SearchResultItem[] = [];

    // 1. Vehicle Brand Matching (scoped)
    const matchedCategories = this.categories.filter(c => c.name.toLowerCase().includes(q));
    const matchedCategoryIds = new Set(matchedCategories.map(c => c.id));

    // Scoped vehicles pool
    const scopedVehicles = this.allVehicles.filter(v => {
      const vType = v.vehicleType || 'car';
      if (this.scope === 'car') return vType === 'car';
      if (this.scope === 'two-wheeler') return vType === 'two-wheeler';
      return true;
    });

    // Check which brands actually have models in the current scope
    const brandsWithVehicles = new Set(scopedVehicles.map(v => v.categoryId));

    matchedCategories.forEach(c => {
      if (brandsWithVehicles.has(c.id)) {
        items.push({
          id: c.id,
          name: c.name,
          type: 'brand',
          trackId: 'brand-' + c.id
        });
      }
    });

    // 2. Vehicle Model / Variant Matching (deduped by parentModel)
    const modelMap = new Map<string, SearchResultItem>();

    scopedVehicles.forEach(v => {
      const brandName = this.getBrandName(v.categoryId);
      const modelName = v.parentModel || v.name;
      const variantName = v.variantName || '';
      const vType = v.vehicleType || 'car';

      const matchesModel = modelName.toLowerCase().includes(q);
      const matchesVariant = variantName.toLowerCase().includes(q);
      const matchesBrand = brandName.toLowerCase().includes(q);

      if (matchesModel || matchesBrand) {
        if (!modelMap.has(modelName)) {
          modelMap.set(modelName, {
            id: v.id || modelName,
            name: modelName,
            type: 'vehicle',
            vehicleType: vType,
            brandName: brandName,
            brandSlug: this.slugify(brandName),
            modelSlug: this.slugify(modelName),
            rangeText: v.performance?.rangeText || v.range,
            priceText: v.pricing?.priceText || v.price,
            imageUrl: v.imageUrl,
            trackId: 'model-' + modelName
          });
        }
      } else if (matchesVariant) {
        items.push({
          id: v.id || variantName,
          name: `${modelName} ${variantName}`.trim(),
          type: 'vehicle',
          vehicleType: vType,
          brandName: brandName,
          brandSlug: this.slugify(brandName),
          modelSlug: this.slugify(modelName),
          rangeText: v.performance?.rangeText || v.range,
          priceText: v.pricing?.priceText || v.price,
          imageUrl: v.imageUrl,
          trackId: 'variant-' + (v.id || variantName)
        });
      }
    });

    items.push(...Array.from(modelMap.values()));

    // 3. Articles Matching (Only in 'all' scope)
    if (this.scope === 'all' && this.articles.length > 0) {
      const matchedArticles = this.articles
        .filter(a => a.title.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q)))
        .slice(0, 3)
        .map(a => ({
          id: a.id || a.slug || '',
          name: a.title,
          type: 'article' as const,
          imageUrl: a.imageUrl,
          trackId: 'art-' + (a.id || a.title)
        }));

      items.push(...matchedArticles);
    }

    this.results = items.slice(0, 8);
    this.cdr.detectChanges();
  }

  onItemClick(item: SearchResultItem): void {
    this.isOpen = false;
    this.searchQuery = '';

    if (item.type === 'brand') {
      if (this.selectBrand.observers.length > 0) {
        this.selectBrand.emit(item.id);
      } else {
        if (this.scope === 'two-wheeler') {
          this.router.navigate(['/two-wheelers'], { queryParams: { category: item.id } });
        } else {
          this.router.navigate(['/evs'], { queryParams: { category: item.id } });
        }
      }
      return;
    }

    if (item.type === 'article') {
      this.router.navigate(['/articles', item.id]);
      return;
    }

    if (item.type === 'vehicle') {
      if (item.vehicleType === 'two-wheeler') {
        this.router.navigate(['/two-wheelers'], { queryParams: { category: item.brandSlug } });
      } else if (item.brandSlug && item.modelSlug) {
        this.router.navigate(['/ev', item.brandSlug, item.modelSlug]);
      }
    }
  }

  getBadgeLabel(item: SearchResultItem): string {
    if (item.type === 'brand') return 'Brand';
    if (item.type === 'article') return 'Article';
    return item.vehicleType === 'two-wheeler' ? '2-Wheeler' : 'Car';
  }

  getBrandName(catId: string): string {
    const found = this.categories.find(c => c.id === catId);
    return found ? found.name : catId;
  }

  getThumbnail(url: string, alt: string): string {
    return getOptimizedImageUrl(url, 120, alt);
  }

  onImgErr(event: Event, name: string): void {
    handleImageError(event, name);
  }

  slugify(text: string): string {
    return (text || '').toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  trackByFn(_: number, item: SearchResultItem): string {
    return item.trackId;
  }
}
