# Phase 5.3 — Performance, Reliability & Scalability

> **Status:** COMPLETE (shipped to production)  
> **Date:** 2026-07-30  
> **Scope:** Proven bottlenecks only. No UI/UX redesign. Phases 1–5.1 locked.  
> **Production:** https://evcorn.com · API https://evcorn-backend.onrender.com/api

Raw measurement dumps live under gitignored `artifacts/` (`phase53-*.json`). This doc is the durable summary.

---

## Executive verdict

Phase 5.3 delivers measurable File-DB + payload + Compare load-path fixes. At **10k vehicles / 4k articles**, paginated lists and search stay sub-millisecond–warm; full unpaginated light catalogs remain large by product design (client index) but are **~42% smaller** after light DTOs. No visible UI redesign.

---

## What shipped

1. **In-memory File-DB cache** — parse once; invalidate on write (`backend/config/database.js`).
2. **File-DB query matcher** (`backend/utils/fileDbQuery.js`) — `$and`/`$or`/`$exists`/`$gte`/`$lte`/RegExp + projection + filtered `count`.
3. **Light DTOs** — vehicles + articles list/search omit empty nested defaults / body fields.
4. **Search unified caps** — 50 vehicles / 30 articles.
5. **Compare** — light catalog for pickers; `getVehicleById` only for ≤2 selected slots; `lastDetailFetchKey` dedupes by-id when light AsyncState re-emits.
6. **Browse** — removed dead full-catalog `loadTopRangeEvs()` helper (top-range already from light index).
7. **Harness scripts** — `perf:scale`, `perf:requests`, `perf:mongo` (honest skip if File-DB / Atlas unreachable).

---

## Measured highlights (File-DB local)

| Scale | Finding |
| :--- | :--- |
| Seed warm | Light vehicles ~2 ms / ~4 KB; paginated ~3 ms |
| 10k vehicles light full list | **5.51 MB**, warm **~77 ms** (~42% smaller vs pre-light DTO) |
| 10k page=1&limit=20 | **~12 KB**, warm **~0.8 ms** |
| Memory (2k→10k) | RSS rises with catalog size; leakSignal=**stable** |
| Compare deeplink | `light=1` + `byId=2` (no full nested catalog) |
| Bundle | largest **283 KB** / total **829 KB** — within budgets |

Live Atlas was unreachable in the validation environment (`ENOTFOUND`); shared service/DTO path is the same when Mongo connects — re-run `npm run perf:mongo` when Atlas DNS resolves.

---

## Deferred (intentional)

- Server-driven Browse/Home pagination (API ready; FE still needs full light client index for filters/quiz).
- Vehicle detail still uses full nested `getVehiclesState()` — next high-value FE cut.
- Redis / multi-instance cache — not claimed; File-DB mem + node-cache are single-process.

---

## Commands

```bash
npm run perf:scale      # temporary 2k/5k/10k, measure, restore seed
npm run perf:requests   # Playwright API GET counts per flow
npm run perf:mongo      # Mongo path validation (fails honestly on File-DB)
```
