import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, ReplaySubject, combineLatest, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ArticleBlock } from '../models/blocks.model';
import { getApiBaseUrl } from '../core/http/api-base-url';
import { AsyncState, isEmptyValue } from '../core/async-state/async-state';
import { classifyHttpError } from '../core/http/app-http-error';
import { AuthService } from './auth.service';

export interface Category {
  id: string; // e.g. 'tesla'
  name: string; // e.g. 'Tesla'
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  countryOrigin?: string;
}

export interface Pricing {
  exShowroomPriceINR: number;
  priceText: string;
  onRoadPriceEstINR?: number;
  subsidyEligible?: boolean;
}

export interface Battery {
  capacityKWh: number;
  capacityText: string;
  chemistry?: 'LFP' | 'NMC' | 'Sodium-Ion' | 'Solid-State' | 'Unknown';
  voltageArchitecture?: number;
}

export interface Charging {
  acChargingKW?: number;
  dcFastChargingKW?: number;
  acChargingText?: string;
  dcChargingText?: string;
  portType?: string;
}

export interface Performance {
  claimedRangeKM: number;
  rangeText: string;
  maxPowerBHP?: number;
  maxTorqueNM?: number;
  acceleration0to100Sec?: number;
  topSpeedKMH?: number;
  drivetrain?: 'FWD' | 'RWD' | 'AWD' | 'FWD/AWD' | 'N/A';
}

export interface Dimensions {
  lengthMM?: number;
  widthMM?: number;
  heightMM?: number;
  dimensionsText?: string;
  groundClearanceMM?: number;
  groundClearanceText?: string;
  wheelbaseMM?: number;
  kerbWeightKG?: number;
  grossWeightKG?: number;
  bootSpaceLiters?: number;
  frunkSpaceLiters?: number;
  bootFrunkText?: string;
  seatingCapacity?: number;
  seatingText?: string;
  tyreSize?: string;
}

export interface Media {
  mainImage?: string;
  gallery?: string[];
  cloudinaryMainImage?: { url: string; public_id: string };
  cloudinaryImages?: Array<{ url: string; public_id: string }>;
}

export interface Safety {
  ncapRating?: number;
  safetyRatingText?: string;
  ncapTestingBody?: string;
  airbagsCount?: number;
  hasADAS?: boolean;
}

export interface SEO {
  metaTitle?: string;
  metaDescription?: string;
}

export interface VehicleVariant {
  id: string;
  variantId: string;
  variantSlug: string;
  variantName: string;
  modelId: string;
  modelSlug: string;
  brandId: string;
  brandSlug: string;
  pricing: Pricing;
  battery: Battery;
  charging: Charging;
  performance: Performance;
  dimensions: Dimensions;
  media: Media;
  safety: Safety;
}

export interface VehicleModel {
  id: string;
  modelId: string;
  modelSlug: string;
  modelName: string;
  brandId: string;
  brandSlug: string;
  variants: VehicleVariant[];
}

export interface Article {
  id?: string;
  slug?: string;
  title: string;
  description?: string;
  categoryId?: string;
  imageUrl?: string;
  paragraphs: string[];
  blocks?: ArticleBlock[]; // NEW dynamic blocks array
  active: boolean;
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  author?:
    | {
        name?: string;
        role?: string;
        bio?: string;
        imageUrl?: string;
        socialLinks?: { twitter?: string; linkedin?: string };
      }
    | string;
  seo?: SEO;
  relationships?: {
    /** Schema / DTO SSOT (Phase 7.3) */
    relatedArticleIds?: string[];
    relatedVehicleIds?: string[];
    relatedBrandIds?: string[];
    /** @deprecated Historical short names — accepted by entity-normalize */
    relatedArticles?: string[];
    relatedVehicles?: string[];
    relatedBrands?: string[];
  };
}

export interface CarSpec {
  id?: string; // Custom string identifier, e.g. 'tesla-model-3'
  name: string;
  categoryId: string;
  brandSlug?: string;
  modelId?: string;
  modelSlug?: string;
  variantId?: string;
  variantSlug?: string;
  parentModel?: string; // e.g. 'Nexon EV'
  variantName?: string; // e.g. 'Empowered+ LR'
  imageUrl?: string; // e.g. base64 or Cloudinary URL
  galleryImages?: string[];
  price: string;
  seating: string;
  dimensions: string; // Length x Width x Height
  groundClearance: string;
  batteryCapacity: string;
  acCharging?: string; // e.g. '11 kW'
  dcCharging?: string; // e.g. '150 kW'
  range?: string; // e.g. '526 km'
  tyreSize: string;
  bootFrunkSpace: string;
  bhpTorque: string;
  drivetrain: string;
  safetyRating: string;
  keyHighlights?: string;
  imageBorrowed?: boolean;
  colour?: string;
  weight?: string;
  screen?: string;
  audio?: string;
  connectivity?: string;
  adasLevel?: string;
  airbags?: string;
  bodyStyle?: string;
  wheelbase?: string;
  kerbWeight?: string;
  grossWeight?: string;
  acceleration?: string;
  maxPower?: string;
  torque?: string;

  // Temporary Dual-Model Compatibility Layer (Deprecated - To be removed after consumer migration)
  pricing?: Pricing;
  battery?: Battery;
  charging?: Charging;
  performance?: Performance;
  dimensionsObj?: Dimensions;
  media?: Media;
  safety?: Safety;
  seo?: SEO;
  status?: string;
  lifecycleStatus?: string;
  launchDate?: string;
  isLaunchDateOverride?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BlogDataService {
  private readonly apiUrl = getApiBaseUrl();

  // Caches for read-heavy static data
  private categoriesCache$: Observable<Category[]> | null = null;
  private articlesLightCache$: Observable<Partial<Article>[]> | null = null;
  private vehiclesLightCache$: Observable<Pick<CarSpec, 'id' | 'name' | 'categoryId' | 'parentModel'>[]> | null = null;

  // Tracks whether the underlying network call for each cache has settled
  // (succeeded or failed) at least once, so AsyncState-aware consumers
  // (getCategoriesState()/getVehiclesState()) can tell "not loaded yet" apart
  // from "network confirmed this is genuinely empty" - the ambiguity that
  // previously required a 20s guess-and-wait timer in vehicle-detail.ts.
  private readonly categoriesSettled$ = new BehaviorSubject<boolean>(false);
  private readonly allVehiclesSettled$ = new BehaviorSubject<boolean>(false);
  private readonly vehiclesLightSettled$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Retry-on-transient-failure and the "backend waking up" signal are now
   * handled once, centrally, by httpErrorInterceptor + NetworkStatusService
   * for every HTTP call in the app - not just these 6 methods. Nothing to
   * do here anymore beyond making the underlying http.get() call.
   */

  /**
   * Upload single image file to Cloudinary via POST /api/upload
   */
  uploadImage(file: File): Observable<{ url: string; public_id: string; width: number; height: number; format: string; original_filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; public_id: string; width: number; height: number; format: string; original_filename: string }>(
      `${this.apiUrl}/upload`,
      formData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Delete single image from Cloudinary via POST /api/upload/delete
   */
  deleteImage(urlOrPublicId: string): Observable<{ success: boolean; result?: string }> {
    return this.http.post<{ success: boolean; result?: string }>(
      `${this.apiUrl}/upload/delete`,
      { public_id: urlOrPublicId },
      { headers: this.getHeaders() }
    );
  }

  /** Admin mutations use Bearer JWT from AuthService — never a hardcoded password. */
  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  // ─── TTL-aware localStorage Cache (Pillar V) ──────────────────────────────
  // Stores { data, ts } envelope; evicts entries older than TTL on read.
  private readonly CACHE_TTL: Record<string, number> = {
    categories:    60 * 60 * 1000,  // 60 min
    allVehicles:    5 * 60 * 1000,  //  5 min
    vehiclesLight:  5 * 60 * 1000,  //  5 min
    articles:       3 * 60 * 1000,  //  3 min
    articlesLight:  3 * 60 * 1000,  //  3 min
  };

  private loadCache(key: string): any {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const envelope = JSON.parse(raw);
      // Support both plain data (legacy) and { data, ts } envelopes
      if (!envelope || typeof envelope !== 'object' || !('ts' in envelope)) {
        // Legacy plain entry — evict and force fresh fetch
        localStorage.removeItem(key);
        return null;
      }
      const ttlMs = this.CACHE_TTL[key] ?? (5 * 60 * 1000);
      if (Date.now() - envelope.ts > ttlMs) {
        localStorage.removeItem(key);
        return null;  // Stale — force fresh fetch
      }
      return envelope.data;
    } catch {
      return null;
    }
  }

  private saveCache(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch {
      // Quota exceeded or private mode — silently skip
    }
  }

  // 1. Categories / Brands API (Now fully dynamic from database with shareReplay caching)
  getCategories(): Observable<Category[]> {
    if (!this.categoriesCache$) {
      const cached = this.loadCache('categories') || [];
      const subject = new BehaviorSubject<Category[]>(cached);
      
      this.http.get<Category[]>(`${this.apiUrl}/categories`).subscribe({
        next: (data) => {
          this.saveCache('categories', data);
          subject.next(data);
          // Settled AFTER the cache emits so AsyncState consumers never see
          // a transient (empty, settled) race that looks like "confirmed empty".
          this.categoriesSettled$.next(true);
        },
        error: (err) => {
          this.categoriesSettled$.next(true);
          if (cached.length === 0) subject.error(err);
        }
      });
      
      this.categoriesCache$ = subject.asObservable();
    }
    return this.categoriesCache$;
  }

  addCategory(catData: { id: string; name: string }): Observable<Category> {
    this.categoriesCache$ = null;
    this.categoriesSettled$.next(false);
    return this.http.post<Category>(`${this.apiUrl}/categories`, catData, { headers: this.getHeaders() });
  }

  deleteCategory(id: string): Observable<any> {
    this.categoriesCache$ = null;
    this.categoriesSettled$.next(false);
    return this.http.delete(`${this.apiUrl}/categories/${id}`, { headers: this.getHeaders() });
  }

  private articlesCache$: Observable<Article[]> | null = null;
  private articleByIdCache = new Map<string, Observable<Article>>();

  // 2. Articles API Calls
  // Seed from localStorage only when present. After clearArticleCache(), do not
  // emit [] / stale rows before HTTP — that left Manage Published Articles on
  // the old title until a full page reload.
  getArticles(): Observable<Article[]> {
    if (!this.articlesCache$) {
      const cached = this.loadCache('articles');
      const subject = new ReplaySubject<Article[]>(1);

      if (Array.isArray(cached)) {
        subject.next(cached);
      }

      this.http.get<Article[]>(`${this.apiUrl}/articles`).subscribe({
        next: (data) => {
          this.saveCache('articles', data);
          subject.next(data);
        },
        error: (err) => {
          if (!Array.isArray(cached)) subject.error(err);
        }
      });

      this.articlesCache$ = subject.asObservable();
    }
    return this.articlesCache$;
  }

  // Lightweight list — overview cards only (no heavy body content) for articles list page
  getArticlesLight(): Observable<Partial<Article>[]> {
    if (!this.articlesLightCache$) {
      const cached = this.loadCache('articlesLight');
      const subject = new ReplaySubject<Partial<Article>[]>(1);

      if (Array.isArray(cached)) {
        subject.next(cached);
      }

      this.http.get<Partial<Article>[]>(`${this.apiUrl}/articles?light=true`).subscribe({
        next: (data) => {
          this.saveCache('articlesLight', data);
          subject.next(data);
        },
        error: (err) => {
          if (!Array.isArray(cached)) subject.error(err);
        }
      });

      this.articlesLightCache$ = subject.asObservable();
    }
    return this.articlesLightCache$;
  }

  getArticleById(id: string): Observable<Article> {
    if (!this.articleByIdCache.has(id)) {
      const cachedKey = `article_${id}`;
      const cached = this.loadCache(cachedKey);
      const subject = new BehaviorSubject<Article | null>(cached);

      this.http.get<Article>(`${this.apiUrl}/articles/${id}`).subscribe({
        next: (data) => {
          this.saveCache(cachedKey, data);
          subject.next(data);
        },
        error: (err) => {
          if (!cached) subject.error(err);
        }
      });

      this.articleByIdCache.set(id, subject.asObservable().pipe(
        map(art => art!)
      ));
    }
    return this.articleByIdCache.get(id)!;
  }

  /** Drop in-memory + localStorage article lists (and optional single-article entry). */
  clearArticleCache(id?: string): void {
    this.articlesCache$ = null;
    this.articlesLightCache$ = null;
    if (id) {
      this.articleByIdCache.delete(id);
    } else {
      this.articleByIdCache.clear();
    }
    try {
      localStorage.removeItem('articles');
      localStorage.removeItem('articlesLight');
      if (id) {
        localStorage.removeItem(`article_${id}`);
      }
    } catch {
      // private mode / quota — ignore
    }
  }

  addArticle(articleData: Article): Observable<Article> {
    this.clearArticleCache();
    return this.http.post<Article>(`${this.apiUrl}/articles`, articleData, { headers: this.getHeaders() });
  }

  updateArticle(id: string, articleData: Article): Observable<Article> {
    this.clearArticleCache(id);
    return this.http.put<Article>(`${this.apiUrl}/articles/${id}`, articleData, { headers: this.getHeaders() });
  }

  deleteArticle(id: string): Observable<any> {
    this.clearArticleCache(id);
    return this.http.delete(`${this.apiUrl}/articles/${id}`, { headers: this.getHeaders() });
  }

  private allVehiclesCache$: Observable<CarSpec[]> | null = null;
  
  getVehicles(): Observable<CarSpec[]> {
    if (!this.allVehiclesCache$) {
      const cached = this.loadCache('allVehicles') || [];
      const subject = new BehaviorSubject<CarSpec[]>(cached);

      this.http.get<CarSpec[]>(`${this.apiUrl}/vehicles?status=Launched`).pipe(
        map(vehicles => {
          const enriched = vehicles.map(v => this.enrichVehicle(v));
          return this.applyImageFallback(enriched);
        })
      ).subscribe({
        next: (data) => {
          this.saveCache('allVehicles', data);
          subject.next(data);
          // Settled AFTER the cache emits — see getCategories() comment.
          this.allVehiclesSettled$.next(true);
        },
        error: (err) => {
          this.allVehiclesSettled$.next(true);
          if (cached.length === 0) subject.error(err);
        }
      });

      this.allVehiclesCache$ = subject.asObservable();
    }
    return this.allVehiclesCache$;
  }

  /**
   * AsyncState-aware version of getCategories() for consumers that need to
   * distinguish "not loaded yet" from "network confirmed empty" without a
   * timer (see NetworkStatusService/AsyncState docs). Purely additive -
   * getCategories() itself is unchanged for all existing consumers.
   */
  getCategoriesState(): Observable<AsyncState<Category[]>> {
    return this.toCachedAsyncState(this.getCategories(), this.categoriesSettled$);
  }

  /** AsyncState-aware version of getVehicles() - see getCategoriesState(). */
  getVehiclesState(): Observable<AsyncState<CarSpec[]>> {
    return this.toCachedAsyncState(this.getVehicles(), this.allVehiclesSettled$);
  }

  /**
   * AsyncState-aware light catalog (picker / browse index). Prefer this over
   * getVehiclesState() when full nested specs are not needed — Phase 5.3
   * Compare uses light for pickers and getVehicleById for selected slots.
   */
  getVehiclesLightState(): Observable<AsyncState<Pick<CarSpec, 'id' | 'name' | 'categoryId' | 'parentModel' | 'variantName' | 'imageUrl' | 'bodyStyle'>[]>> {
    return this.toCachedAsyncState(this.getVehiclesLight() as Observable<any[]>, this.vehiclesLightSettled$);
  }

  private toCachedAsyncState<T>(
    cache$: Observable<T[]>,
    settled$: Observable<boolean>
  ): Observable<AsyncState<T[]>> {
    return combineLatest([cache$, settled$]).pipe(
      map(([data, settled]): AsyncState<T[]> => {
        if (!settled && isEmptyValue(data)) return { status: 'loading' };
        return isEmptyValue(data) ? { status: 'empty' } : { status: 'success', data };
      }),
      catchError((err): Observable<AsyncState<T[]>> => {
        const classified = classifyHttpError(err, typeof navigator === 'undefined' ? true : navigator.onLine);
        if (classified.category === 'offline') return of({ status: 'offline' });
        if (classified.category === 'timeout') return of({ status: 'timeout' });
        return of({ status: 'error', error: classified });
      })
    );
  }

  // Lightweight index — returns only id, name, categoryId for instant dropdown population
  getVehiclesLight(): Observable<Pick<CarSpec, 'id' | 'name' | 'categoryId' | 'parentModel' | 'variantName' | 'imageUrl' | 'bodyStyle'>[]> {
    if (!this.vehiclesLightCache$) {
      const cached = this.loadCache('vehiclesLight') || [];
      const subject = new BehaviorSubject<any[]>(cached);

      this.http.get<any[]>(`${this.apiUrl}/vehicles?light=true&status=Launched`).pipe(
        map(vehicles => {
          const enriched = vehicles.map(v => this.enrichVehicle(v));
          return this.applyImageFallback(enriched);
        })
      ).subscribe({
        next: (data) => {
          this.saveCache('vehiclesLight', data);
          subject.next(data);
          this.vehiclesLightSettled$.next(true);
        },
        error: (err) => {
          this.vehiclesLightSettled$.next(true);
          if (cached.length === 0) subject.error(err);
        }
      });

      this.vehiclesLightCache$ = subject.asObservable();
    }
    return this.vehiclesLightCache$;
  }

  private applyImageFallback(vehicles: any[]): any[] {
    const modelImages: Record<string, string> = {};
    const modelGalleries: Record<string, string[]> = {};
    const modelDimensions: Record<string, string> = {};
    const modelWheelbase: Record<string, string> = {};
    const modelGroundClearance: Record<string, string> = {};
    const modelBodyStyle: Record<string, string> = {};
    const modelBootFrunkSpace: Record<string, string> = {};

    for (const v of vehicles) {
      if (v.parentModel) {
        if (v.imageUrl && !modelImages[v.parentModel]) modelImages[v.parentModel] = v.imageUrl;
        if (v.galleryImages && v.galleryImages.length > 0 && !modelGalleries[v.parentModel]) modelGalleries[v.parentModel] = v.galleryImages;
        if (v.dimensions && v.dimensions !== 'N/A' && !modelDimensions[v.parentModel]) modelDimensions[v.parentModel] = v.dimensions;
        if (v.wheelbase && v.wheelbase !== 'N/A' && !modelWheelbase[v.parentModel]) modelWheelbase[v.parentModel] = v.wheelbase;
        if (v.groundClearance && v.groundClearance !== 'N/A' && !modelGroundClearance[v.parentModel]) modelGroundClearance[v.parentModel] = v.groundClearance;
        if (v.bodyStyle && v.bodyStyle !== 'N/A' && !modelBodyStyle[v.parentModel]) modelBodyStyle[v.parentModel] = v.bodyStyle;
        if (v.bootFrunkSpace && v.bootFrunkSpace !== 'N/A' && !modelBootFrunkSpace[v.parentModel]) modelBootFrunkSpace[v.parentModel] = v.bootFrunkSpace;
      }
    }
    
    for (const v of vehicles) {
      if (v.parentModel) {
        if (!v.imageUrl && modelImages[v.parentModel]) {
          v.imageUrl = modelImages[v.parentModel];
          v.imageBorrowed = true;
        }
        if ((!v.galleryImages || v.galleryImages.length === 0) && modelGalleries[v.parentModel]) {
          v.galleryImages = modelGalleries[v.parentModel];
        }
        if ((!v.dimensions || v.dimensions === 'N/A') && modelDimensions[v.parentModel]) v.dimensions = modelDimensions[v.parentModel];
        if ((!v.wheelbase || v.wheelbase === 'N/A') && modelWheelbase[v.parentModel]) v.wheelbase = modelWheelbase[v.parentModel];
        if ((!v.groundClearance || v.groundClearance === 'N/A') && modelGroundClearance[v.parentModel]) v.groundClearance = modelGroundClearance[v.parentModel];
        if ((!v.bodyStyle || v.bodyStyle === 'N/A') && modelBodyStyle[v.parentModel]) v.bodyStyle = modelBodyStyle[v.parentModel];
        if ((!v.bootFrunkSpace || v.bootFrunkSpace === 'N/A') && modelBootFrunkSpace[v.parentModel]) v.bootFrunkSpace = modelBootFrunkSpace[v.parentModel];
      }
    }
    return vehicles;
  }

  // Parse custom name delimiter since backend drops parentModel/variantName fields
  private enrichVehicle(v: any): any {
    if (v.name && v.name.includes('::')) {
      const parts = v.name.split('::');
      v.parentModel = parts[0];
      v.variantName = parts[1];
      v.name = `${parts[0]} ${parts[1]}`;
    } else {
      v.parentModel = v.parentModel || v.name;
      v.variantName = v.variantName || v.name;
    }
    
    // Parse AC/DC charging, ImageUrl, Range, and KeyHighlights hidden in batteryCapacity
    if (v.batteryCapacity && v.batteryCapacity.includes('||')) {
      const capParts = v.batteryCapacity.split('||');
      v.batteryCapacity = capParts[0] !== 'N/A' ? capParts[0] : '';
      v.acCharging = capParts[1] !== 'N/A' ? capParts[1] : undefined;
      v.dcCharging = capParts[2] !== 'N/A' ? capParts[2] : undefined;
      if (capParts.length > 3 && capParts[3] !== 'N/A') {
        const rawImg = capParts[3];
        if (rawImg.includes(';;;')) {
          v.galleryImages = rawImg.split(';;;').filter((img: string) => img && img !== 'N/A');
          v.imageUrl = v.galleryImages[0] || '';
        } else {
          v.imageUrl = rawImg;
          v.galleryImages = [rawImg];
        }
      }
      if (capParts.length > 4 && capParts[4] !== 'N/A') {
        v.range = capParts[4];
      }
      if (capParts.length > 5 && capParts[5] !== 'N/A') {
        v.keyHighlights = capParts[5];
      }
      if (capParts.length > 6 && capParts[6] !== 'N/A') {
        v.bodyStyle = capParts[6];
      }
    }
    // Keep nested text fields in sync so Compare never prefers the packed raw string.
    if (v.battery && typeof v.battery === 'object') {
      if (v.batteryCapacity) v.battery.capacityText = v.batteryCapacity;
      else if (typeof v.battery.capacityText === 'string' && v.battery.capacityText.includes('||')) {
        v.battery.capacityText = v.battery.capacityText.split('||')[0] !== 'N/A'
          ? v.battery.capacityText.split('||')[0]
          : '';
      }
    }
    if (v.charging && typeof v.charging === 'object') {
      if (v.acCharging) v.charging.acChargingText = v.acCharging;
      if (v.dcCharging) v.charging.dcChargingText = v.dcCharging;
    }
    if (v.performance && typeof v.performance === 'object' && v.range) {
      v.performance.rangeText = v.range;
    }
    
    // Parse dimensions and wheelbase
    if (v.dimensions && v.dimensions.includes('||')) {
      const dimParts = v.dimensions.split('||');
      v.dimensions = dimParts[0] !== 'N/A' ? dimParts[0] : '';
      if (dimParts.length > 1 && dimParts[1] !== 'N/A') v.wheelbase = dimParts[1];
    }

    // Parse Colour, Weight (Kerb/Gross), and Entertainment fields hidden in seating
    if (v.seating && v.seating.includes('||')) {
      const seatParts = v.seating.split('||');
      v.seating = seatParts[0] !== 'N/A' ? seatParts[0] : '';
      if (seatParts.length > 1 && seatParts[1] !== 'N/A') v.colour = seatParts[1];
      if (seatParts.length > 2 && seatParts[2] !== 'N/A') {
        v.weight = seatParts[2];
        if (v.weight.includes('~')) {
          const wParts = v.weight.split('~');
          v.kerbWeight = wParts[0] !== 'N/A' ? wParts[0] : undefined;
          v.grossWeight = wParts[1] !== 'N/A' ? wParts[1] : undefined;
        } else {
          v.kerbWeight = v.weight;
        }
      }
      if (seatParts.length > 3 && seatParts[3] !== 'N/A') v.screen = seatParts[3];
      if (seatParts.length > 4 && seatParts[4] !== 'N/A') v.audio = seatParts[4];
      if (seatParts.length > 5 && seatParts[5] !== 'N/A') v.connectivity = seatParts[5];
    }

    if (v.dimensionsObj && typeof v.dimensionsObj === 'object') {
      if (!v.kerbWeight && v.dimensionsObj.kerbWeightKG) v.kerbWeight = `${v.dimensionsObj.kerbWeightKG} kg`;
      if (!v.grossWeight && v.dimensionsObj.grossWeightKG) v.grossWeight = `${v.dimensionsObj.grossWeightKG} kg`;
    }
    
    // Parse ADAS and Airbags hidden in safetyRating
    if (v.safetyRating && v.safetyRating.includes('||')) {
      const safeParts = v.safetyRating.split('||');
      v.safetyRating = safeParts[0] !== 'N/A' ? safeParts[0] : '';
      if (safeParts.length > 1 && safeParts[1] !== 'N/A') v.adasLevel = safeParts[1];
      if (safeParts.length > 2 && safeParts[2] !== 'N/A') v.airbags = safeParts[2];
    }

    // Parse Acceleration, Max Power, Torque hidden in bhpTorque
    if (v.bhpTorque) {
      if (v.bhpTorque.includes('||')) {
        const perfParts = v.bhpTorque.split('||');
        if (perfParts[0] !== 'N/A') v.acceleration = perfParts[0];
        if (perfParts.length > 1 && perfParts[1] !== 'N/A') v.maxPower = perfParts[1];
        if (perfParts.length > 2 && perfParts[2] !== 'N/A') v.torque = perfParts[2];
      } else if (v.bhpTorque.includes('/')) {
        const parts = v.bhpTorque.split('/');
        v.maxPower = parts[0].trim();
        v.torque = parts[1].trim();
      } else {
        v.maxPower = v.bhpTorque;
      }
    }
    
    return v;
  }

  /**
   * Scoped recommendations from backend RecommendationService.
   * Cap/scope enforced server-side — never a full-catalog client scan.
   */
  getRecommendations(params: {
    vehicleId?: string;
    articleId?: string;
    categoryId?: string;
  }): Observable<{ recommendedVehicles: any[]; recommendedArticles: any[] }> {
    const query: string[] = [];
    if (params.vehicleId) query.push(`vehicleId=${encodeURIComponent(params.vehicleId)}`);
    if (params.articleId) query.push(`articleId=${encodeURIComponent(params.articleId)}`);
    if (params.categoryId) query.push(`categoryId=${encodeURIComponent(params.categoryId)}`);
    const qs = query.length ? `?${query.join('&')}` : '';
    return this.http.get<{ success?: boolean; data?: any }>(`${this.apiUrl}/search/recommendations${qs}`).pipe(
      map((res) => ({
        recommendedVehicles: res?.data?.recommendedVehicles || [],
        recommendedArticles: res?.data?.recommendedArticles || []
      })),
      catchError(() => of({ recommendedVehicles: [], recommendedArticles: [] }))
    );
  }

  // On-demand single car detail — fetches full specs for one car directly from backend
  getVehicleById(id: string): Observable<CarSpec> {
    return this.http.get<CarSpec>(`${this.apiUrl}/vehicles/${id}`).pipe(
      map(vehicle => this.enrichVehicle(vehicle)),
      catchError(() => {
        // Fallback to cache/list if direct lookup fails
        return this.getVehicles().pipe(
          map(vehicles => {
            const vehicle = vehicles.find(v => v.id === id);
            if (!vehicle) {
              throw new Error('Vehicle not found');
            }
            return vehicle;
          })
        );
      })
    );
  }

  saveVehicle(vehicleData: CarSpec): Observable<CarSpec> {
    return this.http.post<CarSpec>(`${this.apiUrl}/vehicles`, vehicleData, { headers: this.getHeaders() });
  }

  deleteVehicle(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/vehicles/${id}`, { headers: this.getHeaders() });
  }

  clearVehicleCache() {
    this.allVehiclesCache$ = null;
    this.vehiclesLightCache$ = null;
    this.allVehiclesSettled$.next(false);
    this.vehiclesLightSettled$.next(false);
    try {
      localStorage.removeItem('allVehicles');
      localStorage.removeItem('vehiclesLight');
    } catch {}
  }

  clearAllCaches() {
    this.allVehiclesCache$ = null;
    this.vehiclesLightCache$ = null;
    this.categoriesCache$ = null;
    this.allVehiclesSettled$.next(false);
    this.vehiclesLightSettled$.next(false);
    this.categoriesSettled$.next(false);
    this.clearArticleCache();
    try {
      ['allVehicles', 'vehiclesLight', 'categories'].forEach(k =>
        localStorage.removeItem(k)
      );
    } catch {}
  }
}
