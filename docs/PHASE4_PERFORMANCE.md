# Phase 4 — Performance & Scalability (durable summary)

> **Status:** Shipped in commit `a65e867` (local measured baselines).  
> **Full validation report:** `artifacts/PHASE4_PERFORMANCE_REPORT.md` (gitignored local copy)  
> **Budgets / contracts:** [`PERFORMANCE_BUDGET.md`](./PERFORMANCE_BUDGET.md) · [`PERFORMANCE.md`](./PERFORMANCE.md) · [`BACKEND_PERFORMANCE.md`](./BACKEND_PERFORMANCE.md)

This document restores the durable Phase 4 reference linked from product docs. It does **not** redesign Phase 4 — it records what already shipped.

---

## What Phase 4 delivered

| Area | Outcome |
| :--- | :--- |
| In-process API cache | Categories, vehicles/articles lists (fingerprinted), search, recommendations |
| ETag / 304 | Weak SHA-1 ETag middleware; Express default ETag disabled |
| Indexes | Vehicles `{ bodyStyle, status }`, categories `{ name }` (+ migration `005`) |
| FE preload | Selective idle preload (not `PreloadAllModules`) |
| Compression / Cache-Control | Already present; retained and tested |
| Load harness | `npm run perf:load` → 100 / 500 / 1000 VU local File-DB |

---

## Measured local baselines (File-DB, single process)

| Concurrency | P95 | Error rate | Notes |
| ---: | ---: | ---: | :--- |
| 100 | ~88 ms | 0% | Comfortable |
| 500 | ~656 ms | 0% | Elevated tails |
| 1000 | ~3980 ms | 0% | Not a prod capacity claim |

Bundle (approx.): largest JS **~283 KB**, total JS **~826 KB** (CI thresholds unchanged).

---

## Explicit non-claims (still deferred)

- Redis / shared multi-instance cache
- Production 1k concurrent readiness on a single instance
- Atlas Search / `$text` replacing regex search

See Phase 6 ops notes: [`PHASE_6.md`](./PHASE_6.md).
