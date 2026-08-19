import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Category, CarSpec, BlogDataService } from '../../services/blog-data.service';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { EvSearchComponent } from '../../components/ev-search/ev-search.component';
import { ErrorStateComponent } from '../../components/error-state/error-state.component';
import { getOptimizedImageUrl, handleImageError } from '../../utils/image.utils';
import { formatCardRange, formatCardBattery } from '../../utils/vehicle-card-formatter';

@Component({
  selector: 'app-browse-two-wheelers',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent, FormsModule, ErrorStateComponent, EvSearchComponent],
  template: `
    <div class="browse-page animate-premium-fade">
      
      <div class="page-header animate-fade">
        <app-breadcrumb [paths]="[{label: 'Two-Wheelers', url: '/two-wheelers'}]"></app-breadcrumb>
        <h1>Browse Electric Two-Wheelers</h1>
        <p class="subtitle">Discover electric scooters and motorcycles with real-world range, battery, top speed, and ex-showroom prices.</p>
      </div>

      <!-- Shared Search Component (Scoped to Two-Wheelers) -->
      <div class="search-container animate-fade">
        <app-ev-search scope="two-wheeler" placeholder="Search electric scooters, bikes or brands..." (selectBrand)="selectBrand($event)"></app-ev-search>
      </div>

      @if (loading) {
        <div class="loading-overlay">
          <div class="spinner"></div>
          <p>Loading electric two-wheelers catalog...</p>
        </div>
      } @else if (error) {
        <app-error-state
          message="Unable to load two-wheelers catalog right now. Please try again in a few moments."
          (retry)="retryLoad()">
        </app-error-state>
      } @else {
        
        <!-- Popular 2W Brands Section -->
        <div class="content-section animate-fade">
          <h2 class="section-title">Popular Brands</h2>
          <div class="chips-container">
            @for (brand of displayedBrands; track brand.id) {
              <button 
                class="chip brand-chip" 
                [class.selected]="selectedBrandId === brand.id" 
                (click)="selectBrand(brand.id)"
              >
                {{ brand.name }}
              </button>
            }
            @if (availableBrands.length > popularBrandNames.length) {
              <button class="chip view-all-btn" (click)="toggleAllBrands()">
                {{ showAllBrands ? 'Show Less' : 'View All Brands (' + availableBrands.length + ')' }}
              </button>
            }
          </div>
        </div>

        @if (selectedBrandId) {
          <!-- Filtered Models for Selected Brand -->
          <div class="content-section animate-fade">
            <div class="section-header-row">
              <h2 class="section-title">
                {{ getBrandName(selectedBrandId) }} Electric Two-Wheelers
              </h2>
              <button class="clear-filter-link" (click)="selectBrand(selectedBrandId)">View All Models ✕</button>
            </div>
            
            <div class="models-grid">
              @for (bike of getFilteredModels(); track bike.id) {
                <div class="model-card">
                  <div class="model-image-container">
                    <img [src]="getOptimizedUrl(bike.imageUrl, 600, bike.parentModel || bike.name)" 
                         (error)="onImgError($event, bike)"
                         loading="lazy"
                         decoding="async"
                         width="600"
                         height="360"
                         class="model-thumb"
                         [alt]="getBrandName(bike.categoryId) + ' ' + (bike.parentModel || bike.name) + ' electric scooter'">
                  </div>
                  <div class="model-info">
                    <div class="model-badge-row">
                      <span class="brand-tag">{{ getBrandName(bike.categoryId) }}</span>
                      @if (bike.lifecycleStatus === 'Upcoming' || bike.status === 'Upcoming') {
                        <span class="badge badge-upcoming">🟡 Upcoming</span>
                      }
                    </div>
                    <h3 class="model-name">{{ bike.parentModel || bike.name }}</h3>
                    <p class="variant-name">{{ bike.variantName || 'Base Variant' }}</p>

                    <!-- Key Specs Row -->
                    <div class="specs-pill-row">
                      <div class="spec-item" *ngIf="bike.range && bike.range !== 'N/A'">
                        <span class="spec-label">Range</span>
                        <span class="spec-val">{{ formatRange(bike.range) }}</span>
                      </div>
                      <div class="spec-item" *ngIf="bike.batteryCapacity && bike.batteryCapacity !== 'N/A'">
                        <span class="spec-label">Battery</span>
                        <span class="spec-val">{{ formatBattery(bike.batteryCapacity) }}</span>
                      </div>
                      <div class="spec-item" *ngIf="bike.topSpeed && bike.topSpeed !== 'N/A'">
                        <span class="spec-label">Top Speed</span>
                        <span class="spec-val">{{ bike.topSpeed }}</span>
                      </div>
                      <div class="spec-item" *ngIf="bike.bootSpace && bike.bootSpace !== 'N/A'">
                        <span class="spec-label">Boot Space</span>
                        <span class="spec-val">{{ bike.bootSpace }}</span>
                      </div>
                    </div>

                    <div class="price-row">
                      <span class="price-tag">{{ bike.price || 'Price TBA' }}</span>
                      <span class="price-type">Ex-Showroom</span>
                    </div>
                  </div>
                </div>
              }
              @if (getFilteredModels().length === 0) {
                <div class="no-models">No two-wheeler models found for this brand yet.</div>
              }
            </div>
          </div>
        } @else {
          <!-- Top 5 Longest Range Section -->
          @if (topRangeBikes.length > 0) {
            <div class="content-section animate-fade">
              <h2 class="section-title">Top 5 Longest Range Electric Two-Wheelers</h2>
              <div class="top-evs-container">
                @for (bike of topRangeBikes; track bike.id; let idx = $index) {
                  <div class="top-ev-card" [class.highlight]="idx === 0">
                    <div class="rank-badge">#{{ idx + 1 }}</div>
                    <div class="top-ev-image">
                      <img [src]="getOptimizedUrl(bike.imageUrl, 400, bike.parentModel || bike.name)" 
                           (error)="onImgError($event, bike)"
                           loading="lazy"
                           decoding="async"
                           width="400"
                           height="240"
                           class="thumb"
                           [alt]="getBrandName(bike.categoryId) + ' ' + (bike.parentModel || bike.name)">
                    </div>
                    <div class="top-ev-info">
                      <span class="top-brand">{{ getBrandName(bike.categoryId) }}</span>
                      <h3 class="top-name">{{ bike.parentModel || bike.name }}</h3>
                      <div class="top-stats">
                        <span class="stat-range">⚡ {{ formatRange(bike.range) }}</span>
                        <span class="stat-price">{{ bike.price }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- All Two-Wheelers Catalog Grid -->
          <div class="content-section animate-fade">
            <h2 class="section-title">All Electric Two-Wheelers</h2>
            <div class="models-grid">
              @for (bike of modelCards; track bike.id) {
                <div class="model-card">
                  <div class="model-image-container">
                    <img [src]="getOptimizedUrl(bike.imageUrl, 600, bike.parentModel || bike.name)" 
                         (error)="onImgError($event, bike)"
                         loading="lazy"
                         decoding="async"
                         width="600"
                         height="360"
                         class="model-thumb"
                         [alt]="getBrandName(bike.categoryId) + ' ' + (bike.parentModel || bike.name) + ' electric vehicle'">
                  </div>
                  <div class="model-info">
                    <div class="model-badge-row">
                      <span class="brand-tag">{{ getBrandName(bike.categoryId) }}</span>
                      @if (bike.lifecycleStatus === 'Upcoming' || bike.status === 'Upcoming') {
                        <span class="badge badge-upcoming">🟡 Upcoming</span>
                      }
                    </div>
                    <h3 class="model-name">{{ bike.parentModel || bike.name }}</h3>
                    <p class="variant-name">{{ bike.variantName || 'Base' }}</p>

                    <!-- Key Specs Row -->
                    <div class="specs-pill-row">
                      <div class="spec-item" *ngIf="bike.range && bike.range !== 'N/A'">
                        <span class="spec-label">Range</span>
                        <span class="spec-val">{{ formatRange(bike.range) }}</span>
                      </div>
                      <div class="spec-item" *ngIf="bike.batteryCapacity && bike.batteryCapacity !== 'N/A'">
                        <span class="spec-label">Battery</span>
                        <span class="spec-val">{{ formatBattery(bike.batteryCapacity) }}</span>
                      </div>
                      <div class="spec-item" *ngIf="bike.topSpeed && bike.topSpeed !== 'N/A'">
                        <span class="spec-label">Top Speed</span>
                        <span class="spec-val">{{ bike.topSpeed }}</span>
                      </div>
                      <div class="spec-item" *ngIf="bike.bootSpace && bike.bootSpace !== 'N/A'">
                        <span class="spec-label">Boot Space</span>
                        <span class="spec-val">{{ bike.bootSpace }}</span>
                      </div>
                    </div>

                    <div class="price-row">
                      <span class="price-tag">{{ bike.price || 'Price TBA' }}</span>
                      <span class="price-type">Ex-Showroom</span>
                    </div>
                  </div>
                </div>
              }
              @if (modelCards.length === 0) {
                <div class="no-models empty-catalog-box">
                  <span style="font-size: 2rem; margin-bottom: 8px; display: block;">🛵</span>
                  <h4 style="margin: 0 0 6px 0; color: #0F172A; font-size: 1.1rem;">Two-Wheelers Catalog Launching Soon</h4>
                  <p style="margin: 0; color: #64748B; font-size: 0.9rem;">We are populating detailed specifications for popular Indian electric scooters and bikes.</p>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .browse-page {
      background: #FAFAFA;
      color: #1E293B;
      padding: 120px 24px 100px 24px;
      min-height: 95vh;
      max-width: 960px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 28px;
    }
    
    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.03em;
      margin: 8px 0;
    }
    
    .subtitle {
      font-size: 1rem;
      color: #64748B;
      line-height: 1.5;
      max-width: 700px;
    }

    .search-container {
      position: relative;
      margin-bottom: 36px;
    }

    .content-section {
      margin-bottom: 40px;
    }

    .section-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 16px 0;
      letter-spacing: -0.02em;
    }

    .clear-filter-link {
      background: none;
      border: none;
      color: #0088CC;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }
    
    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .chip {
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid rgba(0,0,0,0.06);
      background: white;
      color: #1E293B;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    }
    
    .chip:hover {
      background: #F8FAFC;
      transform: translateY(-1px);
    }
    
    .chip.selected {
      background: #0088CC;
      color: white;
      border-color: #0088CC;
      box-shadow: 0 4px 14px rgba(0, 136, 204, 0.25);
    }
    
    .view-all-btn {
      background: #F1F5F9;
      color: #64748B;
    }

    /* Top EVs Horizontal Strip */
    .top-evs-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .top-ev-card {
      position: relative;
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 14px;
      padding: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .top-ev-card.highlight {
      border-color: rgba(0, 136, 204, 0.3);
      background: linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%);
    }

    .rank-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      background: #0F172A;
      color: white;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 6px;
      z-index: 2;
    }

    .top-ev-image {
      width: 80px;
      height: 60px;
      flex-shrink: 0;
      border-radius: 8px;
      overflow: hidden;
      background: #F1F5F9;
    }

    .top-ev-image .thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .top-ev-info {
      flex: 1;
      min-width: 0;
    }

    .top-brand {
      font-size: 0.75rem;
      color: #64748B;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .top-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0F172A;
      margin: 2px 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .top-stats {
      display: flex;
      gap: 8px;
      font-size: 0.8rem;
    }

    .stat-range {
      color: #0088CC;
      font-weight: 700;
    }

    .stat-price {
      color: #475569;
      font-weight: 600;
    }

    /* Models Grid */
    .models-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .model-card {
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 16px rgba(0,0,0,0.02);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
    }

    .model-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 24px rgba(0,0,0,0.05);
    }

    .model-image-container {
      width: 100%;
      aspect-ratio: 16/10;
      border-radius: 12px;
      overflow: hidden;
      background: #F1F5F9;
      margin-bottom: 12px;
    }

    .model-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .model-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .model-badge-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .brand-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .badge-upcoming {
      font-size: 0.7rem;
      font-weight: 700;
      color: #D97706;
      background: #FEF3C7;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .model-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 2px 0;
    }

    .variant-name {
      font-size: 0.85rem;
      color: #64748B;
      margin: 0 0 12px 0;
    }

    .specs-pill-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      background: #F8FAFC;
      padding: 10px;
      border-radius: 10px;
      margin-bottom: 14px;
    }

    .spec-item {
      display: flex;
      flex-direction: column;
    }

    .spec-label {
      font-size: 0.7rem;
      color: #94A3B8;
      text-transform: uppercase;
      font-weight: 600;
    }

    .spec-val {
      font-size: 0.85rem;
      font-weight: 700;
      color: #1E293B;
    }

    .price-row {
      margin-top: auto;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-top: 1px solid #F1F5F9;
      padding-top: 10px;
    }

    .price-tag {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0088CC;
    }

    .price-type {
      font-size: 0.75rem;
      color: #94A3B8;
    }

    .no-models {
      grid-column: 1 / -1;
      padding: 40px 20px;
      text-align: center;
      color: #64748B;
      background: white;
      border-radius: 14px;
      border: 1px dashed #CBD5E1;
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: #64748B;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(0, 136, 204, 0.15);
      border-left-color: #0088CC;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .animate-fade {
      animation: fadeIn 0.4s ease-out backwards;
    }

    .animate-premium-fade {
      animation: premiumFade 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes premiumFade {
      from { opacity: 0; transform: scale(0.99); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (max-width: 640px) {
      .browse-page {
        padding: 90px 16px 80px 16px;
      }
      h1 {
        font-size: 1.8rem;
      }
      .models-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BrowseTwoWheelersComponent implements OnInit, OnDestroy {
  loading = true;
  error = false;
  
  categories: Category[] = [];
  twoWheelersIndex: any[] = [];
  modelCards: any[] = [];
  topRangeBikes: any[] = [];
  
  showAllBrands = false;
  selectedBrandId: string | null = null;
  
  popularBrandNames = ['Ather', 'Ola Electric', 'TVS', 'Bajaj', 'Hero Vida', 'River', 'Ultraviolette', 'Chetak', 'Revolt'];
  private routeSub?: Subscription;

  constructor(
    private seoService: SeoService,
    private schemaService: SchemaService,
    private blogDataService: BlogDataService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.seoService.updateSeo({
      title: 'Electric Two-Wheelers in India (2026) — Range, Specs & Prices | EVCorn',
      description: 'Explore the latest electric scooters and motorcycles in India. Compare Ather, Ola Electric, TVS iQube, Bajaj Chetak, and more with real-world specs, battery, and prices.',
      url: 'https://evcorn.com/two-wheelers'
    });

    this.schemaService.setSchema([
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '/' },
        { name: 'Two-Wheelers', url: '/two-wheelers' }
      ])
    ]);

    this.loadData();

    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['category'] || params['brand']) {
        const target = (params['category'] || params['brand']).toLowerCase();
        this.selectedBrandId = target;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;
    this.error = false;

    this.blogDataService.getCategories().subscribe(cats => {
      this.categories = cats || [];
    });

    this.blogDataService.getVehicles().subscribe({
      next: (vehs) => {
        // Filter strictly to two-wheelers
        const twoWheelers = (vehs || []).filter(v => v.vehicleType === 'two-wheeler');
        this.twoWheelersIndex = twoWheelers;
        this.modelCards = twoWheelers;

        // Compute top 5 longest range two-wheelers
        const parsed = twoWheelers.map(v => {
          let rangeNum = 0;
          const rangeText = v.performance?.rangeText || v.range;
          if (rangeText) {
            const match = String(rangeText).match(/\d+(\.\d+)?/);
            if (match) rangeNum = parseFloat(match[0]);
          }
          return { ...v, rangeNum };
        });

        const dedupedMap = new Map<string, any>();
        parsed.sort((a, b) => b.rangeNum - a.rangeNum).forEach(v => {
          const pModel = v.parentModel || v.name;
          if (!dedupedMap.has(pModel)) {
            dedupedMap.set(pModel, v);
          }
        });
        this.topRangeBikes = Array.from(dedupedMap.values()).slice(0, 5);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.cdr.detectChanges();
      }
    });
  }

  retryLoad(): void {
    this.loadData();
  }

  get availableBrands(): Category[] {
    const presentCatIds = new Set(this.twoWheelersIndex.map(v => v.categoryId));
    return this.categories.filter(c => presentCatIds.has(c.id) || this.popularBrandNames.includes(c.name));
  }

  get displayedBrands(): Category[] {
    if (this.showAllBrands) return this.availableBrands;
    return this.availableBrands.filter(c => this.popularBrandNames.includes(c.name));
  }

  getBrandName(id: string): string {
    const found = this.categories.find(c => c.id === id || this.slugify(c.name) === id);
    return found ? found.name : id;
  }

  toggleAllBrands(): void {
    this.showAllBrands = !this.showAllBrands;
  }

  selectBrand(brandId: string): void {
    if (this.selectedBrandId === brandId) {
      this.selectedBrandId = null;
    } else {
      this.selectedBrandId = brandId;
    }
    this.cdr.detectChanges();
  }

  getFilteredModels(): any[] {
    if (!this.selectedBrandId) return this.modelCards;
    const target = this.selectedBrandId.toLowerCase();
    return this.modelCards.filter(m => {
      if (m.categoryId?.toLowerCase() === target) return true;
      const bName = this.getBrandName(m.categoryId).toLowerCase();
      return bName === target || this.slugify(bName) === target;
    });
  }

  getOptimizedUrl(url?: string, width = 600, alt = 'vehicle'): string {
    return getOptimizedImageUrl(url, width, alt);
  }

  onImgError(event: Event, bike?: any): void {
    handleImageError(event, bike?.parentModel || bike?.name || 'Two Wheeler');
  }

  formatRange(val: any): string {
    return formatCardRange(val);
  }

  formatBattery(val: any): string {
    return formatCardBattery(val);
  }

  slugify(text: string): string {
    return (text || '').toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }
}
