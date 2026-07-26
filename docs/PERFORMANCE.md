# EVCorn Enterprise Frontend Performance & Rendering Optimization Standard

> **Document Status:** Active Performance Standard (Phase 5 Complete)  
> **Version:** 1.0.0  

---

## 1. Angular Build & Bundle Analysis

| Bundle Type | Initial Size | Transfer Size (Gzip/Brotli) | Optimization Applied |
| :--- | :--- | :--- | :--- |
| **Initial Total JavaScript** | 406.90 kB | **105.24 kB** | Full Tree Shaking & Dead Code Elimination |
| **Main Application Bundle** | 29.07 kB | **6.90 kB** | Angular Standalone Components |
| **Global CSS Bundle** | 26.86 kB | **5.25 kB** | Inlined Font Preloading & Font-display Swap |
| **Admin Panel (Lazy Chunk)** | 144.89 kB | **30.90 kB** | Code Split via `loadComponent` |
| **Home Page (Lazy Chunk)** | 61.62 kB | **13.78 kB** | Lazy Load & Image Pre-transformations |

---

## 2. Route Lazy Loading Matrix

100% of feature routes are lazy-loaded via dynamic ES imports (`loadComponent: () => import(...)`):
- `/about` $\rightarrow$ `AboutComponent` (10.96 kB)
- `/evs` $\rightarrow$ `BrowseEvsComponent` (17.29 kB)
- `/ev/:brandSlug/:modelSlug` $\rightarrow$ `VehicleDetailComponent` (25.53 kB)
- `/articles` $\rightarrow$ `ArticlesComponent` (9.57 kB)
- `/articles/:id` $\rightarrow$ `ArticleDetailComponent` (20.98 kB)
- `/compare` $\rightarrow$ `CompareComponent` (34.50 kB)
- `/admin` $\rightarrow$ `AdminComponent` (144.89 kB)

---

## 3. Network Optimization & Request Deduplication

- **RxJS `shareReplay(1)` Caching:** Deduplicates identical in-flight requests across components for `getCategories()`, `getVehicles()`, `getVehiclesLight()`, `getArticles()`, and `getArticlesLight()`.
- **Cache-Busting Removal:** Removed `?t=${Date.now()}` timestamp parameters from API requests to allow browser HTTP disk caching and ETag revalidation.
- **Lightweight Projections:** List pages consume `/api/vehicles?light=true` and `/api/articles?light=true`, saving ~70% network payload size on mobile devices.

---

## 4. Image Optimization & Core Web Vitals

1. **Cloudinary Dynamic Resizing:**
   All images pass through `getOptimizedImageUrl(url, width)` inserting `w_{width},f_auto,q_auto`.
   - Hero / Gallery Banners: `w_1200`
   - Catalog & Article Feed Cards: `w_600`
   - Search Dropdown & Related Vehicle Thumbs: `w_200` or `w_300`
2. **LCP Optimization:** Hero images feature `decoding="async"`, `fetchpriority="high"`, and `w_1200` width parameters.
3. **CLS Defense:** All catalog image containers enforce strict aspect-ratios (`aspect-ratio: 16/9` or explicit `width`/`height` attributes).
4. **Lazy Loading:** Secondary images feature `loading="lazy"` and `decoding="async"`.

---

## 5. Change Detection & List Rendering Optimization

- **Angular `@for` Track By:** All dynamic lists enforce explicit key tracking (`@for (car of vehicles; track car.id)`), avoiding DOM node destruction on filter re-renders.
- **Pure Utility Helpers:** Image optimization transformations use pure utility functions (`image.utils.ts`) instead of inline template methods, reducing CPU cycles during change detection cycles.

---

## 7. Memory Management & Subscription Teardown Audit

- **Subscription Teardown:** Added explicit `Subscription` lifecycle management (`this.sub.add(...)` and `this.sub.unsubscribe()` in `ngOnDestroy()`) to components listening to long-lived Observables (`ActivatedRoute`, `combineLatest`, `LocationService`).
- **Short-Lived HTTP Subscriptions:** Direct one-shot HTTP calls (`HttpClient.get`, `post`, `delete`) auto-complete upon emission.
- **RxJS `shareReplay(1)` Prevention:** Service streams in `BlogDataService` use `shareReplay(1)` to prevent duplicate subscriber allocations.
- **Timer / Event Cleanup:** All global event listeners (window resize, scroll) use Angular `@HostListener` bindings which automatically unbind on component destruction.

---

## 8. Technical Debt & Future Frontend Optimization Opportunities

1. **Signals Migration:** Future Angular phases can migrate `BehaviorSubject` state in `BlogDataService` to native Angular Signals (`signal()`, `computed()`) for fine-grained reactivity.
2. **Virtual Scrolling (`cdk-virtual-scroll-viewport`):** For catalog grids with > 500 vehicle variants, implementing virtual scrolling will keep DOM nodes constant at ~20 elements.
