# EVCorn Scalability Guidelines (Phase 5)

> **Document Status:** Active Scalability Guidelines (Phase 5 Architecture)  
> **Version:** 1.0.0  
> **Parent:** [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md)  
> **Aligns with:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) target scale · [`RELIABILITY.md`](./RELIABILITY.md) capacity table · [`PHASE4_PERFORMANCE.md`](./PHASE4_PERFORMANCE.md)

---

## 1. Principle

**Features must work from 10 to 10,000 vehicles (and articles) without a product redesign.**

Scaling is achieved by pagination, indexes, projections, caching, and lazy UI — not by rewriting the page when the catalog grows.

Domain reminder: a Vehicle document is a **variant** ([`ARCHITECTURE.md`](./ARCHITECTURE.md)). “10,000 vehicles” means ~10,000 variants, not 10,000 brands.

---

## 2. Catalog scale matrix

| Scale | Vehicles (variants) | What must still work | Engineering expectations |
| :--- | ---: | :--- | :--- |
| **S** | ~10 | All routes, Compare, Search, Related | File-DB CI sufficient; trivial lists OK |
| **M** | ~100 | Same + filters/sort | Server-side filter/sort; light lists; cache hits matter |
| **L** | ~1,000 | Same + recommendations | No full-catalog client download; recommendations capped/scoped (Phase 4); pagination required |
| **XL** | ~10,000 | Same without UX redesign | Hard pagination; field selection; indexes (incl. migration `005` patterns); virtual scroll for huge on-screen grids; Redis before multi-instance cache claims |

Articles follow the same orders of magnitude for list/search behavior.

---

## 3. API & data rules that unlock scale

1. **Server-side pagination** — `page` / `limit`, hard cap **`MAX_LIMIT = 100`** ([`ARCHITECTURE.md`](./ARCHITECTURE.md)).
2. **Server-side filtering & whitelisted sort** — never “download all then filter” in the browser at L/XL.
3. **Light projections** — `?light=true` / search light projections for cards and autocomplete.
4. **Indexed queries** — new filter dimensions need indexes (additive migrations), not collection scans.
5. **Cached fingerprints** — list/search keys via `fingerprintQuery`; invalidate on writes.
6. **Recommendations** — scoped, capped candidates + TTL; **forbidden:** full-catalog scan to score Related EVs.
7. **Lean reads** — repositories continue `.lean()` for read paths.

---

## 4. Frontend rules that unlock scale

| Concern | S–M | L–XL |
| :--- | :--- | :--- |
| Lists | Normal `@for` + trackBy | Paginate; consider `cdk-virtual-scroll` above ~500 **visible** rows ([`PERFORMANCE.md`](./PERFORMANCE.md)) |
| Compare selection | Small N | Hard-cap selected vehicles; never load entire catalog into compare state |
| Search autocomplete | Fine | Keep server cap (8 items today); debounce |
| Home widgets | Few light calls | Stagger optional widgets; isolate failure |
| Images | Cloudinary widths | Same; never full-resolution galleries in lists |

---

## 5. Infrastructure scale (traffic, not just catalog)

From [`RELIABILITY.md`](./RELIABILITY.md) / Phase 4 estimates:

| Traffic shape | Fit |
| :--- | :--- |
| Hundreds DAU | Current single instance + CDN + in-process cache |
| Low thousands DAU | Comfortable with Phase 4 patterns |
| Tens of thousands DAU | Plan **2–N API instances + Redis**, indexes, CDN — still no product redesign |
| Spike ~1k concurrent on one process | Survives with latency collapse locally — needs horizontal scale for real prod claims |

Feature authors must not assume infinite single-node headroom when adding chatty endpoints.

---

## 6. Feature checklist at each scale

Before claiming a feature “scales”:

- [ ] Works against file-DB fixtures in CI (S)
- [ ] Paginated / capped responses (M+)
- [ ] No O(catalog) client memory (L+)
- [ ] New query paths indexed or proven cheap (L+)
- [ ] Optional `perf:load` or staging Mongo spot-check for new hot endpoints (XL / traffic claims)

---

## 7. Related docs

- [`PERFORMANCE_BUDGET.md`](./PERFORMANCE_BUDGET.md)  
- [`PHASE4_PERFORMANCE.md`](./PHASE4_PERFORMANCE.md)  
- [`RELIABILITY.md`](./RELIABILITY.md)  
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
- [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md) — Phase 5 umbrella (**LOCKED**)  
- [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md)  
