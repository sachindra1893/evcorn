# EVCorn Performance Budget (Phase 5)

> **Document Status:** Active Product Performance Budget (Phase 5 Architecture)  
> **Version:** 1.0.0  
> **Parent:** [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md)  
> **Aligns with:** Phase 3 `perf:check` / CI · Phase 4 caching, ETag, preload, load tests · [`PERFORMANCE.md`](./PERFORMANCE.md) · [`PHASE4_PERFORMANCE.md`](./PHASE4_PERFORMANCE.md)

---

## 1. Purpose

Hard ceilings for **new product features**. Budgets are enforced where CI already gates them; the rest are engineering contracts verified in PR review and optional `perf:load`.

**Do not raise CI thresholds silently.** Bundle limit changes require explicit review ([`RELEASE.md`](./RELEASE.md) §4).

---

## 2. Bundle size budget (CI-enforced)

From `scripts/check-bundle-size.mjs` (after `ng build`):

| Metric | Warn | Fail (CI) | Phase 4 observed (approx.) |
| :--- | ---: | ---: | :--- |
| Largest single JS file | 500 KB | **1024 KB** | ~283 KB |
| Total JS under dist | — | **2500 KB** | ~826 KB |

### Feature rules

- New routes **must** use `loadComponent` (already true for `/compare`, `/search`, `/admin`, etc.).
- Prefer **not** adding heavy dependencies; if unavoidable, measure delta with `npm run perf:check`.
- **Max additional cost for a new feature chunk (guideline):** keep the feature’s lazy chunk modest vs peers (existing Compare ~35 KB, Admin ~145 KB raw sizes in [`PERFORMANCE.md`](./PERFORMANCE.md)). Target: **avoid pushing largest file toward the 500 KB warn** without review.
- Do **not** reintroduce `PreloadAllModules`. Selective idle preload after **2.5s** covers `''`, `evs`, `articles`, `search`, `about` only — admin / energy / compare / login stay on-demand ([`PHASE4_PERFORMANCE.md`](./PHASE4_PERFORMANCE.md)).

---

## 3. API response time budget

| Class | Target (warm, single instance) | Notes |
| :--- | :--- | :--- |
| Health / trivial GET | p95 **&lt; 50 ms** local | `/api/health*` |
| Cached list / categories HIT | p95 **&lt; 20 ms** local warm | Phase 4 categories warm ~1 ms; ETag **304 ~2 ms** |
| Light list (`?light=true`) | p95 **&lt; 100 ms** comfortable @100 VU | Cold then warm; use cache fingerprints |
| Search autocomplete / unified | p95 **&lt; 150 ms** warm preferred | TTL **60s**; light projections |
| Recommendations | p95 **&lt; 200 ms** warm preferred | TTL **120s**; scoped queries — **no full-catalog scan** |
| Uncached / cold Mongo | p95 **&lt; 500 ms** goal on staging | File-DB local numbers ≠ Atlas |

### Absolute product rules

- Client GET/HEAD timeout default **20s** — features must complete or fail before that; never design UX that requires longer without `HTTP_TIMEOUT_MS` justification.
- Slow Mongo queries: repository `measureQuery` warns at **100 ms** ([`OBSERVABILITY.md`](./OBSERVABILITY.md)) — new queries should stay under that when indexed.
- Load harness honesty ([`PHASE4_PERFORMANCE.md`](./PHASE4_PERFORMANCE.md)): **100 VU comfortable**, **500 elevated tails**, **1000 VU multi-second p95 on laptop** — do not claim 1k concurrent prod readiness without horizontal scale + Mongo + Redis.

---

## 4. API call budget (per page / interaction)

| Surface | Max primary API calls on first meaningful paint | Guidance |
| :--- | ---: | :--- |
| Home | **≤ 4** distinct list/feed calls | Prefer `shareReplay` + light endpoints; widgets may stagger |
| Browse EVs / Articles | **≤ 3** (list + categories/meta as needed) | Server-side filter/sort/page — no N+1 per card |
| Vehicle / Article detail | **≤ 3** primary + **≤ 1** optional related | Related must be optional / isolated |
| Search page | **≤ 2** per query submit | Debounce autocomplete; use cached autocomplete |
| Compare | **≤ 1** batch or **≤ N** capped vehicles | Cap selection size; no unbounded parallel fan-out |

**Forbidden:** client loops that fetch full catalog to filter in the browser once scale exceeds a few hundred variants.

**Dedup:** keep using RxJS `shareReplay(1)` patterns on shared list getters ([`PERFORMANCE.md`](./PERFORMANCE.md) §3).

---

## 5. Caching expectations

Reuse Phase 4 `backend/utils/cache.js` contracts:

| Namespace | TTL | Feature expectation |
| :--- | ---: | :--- |
| Categories | 3600s | Hit path must not break response contract (existing integration tests) |
| Vehicles / light lists | 300s | Fingerprint query; skip admin & custom `fields=` |
| Articles / light | 180s | Same |
| Singles | 600s | Invalidate on write |
| Search | 60s | Autocomplete + unified |
| Recommendations | 120s | Scoped candidates |

Also:

- Honor **ETag / If-None-Match → 304** for public GETs.
- Do not re-add `?t=${Date.now()}` cache-busting on API URLs.
- Cache set/get failures remain **non-fatal**.
- Writes must continue to **cross-invalidate** vehicles / articles / search / recommendations prefixes.

---

## 6. Lazy loading & images

- Routes: dynamic `import()` only for feature entry.
- Images: Cloudinary `f_auto,q_auto,w_*`; hero LCP **eager + `fetchpriority="high"`**; secondary `loading="lazy"`.
- CLS: preserve aspect-ratio / width-height discipline on cards.
- Lists: `@for (...; track id)` — required for filter-heavy future browse.

---

## 7. Verification commands

```bash
npm run build:frontend
npm run perf:check          # bundle gate → artifacts/perf-bundle-results.json
npm run perf:load           # optional capacity; LOAD_TEST=1 locally only — never in Render
npm run validate:local      # includes perf among Phase 3 gates
```

---

## 8. Related docs

- [`PHASE4_PERFORMANCE.md`](./PHASE4_PERFORMANCE.md) — measured baselines  
- [`PERFORMANCE.md`](./PERFORMANCE.md) — frontend rendering standard  
- [`BACKEND_PERFORMANCE.md`](./BACKEND_PERFORMANCE.md) — backend notes  
- [`RELEASE.md`](./RELEASE.md) — when bundle FAIL blocks merge  
- [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md) — Phase 5 umbrella (**LOCKED**)  
- [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md) — ADR-004 performance budgets  
