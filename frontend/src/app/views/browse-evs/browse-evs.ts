import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Category, CarSpec, BlogDataService } from '../../services/blog-data.service';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { CompareStateService } from '../../services/compare-state.service';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { CompareTrayComponent } from '../../components/compare-tray/compare-tray';
import { getOptimizedImageUrl, handleImageError } from '../../utils/image.utils';
import { formatCardRange, formatCardBattery } from '../../utils/vehicle-card-formatter';
import { ErrorStateComponent } from '../../components/error-state/error-state.component';

@Component({
  selector: 'app-browse-evs',
  standalone: true,
  imports: [CommonModule, RouterLink, BreadcrumbComponent, FormsModule, ErrorStateComponent, CompareTrayComponent],
  template: `
    <div class="browse-page animate-premium-fade">
      
      <div class="page-header animate-fade">
        <app-breadcrumb [paths]="[{label: 'Browse EVs', url: '/evs'}]"></app-breadcrumb>
        <h1>Browse Electric Vehicles</h1>
        <p class="subtitle">Find any EV instantly.</p>
      </div>

      <div class="search-container animate-fade">
        <input 
          type="text" 
          placeholder="Search EVs, Brands or Variants..." 
          [(ngModel)]="searchQuery" 
          (input)="onSearchInput()" 
          (focus)="loadVehiclesIndex()" 
          class="search-input"
        >
        @if (searchResults.length > 0 && searchQuery) {
          <div class="search-dropdown">
            @for (res of searchResults; track res.trackId) {
              <div class="search-result-item" (click)="onResultClick(res)">
                @if (res.type === 'brand') {
                  <div class="res-title" style="color: #0284C7; font-size: 1.25rem;">{{ res.name }}</div>
                } @else if (res.type === 'model') {
                  <div class="res-title" style="font-weight: 700;">{{ res.name }}</div>
                  <div class="res-brand">{{ getBrandName(res.categoryId) }}</div>
                } @else {
                  <div class="res-title">{{ res.name }}</div>
                  <div class="res-brand">{{ getBrandName(res.categoryId) }}</div>
                }
              </div>
            }
          </div>
        }
      </div>

      @if (loading) {
        <div class="loading-overlay">
          <div class="spinner"></div>
          <p>Loading vehicle catalog...</p>
        </div>
      } @else if (error) {
        <app-error-state
          message="Unable to load the vehicle catalog right now. Please try again in a few moments."
          (retry)="retryLoad()">
        </app-error-state>
      } @else {
        
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
            <button class="chip view-all-btn" (click)="toggleAllBrands()">
              {{ showAllBrands ? 'Show Less' : 'View All Brands' }}
            </button>
          </div>
        </div>

        @if (selectedBrandId || selectedCategory) {
          <div class="content-section animate-fade">
            <h2 class="section-title">
              {{ selectedCategory ? selectedCategory + ' Models' : getBrandName(selectedBrandId!) + ' Models' }}
            </h2>
            
            @if (loadingVehicles) {
              <div class="inline-loading">
                <div class="small-spinner"></div>
                <span>Loading models...</span>
              </div>
            } @else if (vehiclesError) {
              <app-error-state
                message="Unable to load models right now. Please try again in a few moments."
                (retry)="retryLoadVehicles()">
              </app-error-state>
            } @else {
              <div class="models-grid">
                @for (car of getFilteredModels(); track car.id) {
                  <div class="model-card">
                    <a [routerLink]="['/ev', slugify(getBrandName(car.categoryId)), slugify(car.parentModel || car.name)]" class="model-card-link">
                      <div class="model-image-container">
                        <img [src]="getOptimizedUrl(car.imageUrl, 600, car.parentModel || car.name)" 
                             (error)="onImgError($event, car.parentModel || car.name)"
                             loading="lazy"
                             decoding="async"
                             width="600"
                             height="360"
                             class="model-thumb"
                             [alt]="getBrandName(car.categoryId) + ' ' + (car.parentModel || car.name) + ' electric vehicle'">
                      </div>
                      <div class="model-info-row">
                        <div class="model-info">
                          <h3 class="model-name">{{ car.parentModel || car.name }}</h3>
                          <p class="variant-name">{{ car.variantCount }} Variant{{ car.variantCount !== 1 ? 's' : '' }} Available</p>
                        </div>
                      </div>
                    </a>
                    <div class="model-card-actions">
                      <a [routerLink]="['/ev', slugify(getBrandName(car.categoryId)), slugify(car.parentModel || car.name)]" class="card-action-btn details-btn">View Details</a>
                      <button
                        type="button"
                        class="card-action-btn compare-btn"
                        [class.selected]="isInCompare(car.id)"
                        (click)="toggleCompare(car, $event)">
                        {{ isInCompare(car.id) ? 'In Compare' : 'Compare' }}
                      </button>
                    </div>
                  </div>
                }
                @if (getFilteredModels().length === 0) {
                  <div class="no-models">No models found for this selection.</div>
                }
              </div>
            }
          </div>
        } @else {
          @if (topRangeEvs.length > 0) {
            <div class="content-section animate-fade" style="animation-delay: 0.1s;">
              <h2 class="section-title">🏆 Top 5 Longest Range EVs</h2>
              <p style="color: #64748B; font-size: 0.9rem; margin-top: -15px; margin-bottom: 20px;">Based on manufacturer claimed range across our database.</p>
              
              <div class="models-grid">
                @for (car of topRangeEvs; track car.id; let i = $index) {
                  <div class="model-card trending-card" style="position: relative;">
                    <div style="position: absolute; top: 12px; left: 12px; z-index: 10; background: #0F172A; color: white; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                      #{{ i + 1 }}
                    </div>

                    <a [routerLink]="['/ev', slugify(getBrandName(car.categoryId)), slugify(car.parentModel || car.name)]" class="model-card-link">
                      <div class="model-image-container">
                        <img [src]="getOptimizedUrl(car.imageUrl, 600, car.parentModel || car.name)" 
                             (error)="onImgError($event, car.parentModel || car.name)"
                             loading="lazy"
                             decoding="async"
                             width="600"
                             height="360"
                             class="model-thumb"
                             [alt]="getBrandName(car.categoryId) + ' ' + (car.parentModel || car.name) + ' electric vehicle'">
                      </div>
                      <div class="model-info-row" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                        <div class="model-info" style="width: 100%;">
                          <h3 class="model-name" style="font-size: 1.1rem; line-height: 1.2;">{{ car.parentModel || car.name }}</h3>
                          <p class="variant-name" style="font-size: 0.8rem; color: #94A3B8;">{{ car.variantName }}</p>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; width: 100%; align-items: flex-end;">
                          <div style="background: rgba(16, 185, 129, 0.1); color: #047857; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); width: fit-content;">
                            <span style="font-weight: 800; font-size: 1.05rem;">{{ formatRange(car.range) }}</span>
                          </div>
                          <span style="font-size: 0.8rem; font-weight: 600; color: #64748B;">{{ formatBattery(car.batteryCapacity) }}</span>
                        </div>
                      </div>
                    </a>
                    <div class="model-card-actions">
                      <a [routerLink]="['/ev', slugify(getBrandName(car.categoryId)), slugify(car.parentModel || car.name)]" class="card-action-btn details-btn">View Details</a>
                      <button
                        type="button"
                        class="card-action-btn compare-btn"
                        [class.selected]="isInCompare(car.id)"
                        (click)="toggleCompare(car, $event)">
                        {{ isInCompare(car.id) ? 'In Compare' : 'Compare' }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- Filter by Body Style (Shifted to Bottom) -->
        <div class="content-section animate-fade" style="margin-top: 24px;">
          <h2 class="section-title">Filter by Body Style</h2>
          <div class="chips-container">
            <button class="chip category-chip" [class.selected]="selectedCategory === 'SUV'" (click)="selectCategory('SUV')">SUV</button>
            <button class="chip category-chip" [class.selected]="selectedCategory === 'Hatchback'" (click)="selectCategory('Hatchback')">Hatchback</button>
            <button class="chip category-chip" [class.selected]="selectedCategory === 'Sedan'" (click)="selectCategory('Sedan')">Sedan</button>
            <button class="chip category-chip" [class.selected]="selectedCategory === 'MPV'" (click)="selectCategory('MPV')">MPV</button>
            <button class="chip category-chip" [class.selected]="selectedCategory === 'Sports'" (click)="selectCategory('Sports')">Sports</button>
          </div>
        </div>
      }
    </div>

    <app-compare-tray></app-compare-tray>
  `,
  styles: [`
    .browse-page {
      background: #fafafa;
      color: #1e293b;
      padding: 120px 24px 100px 24px;
      min-height: 95vh;
      max-width: 900px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 32px;
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
    }

    .search-container {
      position: relative;
      margin-bottom: 40px;
    }
    
    .search-input {
      width: 100%;
      padding: 18px 24px;
      font-size: 1.1rem;
      background: white;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      color: #0F172A;
      transition: all 0.3s;
    }
    
    .search-input:focus {
      outline: none;
      border-color: #0284C7;
      box-shadow: 0 4px 25px rgba(2, 132, 199, 0.1);
    }
    
    .search-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 100%;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      border: 1px solid rgba(0,0,0,0.05);
      z-index: 100;
      max-height: 300px;
      overflow-y: auto;
      padding: 8px;
    }
    
    .search-result-item {
      padding: 12px 16px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }
    
    .search-result-item:hover {
      background: #F1F5F9;
    }
    
    .res-title {
      font-weight: 700;
      color: #0F172A;
    }
    
    .res-brand {
      font-size: 0.8rem;
      color: #64748B;
      font-weight: 600;
      background: #F8FAFC;
      padding: 4px 10px;
      border-radius: 20px;
    }

    .content-section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 16px 0;
    }
    
    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    
    .chip {
      padding: 12px 24px;
      border-radius: 30px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid rgba(0,0,0,0.05);
      background: white;
      color: #1E293B;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    
    .chip:hover {
      background: #F8FAFC;
      transform: translateY(-2px);
    }
    
    .chip.selected {
      background: #0284C7;
      color: white;
      border-color: #0284C7;
      box-shadow: 0 4px 15px rgba(2, 132, 199, 0.2);
    }
    
    .view-all-btn {
      background: #F1F5F9;
      color: #64748B;
    }

    .models-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .model-card {
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      overflow: hidden;
    }

    .model-card-link {
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .model-card-actions {
      display: flex;
      gap: 8px;
      margin-top: 14px;
    }

    .card-action-btn {
      flex: 1;
      text-align: center;
      padding: 9px 10px;
      border-radius: 12px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .details-btn {
      background: #F8FAFC;
      color: #0F172A;
      border-color: #E2E8F0;
    }
    .details-btn:hover {
      border-color: #0284C7;
      color: #0284C7;
    }

    .compare-btn {
      background: rgba(2, 132, 199, 0.08);
      color: #0284C7;
      border-color: rgba(2, 132, 199, 0.25);
    }
    .compare-btn:hover {
      background: rgba(2, 132, 199, 0.14);
    }
    .compare-btn.selected {
      background: #0284C7;
      color: white;
      border-color: #0284C7;
    }
    
    .model-image-container {
      width: 100%;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      border-radius: 12px;
      background: #F8FAFC;
      overflow: hidden;
    }
    
    .model-thumb {
      width: 100%;
      height: 100%;
      object-fit: contain;
      mix-blend-mode: multiply;
    }

    .model-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    
    .model-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.06);
      border-color: rgba(2, 132, 199, 0.3);
    }
    
    .model-card:hover .arrow {
      color: #0284C7;
      transform: translateX(4px);
    }

    .model-name {
      margin: 0 0 6px 0;
      font-size: 1.2rem;
      font-weight: 800;
      color: #0F172A;
    }
    
    .variant-name {
      margin: 0;
      font-size: 0.85rem;
      color: #64748B;
      font-weight: 600;
    }
    
    .arrow {
      font-size: 1.4rem;
      font-weight: bold;
      color: #CBD5E1;
      transition: all 0.2s;
    }
    
    .no-models {
      grid-column: 1 / -1;
      color: #94A3B8;
      font-size: 0.95rem;
      padding: 20px 0;
      font-weight: 500;
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
    }
    
    .inline-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #64748B;
      font-size: 0.95rem;
      font-weight: 500;
      padding: 20px 0;
    }
    
    .spinner, .small-spinner {
      border: 3px solid rgba(16, 185, 129, 0.1);
      border-radius: 50%;
      border-left-color: #10B981;
      animation: spin 1s linear infinite;
    }
    .spinner { width: 40px; height: 40px; margin-bottom: 20px; }
    .small-spinner { width: 20px; height: 20px; border-width: 2px; }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .animate-fade {
      animation: fadeIn 0.4s ease-out backwards;
    }
    .animate-premium-fade {
      animation: premiumFade 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .search-container { animation-delay: 0.1s; }
    .content-section:nth-child(3) { animation-delay: 0.2s; }
    .content-section:nth-child(4) { animation-delay: 0.3s; }
    .content-section:nth-child(5) { animation-delay: 0.4s; }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes premiumFade {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class BrowseEvsComponent implements OnInit, OnDestroy {
  loading = true;
  error = false;
  loadingVehicles = false;
  vehiclesLoaded = false;
  vehiclesError = false;
  
  categories: Category[] = [];
  allVehiclesIndex: any[] = []; // raw lightweight index
  modelCards: any[] = []; // deduped models for grid
  
  searchQuery = '';
  searchResults: any[] = [];
  
  showAllBrands = false;
  selectedBrandId: string | null = null;
  selectedCategory: string | null = null;
  
  topRangeEvs: any[] = [];
  compareIds: string[] = [];
  private compareSub?: Subscription;

  popularBrandNames = ['Tata Motors', 'Mahindra', 'MG', 'Hyundai', 'BYD', 'Kia'];
  /** Deep-link from AEO / shared URLs: `/evs?category={brandId|brandNameSlug}`. */
  private pendingCategoryQuery: string | null = null;
  private routeSub?: Subscription;

  constructor(
    private seoService: SeoService,
    private schemaService: SchemaService,
    private blogData: BlogDataService,
    private compareState: CompareStateService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const title = 'Browse Electric Vehicles in India';
    const description =
      'Discover and compare electric cars available in India. Browse EV models by brand including Tata, MG, Mahindra, BYD, Hyundai, and Kia with prices, range, and battery specs.';

    this.seoService.updateSeo({
      title,
      description,
      url: '/evs'
    });

    this.schemaService.setSchema([
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '/' },
        { name: 'Browse EVs', url: '/evs' }
      ]),
      this.schemaService.buildCollectionPage(title, description, '/evs')
    ]);

    this.compareSub = this.compareState.selectedVehicles$.subscribe((ids) => {
      this.compareIds = ids;
      this.cdr.detectChanges();
    });

    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const raw = (params.get('category') || params.get('brand') || '').trim();
      this.pendingCategoryQuery = raw || null;
      if (this.categories.length) {
        this.applyCategoryQuery();
      }
    });

    // Instantly preload lightweight vehicles index for 0ms brand/category filtering
    this.loadVehiclesIndex();

    this.loadCategories();
  }

  ngOnDestroy() {
    this.compareSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  isInCompare(carId: string | undefined): boolean {
    return !!carId && this.compareIds.includes(carId);
  }

  toggleCompare(car: { id?: string }, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!car?.id) return;
    this.compareState.toggleVehicle(car.id);
  }

  private loadCategories() {
    this.loading = true;
    this.error = false;
    this.blogData.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.loading = false;
        this.applyCategoryQuery();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.loading = false;
        this.error = true;
        this.cdr.detectChanges();
      }
    });
  }

  /** Honor `/evs?category=` from AEO Explore links (brand id or slugified name). */
  private applyCategoryQuery(): void {
    const q = this.pendingCategoryQuery;
    if (!q || !this.categories.length) return;
    const match = this.categories.find(
      (c) =>
        c.id === q ||
        this.slugify(c.id) === q ||
        this.slugify(c.name) === q
    );
    if (!match?.id) return;
    if (this.selectedBrandId !== match.id) {
      this.selectedBrandId = match.id;
      this.selectedCategory = null;
      this.showAllBrands = true;
      if (!this.vehiclesLoaded) {
        this.loadVehiclesIndex();
      }
    }
    this.pendingCategoryQuery = null;
  }

  retryLoad() {
    this.blogData.clearAllCaches();
    this.loadCategories();
  }

  retryLoadVehicles() {
    this.vehiclesLoaded = false;
    this.vehiclesError = false;
    this.blogData.clearVehicleCache();
    this.loadVehiclesIndex();
  }

  getOptimizedUrl(url: string | undefined | null, width?: number, modelName?: string): string {
    return getOptimizedImageUrl(url, width, modelName);
  }

  onImgError(event: Event, modelName?: string): void {
    handleImageError(event, modelName);
  }

  formatRange(val: any): string {
    return formatCardRange(val);
  }

  formatBattery(val: any): string {
    return formatCardBattery(val);
  }

  // Top-range strip is derived inside loadVehiclesIndex() from the light
  // catalog (no second full getVehicles() download). Dead full-catalog helper
  // removed in Phase 5.3 final review.

  get displayedBrands() {
    if (this.showAllBrands) return this.categories;
    // Filter to only the popular brands based on names
    return this.categories.filter(c => this.popularBrandNames.includes(c.name));
  }
  
  getBrandName(id: string): string {
    const brand = this.categories.find(c => c.id === id);
    return brand ? brand.name : 'Brand';
  }
  
  getBrandNameBySlug(slug: string): string {
    const brand = this.categories.find(c => this.slugify(c.name) === slug);
    return brand ? brand.name : slug;
  }

  toggleAllBrands() {
    this.showAllBrands = !this.showAllBrands;
  }

  selectBrand(brandId: string) {
    if (this.selectedBrandId === brandId) {
      this.selectedBrandId = null;
    } else {
      this.selectedBrandId = brandId;
      this.selectedCategory = null; // reset category filter
      if (!this.vehiclesLoaded) {
        this.loadVehiclesIndex();
      }
    }
    this.cdr.detectChanges();
  }
  
  selectCategory(cat: string) {
    if (this.selectedCategory === cat) {
      this.selectedCategory = null;
    } else {
      this.selectedCategory = cat;
      this.selectedBrandId = null; // reset brand filter
      if (!this.vehiclesLoaded) {
        this.loadVehiclesIndex();
      }
    }
    this.cdr.detectChanges();
  }

  loadVehiclesIndex() {
    if (this.vehiclesLoaded || this.loadingVehicles) return;
    
    this.loadingVehicles = true;
    this.vehiclesError = false;
    this.blogData.getVehiclesLight().subscribe({
      next: (vehicles) => {
        this.allVehiclesIndex = vehicles;
        
        // Create deduped model cards for grid display
        const uniqueModels = new Map<string, any>();
        vehicles.forEach(v => {
          const rawKey = (v.parentModel || v.name || '').trim().replace(/\s+/g, ' ');
          const groupKey = `${v.categoryId}:${rawKey.toLowerCase()}`;
          if (!uniqueModels.has(groupKey)) {
            uniqueModels.set(groupKey, { ...v, parentModel: rawKey, variantCount: 1 });
          } else {
            const existing = uniqueModels.get(groupKey);
            existing.variantCount++;
          }
        });
        
        this.modelCards = Array.from(uniqueModels.values());
        
        // Compute top range EVs directly from light index without extra API call
        const parsed = vehicles.map(v => {
          let rangeNum = 0;
          const item = v as any;
          const rangeText = item.performance?.rangeText || item.range;
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
        this.topRangeEvs = Array.from(dedupedMap.values()).slice(0, 5);

        this.vehiclesLoaded = true;
        this.loadingVehicles = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load vehicles index', err);
        this.loadingVehicles = false;
        this.vehiclesError = true;
        this.cdr.detectChanges();
      }
    });
  }

  getFilteredModels() {
    if (!this.vehiclesLoaded) return [];
    
    let filtered = this.modelCards;
    
    if (this.selectedBrandId) {
      const selectedBrand = this.categories.find(c => c.id === this.selectedBrandId);
      const targetBrandName = selectedBrand ? selectedBrand.name.toLowerCase() : '';
      const targetSlug = selectedBrand ? this.slugify(selectedBrand.name) : '';

      filtered = filtered.filter(m => {
        if (m.categoryId === this.selectedBrandId) return true;
        const mBrandName = this.getBrandName(m.categoryId).toLowerCase();
        const mSlug = this.slugify(mBrandName);
        return (targetBrandName && mBrandName === targetBrandName) || (targetSlug && mSlug === targetSlug);
      });
    }
    
    if (this.selectedCategory) {
      filtered = filtered.filter(m => m.bodyStyle === this.selectedCategory);
    }
    
    return filtered;
  }

  onSearchInput() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }
    
    const query = this.searchQuery.toLowerCase().trim();
    
    // 1. Search Brands (Top Priority)
    const matchingBrands = this.categories
      .filter(c => c.name.toLowerCase().includes(query))
      .map(c => ({ type: 'brand', trackId: 'brand-' + c.id, id: c.id, name: c.name }));

    // 2. Search Vehicles (Group by Model, fallback to Variant)
    const matchingModelsMap = new Map<string, any>();
    const matchingVariants: any[] = [];

    this.allVehiclesIndex.forEach(v => {
      const parentName = v.parentModel || v.name;
      const variantName = v.variantName || '';
      
      const pMatch = parentName.toLowerCase().includes(query);
      const vMatch = variantName.toLowerCase().includes(query);
      const bMatch = this.getBrandName(v.categoryId).toLowerCase().includes(query);

      // If it matches the Model name or Brand name, we show the parent model
      if (pMatch || bMatch) {
        if (!matchingModelsMap.has(parentName)) {
          matchingModelsMap.set(parentName, {
            type: 'model',
            trackId: 'model-' + parentName,
            name: parentName,
            categoryId: v.categoryId,
            parentModel: parentName // for routing
          });
        }
      } 
      // Only show specifically matching variants if the model itself didn't match
      else if (vMatch) {
        matchingVariants.push({
          type: 'variant',
          trackId: 'veh-' + v.id,
          ...v
        });
      }
    });

    const matchingModels = Array.from(matchingModelsMap.values());

    this.searchResults = [...matchingBrands, ...matchingModels, ...matchingVariants].slice(0, 8);
  }

  onResultClick(res: any) {
    if (res.type === 'brand') {
      this.searchQuery = '';
      this.searchResults = [];
      this.selectBrand(res.id);
    } else {
      this.goToVehicle(res);
    }
  }
  
  goToVehicle(vehicle: any) {
    const brandSlug = this.slugify(this.getBrandName(vehicle.categoryId));
    const modelSlug = this.slugify(vehicle.parentModel || vehicle.name);
    
    this.router.navigate(['/ev', brandSlug, modelSlug]);
  }

  slugify(text: string): string {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }
}
