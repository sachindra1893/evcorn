import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { BlogDataService, CarSpec, Category } from '../../services/blog-data.service';
import { CompareStateService } from '../../services/compare-state.service';
import { AnalyticsService } from '../../services/analytics.service';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../components/error-state/error-state.component';
import { AsyncState } from '../../core/async-state/async-state';
import { NetworkStatusService } from '../../core/network/network-status.service';
import { getOptimizedImageUrl } from '../../utils/image.utils';
import {
  COMPARE_MAX_VEHICLES,
  CompareSection,
  buildCompareQueryString,
  buildCompareSections,
  clampCompareIds,
  displayVehicleLabel,
  hydrateCompareSlot,
  parseCompareQueryIds
} from '../../compare/compare-engine';

type CompareLoadState = AsyncState<CarSpec[]>;

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BreadcrumbComponent,
    EmptyStateComponent,
    ErrorStateComponent
  ],
  template: `
    <div class="compare-page animate-premium-fade">
      <div class="glow-bg glow-cyan"></div>
      <div class="glow-bg glow-purple"></div>

      <div class="compare-header-box">
        <app-breadcrumb [paths]="[{label: 'Compare EVs', url: '/compare'}]"></app-breadcrumb>
        <div class="compare-title-row">
          <h1>Compare Electric Vehicles</h1>
          @if (selectedVehicles.length >= 2) {
            <button type="button" (click)="shareCompare()" class="share-btn" title="Share this comparison">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7L15.9 7.33c.53.48 1.22.78 1.98.78 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.52 9.34 6.84 9.05 6 9.05c-1.66 0-3 1.34-3 3s1.34 3 3 3c.84 0 1.52-.29 2.04-.76l7.97 4.65c-.03.22-.05.45-.05.67 0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9-1.3-2.9-2.9-2.9z"/>
              </svg>
              <span>Share</span>
            </button>
          }
        </div>
        <p class="subtitle">Side-by-side buying specs for up to {{ maxSlots }} EVs — range, charging, safety, and more.</p>
      </div>

      @switch (loadState.status) {
        @case ('loading') {
          <div class="state-panel" role="status">
            <div class="spinner"></div>
            <p>Loading vehicle data…</p>
            @if (isBackendWaking()) {
              <p class="retry-hint">Server is waking up. This can take about 30 seconds…</p>
            }
          </div>
        }
        @case ('offline') {
          <app-error-state
            message="You're offline. Reconnect to load vehicles for comparison."
            [showRetry]="true"
            (retry)="retryLoad()">
          </app-error-state>
        }
        @case ('timeout') {
          <app-error-state
            message="This is taking longer than expected. Please try again."
            [showRetry]="true"
            (retry)="retryLoad()">
          </app-error-state>
        }
        @case ('error') {
          <app-error-state
            [message]="errorMessage"
            [showRetry]="true"
            (retry)="retryLoad()">
          </app-error-state>
        }
        @case ('empty') {
          <app-empty-state
            icon="🚗"
            message="No published EVs are available to compare right now."
            actionLabel="Browse EVs"
            (action)="goBrowse()">
          </app-empty-state>
        }
        @case ('success') {
          <div class="picker-grid">
            @for (slot of slots; track trackPickerSlot(slot)) {
              <div class="picker-card">
                <div class="picker-header">
                  <span>Vehicle {{ slot + 1 }}</span>
                  @if (selectedIds[slot]) {
                    <button type="button" class="clear-slot" (click)="clearSlot(slot)" title="Clear">✕</button>
                  }
                </div>

                <label class="sr-only" [attr.for]="'brand-' + slot">Brand</label>
                <select [id]="'brand-' + slot" (change)="onBrandChange(slot, $event)">
                  <option value="" [selected]="!brandIds[slot]">Select brand</option>
                  @for (cat of categories; track cat.id) {
                    <option [value]="cat.id" [selected]="brandIds[slot] === cat.id">{{ cat.name }}</option>
                  }
                </select>

                <label class="sr-only" [attr.for]="'model-' + slot">Model</label>
                <select
                  [id]="'model-' + slot"
                  [disabled]="!brandIds[slot]"
                  (change)="onModelChange(slot, $event)">
                  <option value="" [selected]="!modelNames[slot]">Select model</option>
                  @for (model of modelsForBrand(brandIds[slot]); track model) {
                    <option [value]="model" [selected]="modelNames[slot] === model">{{ model }}</option>
                  }
                </select>

                <label class="sr-only" [attr.for]="'variant-' + slot">Variant</label>
                <select
                  [id]="'variant-' + slot"
                  [disabled]="!modelNames[slot]"
                  (change)="onVariantChange(slot, $event)">
                  <option value="" [selected]="!selectedIds[slot]">Select variant</option>
                  @for (car of variantsForModel(brandIds[slot], modelNames[slot]); track car.id) {
                    <option [value]="car.id" [selected]="selectedIds[slot] === car.id">{{ car.variantName || car.name }}</option>
                  }
                </select>

                @if (selectedVehicles[slot]; as vehicle) {
                  <div class="picked-preview">
                    <img
                      [src]="getOptimizedUrl(vehicle.imageUrl, 320, vehicle.parentModel || vehicle.name)"
                      [alt]="vehicle.parentModel || vehicle.name"
                      loading="lazy"
                      decoding="async"
                      width="120"
                      height="72"
                      (error)="onImgError($event)"
                    >
                    <div>
                      <strong>{{ vehicle.parentModel || vehicle.name }}</strong>
                      <span>{{ vehicle.variantName }}</span>
                      <a [routerLink]="detailLink(vehicle)" class="detail-link">View details</a>
                    </div>
                  </div>
                } @else if (removedNotices[slot]) {
                  <p class="removed-hint" role="status">{{ removedNotices[slot] }}</p>
                }
              </div>
            }
          </div>

          @if (selectedCount === 0) {
            <app-empty-state
              icon="⚖️"
              message="No EVs selected yet. Use the pickers above, or browse the catalog to choose two vehicles."
              actionLabel="Browse EVs to select"
              (action)="goBrowse()">
            </app-empty-state>
          } @else if (selectedCount === 1) {
            <app-empty-state
              icon="➕"
              message="Select one more EV to compare side-by-side."
              actionLabel="Browse EVs to select"
              (action)="goBrowse()">
            </app-empty-state>
          } @else {
            <div class="compare-results">
              <div class="vehicle-headers" role="row">
                <div class="spec-gutter" aria-hidden="true"></div>
                @for (vehicle of selectedVehicles; track vehicle?.id || $index) {
                  <div class="vehicle-header-cell">
                    @if (vehicle) {
                      <span class="brand-tag">{{ brandName(vehicle.categoryId) }}</span>
                      <strong>{{ vehicle.parentModel || vehicle.name }}</strong>
                      <span class="variant-line">{{ vehicle.variantName }}</span>
                      @if (vehicle.price) {
                        <span class="price-line">{{ vehicle.price }}</span>
                      }
                    } @else {
                      <span class="missing-vehicle">Not available</span>
                    }
                  </div>
                }
              </div>

              @for (section of sections; track section.categoryId) {
                <section class="spec-category" [attr.aria-labelledby]="'cat-' + section.categoryId">
                  <h2 [id]="'cat-' + section.categoryId">{{ section.label }}</h2>
                  @for (row of section.rows; track row.fieldId) {
                    <div class="spec-row" role="row">
                      <div class="spec-label" role="rowheader">{{ row.label }}</div>
                      @for (value of row.values; track $index) {
                        <div class="spec-value" role="cell">{{ value }}</div>
                      }
                    </div>
                  }
                </section>
              }
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .compare-page {
      position: relative;
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 16px 80px;
      overflow: hidden;
      min-height: 60vh;
    }
    .glow-bg {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.18;
      pointer-events: none;
      z-index: 0;
    }
    .glow-cyan { width: 280px; height: 280px; background: #00D2FF; top: -40px; left: -60px; }
    .glow-purple { width: 240px; height: 240px; background: #7952FF; top: 120px; right: -40px; }

    .compare-header-box, .picker-grid, .compare-results, .state-panel, app-empty-state, app-error-state {
      position: relative;
      z-index: 1;
    }

    .compare-header-box { margin-bottom: 1.5rem; }
    .compare-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    h1 {
      margin: 8px 0 0;
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.03em;
    }
    .subtitle {
      margin: 8px 0 0;
      color: #64748B;
      font-size: 0.95rem;
      max-width: 540px;
      line-height: 1.45;
    }
    .share-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: white;
      border: 1px solid #E2E8F0;
      color: #0284C7;
      padding: 8px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .share-btn:hover { border-color: #0284C7; background: rgba(2, 132, 199, 0.04); }

    .state-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      color: #64748B;
      gap: 12px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #E2E8F0;
      border-top-color: #0284C7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .retry-hint { font-size: 0.85rem; color: #94A3B8; text-align: center; max-width: 320px; }

    .picker-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 1.5rem;
    }
    @media (min-width: 700px) {
      .picker-grid { grid-template-columns: 1fr 1fr; }
    }
    .picker-card {
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    }
    .picker-header {
      display: flex;
      justify-content: space-between;
      font-weight: 800;
      color: #0F172A;
      font-size: 0.9rem;
    }
    .clear-slot {
      border: none;
      background: none;
      color: #94A3B8;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .clear-slot:hover { color: #EF4444; }
    select {
      width: 100%;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      color: #0F172A;
      font-size: 0.9rem;
      font-weight: 600;
    }
    select:disabled { opacity: 0.55; }
    .picked-preview {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 4px;
      padding-top: 10px;
      border-top: 1px solid #F1F5F9;
    }
    .picked-preview img {
      width: 88px;
      height: 56px;
      object-fit: contain;
      background: #F8FAFC;
      border-radius: 8px;
    }
    .picked-preview strong {
      display: block;
      color: #0F172A;
      font-size: 0.95rem;
    }
    .picked-preview span {
      display: block;
      color: #64748B;
      font-size: 0.8rem;
      margin-top: 2px;
    }
    .detail-link {
      display: inline-block;
      margin-top: 6px;
      color: #0284C7;
      font-size: 0.8rem;
      font-weight: 700;
      text-decoration: none;
    }
    .removed-hint {
      margin: 0;
      font-size: 0.8rem;
      color: #B45309;
      background: #FFFBEB;
      border: 1px dashed #FCD34D;
      border-radius: 10px;
      padding: 8px 10px;
    }

    .vehicle-headers {
      display: grid;
      grid-template-columns: minmax(110px, 0.9fr) 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
      position: sticky;
      top: 0;
      z-index: 2;
      background: rgba(248, 249, 250, 0.92);
      backdrop-filter: blur(8px);
      padding: 8px 0;
    }
    .vehicle-header-cell {
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 14px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .brand-tag {
      align-self: flex-start;
      font-size: 0.7rem;
      font-weight: 800;
      color: #0284C7;
      background: rgba(2, 132, 199, 0.08);
      border: 1px solid rgba(2, 132, 199, 0.2);
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .vehicle-header-cell strong {
      color: #0F172A;
      font-size: 0.95rem;
      line-height: 1.25;
    }
    .variant-line, .price-line, .missing-vehicle {
      color: #64748B;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .price-line { color: #0F172A; font-weight: 800; }

    .spec-category {
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 16px;
      padding: 8px 0 4px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      overflow: hidden;
    }
    .spec-category h2 {
      margin: 0;
      padding: 10px 14px 8px;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #64748B;
    }
    .spec-row {
      display: grid;
      grid-template-columns: minmax(110px, 0.9fr) 1fr 1fr;
      gap: 0;
      border-top: 1px solid #F1F5F9;
    }
    .spec-label, .spec-value {
      padding: 12px 14px;
      font-size: 0.9rem;
      line-height: 1.35;
    }
    .spec-label {
      color: #64748B;
      font-weight: 600;
      background: #F8FAFC;
    }
    .spec-value {
      color: #0F172A;
      font-weight: 700;
      word-break: break-word;
    }
    .spec-gutter { min-height: 1px; }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      border: 0;
    }

    @media (max-width: 640px) {
      .compare-page { padding: 16px 12px 100px; }
      .vehicle-headers, .spec-row {
        grid-template-columns: minmax(92px, 0.85fr) 1fr 1fr;
      }
      .spec-label, .spec-value { padding: 10px 8px; font-size: 0.82rem; }
      .vehicle-header-cell { padding: 10px 8px; }
    }
  `]
})
export class CompareComponent implements OnInit, OnDestroy {
  readonly maxSlots = COMPARE_MAX_VEHICLES;
  readonly slots = [0, 1] as const;

  loadState: CompareLoadState = { status: 'loading' };
  categories: Category[] = [];
  catalog: CarSpec[] = [];

  brandIds: Array<string | null> = [null, null];
  modelNames: Array<string | null> = [null, null];
  selectedIds: Array<string | null> = [null, null];
  selectedVehicles: Array<CarSpec | null> = [null, null];
  removedNotices: Array<string | null> = [null, null];
  sections: CompareSection[] = [];
  /** Bumps when preselected IDs hydrate so native selects re-render with [selected]. */
  pickerSyncKey = 0;

  private routeSub?: Subscription;
  private loadSub?: Subscription;
  private trackedCompareKey = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seoService: SeoService,
    private schemaService: SchemaService,
    private blogData: BlogDataService,
    private compareState: CompareStateService,
    private analytics: AnalyticsService,
    private network: NetworkStatusService,
    private cdr: ChangeDetectorRef
  ) {}

  get selectedCount(): number {
    return this.selectedVehicles.filter(Boolean).length;
  }

  get errorMessage(): string {
    if (this.loadState.status === 'error') {
      return this.loadState.error.userMessage || 'Unable to load comparison data. Please try again.';
    }
    return 'Unable to load comparison data. Please try again.';
  }

  isBackendWaking(): boolean {
    return this.network.backendWaking();
  }

  ngOnInit(): void {
    this.updateSEOMetadata();
    this.loadCatalog();

    this.routeSub = this.route.queryParams.subscribe((params) => {
      const fromQuery = parseCompareQueryIds({
        ids: params['ids'] ?? null,
        cars: params['cars'] ?? null
      });

      if (fromQuery.length > 0) {
        this.applyIdSelection(fromQuery);
        return;
      }

      // Prefer tray when no shareable ids in URL.
      const trayIds = this.compareState.currentSelectedIds;
      if (trayIds.length > 0) {
        this.applyIdSelection(trayIds);
        this.syncUrl(trayIds, false);
        return;
      }

      // Optional brand preselect from quiz / deep links.
      const brand = params['brand'];
      if (brand) {
        this.brandIds[0] = brand;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  retryLoad(): void {
    this.blogData.clearVehicleCache();
    this.blogData.clearAllCaches();
    this.loadCatalog();
  }

  goBrowse(): void {
    this.router.navigate(['/evs']);
  }

  getOptimizedUrl(url: string | undefined | null, width?: number, modelName?: string): string {
    return getOptimizedImageUrl(url, width, modelName);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.visibility = 'hidden';
  }

  brandName(categoryId: string): string {
    return this.categories.find((c) => c.id === categoryId)?.name || 'Brand';
  }

  modelsForBrand(brandId: string | null): string[] {
    if (!brandId) return [];
    const models = new Set<string>();
    for (const car of this.catalog) {
      if (car.categoryId === brandId) {
        models.add(car.parentModel || car.name);
      }
    }
    return Array.from(models).sort();
  }

  variantsForModel(brandId: string | null, modelName: string | null): CarSpec[] {
    if (!brandId || !modelName) return [];
    return this.catalog.filter(
      (car) => car.categoryId === brandId && (car.parentModel || car.name) === modelName
    );
  }

  trackPickerSlot(slot: number): string {
    return `${slot}-${this.pickerSyncKey}-${this.selectedIds[slot] || 'empty'}`;
  }

  detailLink(vehicle: CarSpec): string[] {
    return ['/ev', this.slugify(this.brandName(vehicle.categoryId)), this.slugify(vehicle.parentModel || vehicle.name)];
  }

  onBrandChange(slot: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value || null;
    this.brandIds[slot] = value;
    this.modelNames[slot] = null;
    this.selectedIds[slot] = null;
    this.selectedVehicles[slot] = null;
    this.removedNotices[slot] = null;
    this.afterSelectionChange();
  }

  onModelChange(slot: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value || null;
    this.modelNames[slot] = value;
    this.selectedIds[slot] = null;
    this.selectedVehicles[slot] = null;
    this.removedNotices[slot] = null;
    this.afterSelectionChange();
  }

  onVariantChange(slot: number, event: Event): void {
    const id = (event.target as HTMLSelectElement).value || null;
    this.selectedIds[slot] = id;
    this.selectedVehicles[slot] = id ? this.catalog.find((c) => c.id === id) || null : null;
    this.removedNotices[slot] = null;
    this.afterSelectionChange();
  }

  clearSlot(slot: number): void {
    this.brandIds[slot] = null;
    this.modelNames[slot] = null;
    this.selectedIds[slot] = null;
    this.selectedVehicles[slot] = null;
    this.removedNotices[slot] = null;
    this.afterSelectionChange();
  }

  shareCompare(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const ids = clampCompareIds(this.selectedIds);
    const qs = buildCompareQueryString(ids);
    const shareUrl = qs ? `https://evcorn.com/compare?${qs}` : 'https://evcorn.com/compare';
    const names = this.selectedVehicles.filter(Boolean).map((v) => displayVehicleLabel(v));
    const shareData = {
      title: names.length ? `Compare ${names.join(' vs ')} | EVCorn` : 'Compare EVs | EVCorn',
      text: names.length
        ? `Compare ${names.join(' and ')} side-by-side on EVCorn.`
        : 'Compare electric vehicles side-by-side on EVCorn.',
      url: shareUrl
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      navigator.share(shareData).catch(() => undefined);
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => undefined);
    }
  }

  private loadCatalog(): void {
    this.loadState = { status: 'loading' };
    this.cdr.detectChanges();

    this.blogData.getCategories().pipe(take(1)).subscribe({
      next: (cats) => {
        this.categories = cats || [];
        // Remount pickers so Brand options reflect preselected categoryId.
        if (clampCompareIds(this.selectedIds).length > 0) {
          this.pickerSyncKey += 1;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.categories = [];
        this.cdr.detectChanges();
      }
    });

    this.loadSub?.unsubscribe();
    this.loadSub = this.blogData.getVehiclesState().subscribe((state) => {
      this.loadState = state;
      if (state.status === 'success') {
        this.catalog = state.data;
        const pending =
          clampCompareIds(this.selectedIds).length > 0
            ? clampCompareIds(this.selectedIds)
            : this.compareState.currentSelectedIds;
        this.applyIdSelection(pending);
      }
      this.updateSEOMetadata();
      this.cdr.detectChanges();
    });
  }

  private applyIdSelection(ids: string[]): void {
    const clamped = clampCompareIds(ids);
    const nextIds: Array<string | null> = [null, null];
    const nextVehicles: Array<CarSpec | null> = [null, null];
    const nextBrands: Array<string | null> = [null, null];
    const nextModels: Array<string | null> = [null, null];
    const notices: Array<string | null> = [null, null];

    clamped.forEach((id, index) => {
      if (index >= this.maxSlots) return;
      const found = this.catalog.find((c) => c.id === id) || null;
      nextIds[index] = id;
      if (found) {
        const hydrated = hydrateCompareSlot(found as unknown as Record<string, unknown>);
        nextVehicles[index] = found;
        nextBrands[index] = hydrated.brandId;
        nextModels[index] = hydrated.modelName;
        nextIds[index] = hydrated.variantId || id;
      } else if (this.catalog.length > 0) {
        // Catalog loaded but vehicle gone / unpublished.
        notices[index] = 'This vehicle is no longer available. Choose another EV.';
        nextIds[index] = null;
      } else {
        // Catalog not ready yet — keep id for later resolve.
        nextIds[index] = id;
      }
    });

    this.selectedIds = nextIds;
    this.selectedVehicles = nextVehicles;
    this.brandIds = nextBrands;
    this.modelNames = nextModels;
    this.removedNotices = notices;
    this.pickerSyncKey += 1;
    this.rebuildSections();
    this.syncTrayFromSelection();
    this.maybeTrackCompare();
    this.updateSEOMetadata();
    this.cdr.detectChanges();
  }

  private afterSelectionChange(): void {
    this.rebuildSections();
    this.syncTrayFromSelection();
    this.syncUrl(clampCompareIds(this.selectedIds), true);
    this.maybeTrackCompare();
    this.updateSEOMetadata();
    this.cdr.detectChanges();
  }

  private rebuildSections(): void {
    const vehicles = this.selectedVehicles.filter(Boolean) as CarSpec[];
    if (vehicles.length < 2) {
      this.sections = [];
      return;
    }
    this.sections = buildCompareSections(vehicles);
  }

  private syncTrayFromSelection(): void {
    this.compareState.setVehicles(clampCompareIds(this.selectedIds));
  }

  private syncUrl(ids: string[], replaceUrl: boolean): void {
    const queryParams = ids.length > 0 ? { ids: ids.join(',') } : {};
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl
    });
  }

  private maybeTrackCompare(): void {
    const ids = clampCompareIds(this.selectedIds);
    if (ids.length < 2) return;
    const key = ids.join(',');
    if (key === this.trackedCompareKey) return;
    this.trackedCompareKey = key;
    try {
      this.analytics.trackVehicleCompare(ids);
    } catch {
      // Analytics must never break Compare.
    }
  }

  private updateSEOMetadata(): void {
    const active = this.selectedVehicles.filter(Boolean) as CarSpec[];
    const schemas: any[] = [
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '' },
        { name: 'Compare', url: '/compare' }
      ])
    ];

    if (active.length >= 2) {
      const names = active.map((c) => c.parentModel || c.name);
      const titleText = `Compare ${names.join(' vs ')}: Price, Specs, Range`;
      const descText = `Side-by-side comparison of ${names.join(' and ')}. Compare price, battery, range, charging, safety, and key buying specs on EVCorn.`;
      const ids = clampCompareIds(active.map((c) => c.id || ''));
      this.seoService.updateSeo({
        title: titleText,
        description: descText,
        url: `https://evcorn.com/compare?${buildCompareQueryString(ids)}`
      });
      for (const car of active) {
        schemas.push(
          this.schemaService.buildProduct({
            name: car.name,
            brand: car.categoryId,
            description: `Explore specifications and pricing for the ${car.name}.`,
            price: car.price,
            batteryCapacity: car.batteryCapacity,
            range: car.range
          })
        );
      }
    } else {
      this.seoService.updateSeo({
        title: 'Compare Electric Vehicles (EVs) - Specs, Price, Range',
        description:
          'Compare electric cars in India side-by-side. Compare battery capacity, claimed range, charging speed, dimensions, and prices to choose the right EV.',
        url: 'https://evcorn.com/compare'
      });
      schemas.push(
        this.schemaService.buildCollectionPage(
          'Compare Electric Vehicles',
          'Compare electric car specifications side-by-side.'
        )
      );
    }

    this.schemaService.setSchema(schemas);
  }

  private slugify(text: string): string {
    return (text || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
