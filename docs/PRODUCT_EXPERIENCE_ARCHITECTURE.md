# EVCorn Product Experience Architecture (Phase 5)

> **Document Status:** **LOCKED** — Engineering Standard for all future feature phases  
> **Version:** 1.0.0  
> **Scope:** Documentation only. No product UI, API, or database changes in this phase.  
> **Locked predecessors:** Phase 1 (Reliability), Phase 2 (Observability), Phase 3 (Release Engineering), Phase 4 (Performance) — do not regress.

---

## 1. Purpose

This document is the **umbrella standard** for every future EVCorn product feature (Compare improvements, Search enhancements, Filters, Related EVs, homepage widgets, calculators, etc.).

It does **not** implement those features. It defines the rules they must follow so EVCorn stays:

- Trustworthy (never false or misleading vehicle/article data)
- Resilient (one feature failing must not blank the site)
- Fast (aligned with Phase 3 CI gates and Phase 4 budgets)
- Removable (features can be turned off or deleted without cascading breakage)
- Scalable (10 → 10,000 vehicles/articles without redesign)

**Engineers:** read this first, then the linked detail docs, then complete [`FEATURE_ACCEPTANCE_CHECKLIST.md`](./FEATURE_ACCEPTANCE_CHECKLIST.md) before merge. Standing decisions: [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md).

---

## 2. How this phase relates to locked work

| Phase | What it locked | How Phase 5 uses it |
| :--- | :--- | :--- |
| **1 Reliability** | `AsyncState`, error categories, offline banner, empty ≠ error, retries, waking/cold-start UX, navigation chunk recovery | All new features **must** reuse these patterns — never invent parallel loaders/error UIs |
| **2 Observability** | `x-request-id`, structured logs, diagnostics, Server-Timing, cold_start signals | Failures must remain correlatable; do not strip request IDs or silent-swallow errors |
| **3 Release** | CI jobs (`backend`, `frontend`, `smoke`, `e2e`, `release-report`), `validate:local`, post-deploy validate | No merge without green gates; new features add permanent regressions where needed |
| **4 Performance** | Cache TTLs/fingerprints, ETag/304, selective idle preload, bundle gate (1024 / 2500 KB), load harness | New features must stay inside budgets and prefer cached/`?light=` paths |

Related locked / active docs:

- [`RELIABILITY.md`](./RELIABILITY.md) · [`OBSERVABILITY.md`](./OBSERVABILITY.md)
- [`RELEASE.md`](./RELEASE.md) · [`CICD.md`](./CICD.md) · [`TESTING.md`](./TESTING.md)
- [`PHASE4_PERFORMANCE.md`](./PHASE4_PERFORMANCE.md) · [`PERFORMANCE.md`](./PERFORMANCE.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md)
- [`SEARCH.md`](./SEARCH.md) · [`SEO.md`](./SEO.md)

---

## 3. Document map (Phase 5 set)

| Document | Covers |
| :--- | :--- |
| **This file** | Feature design standards, isolation, lifecycle, rollback, deprecation |
| [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md) | ADRs (reliability, observability, gates, perf, product experience) |
| [`FAILURE_HANDLING_MATRIX.md`](./FAILURE_HANDLING_MATRIX.md) | No data / empty / timeout / unavailable / partial / invalid → fallbacks |
| [`PERFORMANCE_BUDGET.md`](./PERFORMANCE_BUDGET.md) | API latency, bundle size, call counts, lazy load, caching |
| [`UX_PRINCIPLES.md`](./UX_PRINCIPLES.md) | Principles for *future* UI work (does not redesign current UI) |
| [`SCALABILITY_GUIDELINES.md`](./SCALABILITY_GUIDELINES.md) | 10 / 100 / 1,000 / 10,000 vehicles |
| [`TESTING_REQUIREMENTS.md`](./TESTING_REQUIREMENTS.md) | Unit / integration / E2E / empty / error / perf / prod validation |
| [`FEATURE_ACCEPTANCE_CHECKLIST.md`](./FEATURE_ACCEPTANCE_CHECKLIST.md) | Practical pre-merge checklist |

---

## 4. Feature design standards (mandatory)

Every future feature **must**:

1. **Solve a real user problem** — stated in the PR (e.g. “shoppers cannot compare range/price side-by-side on `/compare`”).
2. **Improve UX and/or SEO** — clearer discovery, fewer dead ends, better metadata/crawlability where relevant ([`SEO.md`](./SEO.md)).
3. **Use trusted data only** — Published vehicles/articles via existing APIs/services; never invent specs, prices, or ranges client-side.
4. **Never show false or misleading information** — if a field is missing, show “—” / omit / “Not available”, never guess.
5. **Never blank pages** — shell + meaningful empty/error/offline/timeout states (Phase 1 `AsyncState` + `app-empty-state`).
6. **Never infinite loading** — bounded timeout (default GET/HEAD **20s**, others **30s** via interceptor); always exit `loading` to success/empty/error/timeout/offline.
7. **Fail gracefully** — see [`FAILURE_HANDLING_MATRIX.md`](./FAILURE_HANDLING_MATRIX.md).
8. **Be independently removable** — feature-flagged (`backend/config/featureFlags.js`) and/or lazy-routed so deletion does not break `/`, `/evs`, `/ev/...`, `/articles`, `/search`.
9. **Not hurt performance** — stay within [`PERFORMANCE_BUDGET.md`](./PERFORMANCE_BUDGET.md); CI `perf:check` must still PASS.
10. **Scale** — work at catalog sizes in [`SCALABILITY_GUIDELINES.md`](./SCALABILITY_GUIDELINES.md) without a redesign.

### Explicit non-goals for feature PRs

- Do not rewrite Phase 1 reliability or Phase 2 observability “for cleanliness.”
- Do not raise bundle budgets silently (see [`RELEASE.md`](./RELEASE.md) §4).
- Do not skip `status=Published` empty-result checks — that class of bug caused a P0 outage.
- Do not point PR Playwright at live Render/Vercel (cold starts flake CI).

---

## 5. Feature isolation rules

EVCorn is a monorepo with shared data services, but **product surfaces must fail closed and locally**.

### 5.1 Isolation matrix (concrete)

| Feature / surface | May fail | Must still work |
| :--- | :--- | :--- |
| **Compare** (`/compare`) | Compare tray, compare API, selection persistence | Vehicle detail (`/ev/:brandSlug/:modelSlug`), Browse (`/evs`), Home (`/`) |
| **Related EVs / recommendations** | Related section / `GET /api/search/recommendations` | Rest of vehicle or article detail page |
| **Homepage widgets** (quiz, trending, feeds) | Individual widget AsyncState | Page chrome, nav, primary CTA, other widgets |
| **Search** (`/search`, autocomplete, unified) | Search results / dropdown | Browse EVs, Articles list, deep links still load |
| **Filters on Browse** (future) | Filter query / empty filter result | Unfiltered browse + pagination shell |
| **Admin / login** | Admin chunk or auth | All public routes |

### 5.2 Modular implementation rules

1. **Lazy routes stay lazy** — new pages use `loadComponent` in `app.routes.ts` (same pattern as `/compare`, `/search`, `/energy`).
2. **Optional sections own their AsyncState** — a Related EVs block must not share a single page-level `loading` that blocks the hero/specs.
3. **Shared services must not throw across consumers** — prefer Observables + `toAsyncState` / classified errors; never let one subscriber’s error tear down `BlogDataService` caches for everyone.
4. **Feature flags for risky or incomplete work** — prefer `FLAG_*` env toggles (see existing `ENABLE_AI_RECOMMENDATIONS`, etc.) so production can disable without redeploying UI rewrites.
5. **Cache write failures are non-fatal** — Phase 4 `cache.set` already swallows errors; new cache usage must keep that contract.
6. **No cross-feature hard imports of view internals** — share DTOs/services/utils, not CompareComponent internals from VehicleDetail.

### 5.3 Removability test

Before merge, answer: *“If we delete this feature’s route/component and flag tomorrow, do Home, Browse, Vehicle Detail, Articles, Search, and Health still pass E2E?”* If no → not isolated enough.

---

## 6. Data & trust boundaries

1. **Source of truth:** MongoDB Atlas (prod) / file DB (CI) via layered backend (`routes → controllers → services → repositories`). Controllers never query DB directly ([`ARCHITECTURE.md`](./ARCHITECTURE.md)).
2. **Public catalog:** only **Published** content for shopper-facing surfaces.
3. **Light lists for grids:** prefer `?light=true` / existing light endpoints for cards and widgets.
4. **Search/recommendations:** use existing Search/Recommendation services ([`SEARCH.md`](./SEARCH.md)); do not add uncached full-catalog client scans.
5. **SEO surfaces:** dynamic title/description/canonical/OG via existing Seo/Schema services — no blank or duplicate-only titles.

---

## 7. Observability & ops expectations for new features

- Propagate / log `x-request-id` (already on health E2E and error classification).
- Do not disable interceptor retry/timeout without an explicit `HttpContext` token reason.
- Prefer diagnostic kinds already defined (`network_offline`, `cold_start`, etc.) over new one-off strings.
- Health endpoints (`/api/health`, `/live`, `/ready`, `/api/metrics`) remain the ops contract — features must not break them.

---

## 8. Feature lifecycle

Every future product feature follows this path. Skip steps only with explicit reviewer agreement documented in the PR.

```
Idea
  → Architecture Review
  → Implementation
  → Local Validation
  → CI
  → Production Validation
  → Release
  → Maintenance
```

| Stage | What happens | Exit criteria |
| :--- | :--- | :--- |
| **Idea** | State user problem, success metric, non-goals | Fits EVCorn trust/SEO mission; not novelty-only |
| **Architecture Review** | Check isolation, flags, data trust, budgets, ADRs | Cites this doc + relevant Phase 5 children; ADR if decision is hard to reverse |
| **Implementation** | Code behind lazy routes / section AsyncState / flags | Layering + Published data + no blank/infinite load |
| **Local Validation** | `npm run validate:local` (or `SKIP_E2E=1` + justify) | Unit/integration/E2E as required by [`TESTING_REQUIREMENTS.md`](./TESTING_REQUIREMENTS.md) |
| **CI** | GitHub Actions critical jobs green | `backend`, `frontend`, `smoke`, `e2e`, `release-report` PASS |
| **Production Validation** | Deploy + `validate:production` + spot-check | Live health + core routes + new feature path OK |
| **Release** | Mark release COMPLETE only after live PASS | See [`RELEASE.md`](./RELEASE.md) |
| **Maintenance** | Monitor flags, budgets, deprecations | Rollback or deprecate per §§9–10 without site-wide breakage |

**How to use the doc set during Architecture Review / Implementation:**

```
Idea / PR
   │
   ├─► PRODUCT_EXPERIENCE_ARCHITECTURE.md   (lifecycle, isolation, rollback)
   ├─► ARCHITECTURE_DECISIONS.md            (standing ADRs)
   ├─► UX_PRINCIPLES.md                     (interaction & a11y bar)
   ├─► FAILURE_HANDLING_MATRIX.md           (empty/error/offline paths)
   ├─► PERFORMANCE_BUDGET.md                (calls, cache, bundle, latency)
   ├─► SCALABILITY_GUIDELINES.md            (catalog size assumptions)
   ├─► TESTING_REQUIREMENTS.md              (what tests to add)
   └─► FEATURE_ACCEPTANCE_CHECKLIST.md      (tick before merge)
```

**Phase 5 itself is architecture-only.** Shipping Compare/Search/Filters/Related EVs is a later implementation phase that must cite these standards in the PR description.

---

## 9. Rollback strategy

Goal: disable or reverse a bad feature **without downtime** and without blanking core shopper routes.

### 9.1 Preference order (fastest → heaviest)

1. **Feature flag off (preferred)** — toggle env on Render (`FLAG_*` → restart/redeploy env). No UI rewrite required if the feature already gates on `isFeatureEnabled` / `getFeatureFlags` from `backend/config/featureFlags.js`.
2. **Frontend hide via API contract** — when the flag is off, endpoints return disabled/empty envelopes; UI already handles empty/unavailable (Phase 1). Core pages keep rendering.
3. **Provider deploy rollback** — Vercel promote previous frontend; Render roll back previous backend ([`DEPLOYMENT.md`](./DEPLOYMENT.md) §4, [`RELEASE.md`](./RELEASE.md) §5).
4. **Maintenance mode** — `MAINTENANCE_MODE=true` only for platform-wide incidents ([`RELIABILITY.md`](./RELIABILITY.md) §3), not routine feature disable.

### 9.2 Existing flags (`backend/config/featureFlags.js`)

| Flag | Env | Default behavior |
| :--- | :--- | :--- |
| `ENABLE_ADVANCED_SEARCH` | `FLAG_ENABLE_ADVANCED_SEARCH` | On unless `'false'` |
| `ENABLE_ANALYTICS_TELEMETRY` | `FLAG_ENABLE_ANALYTICS_TELEMETRY` | On unless `'false'` |
| `ENABLE_EDITORIAL_WORKFLOW` | `FLAG_ENABLE_EDITORIAL_WORKFLOW` | On unless `'false'` |
| `ENABLE_COMMUNITY_FEATURES` | `FLAG_ENABLE_COMMUNITY_FEATURES` | Off unless `'true'` |
| `ENABLE_AI_RECOMMENDATIONS` | `FLAG_ENABLE_AI_RECOMMENDATIONS` | Off unless `'true'` |

**New features:** add a named `FLAG_*` when rollout risk is material. Experimental → default off (`=== 'true'`). Mature defaults → default on (`!== 'false'`). Document the flag in the PR and in [`RELIABILITY.md`](./RELIABILITY.md) §4 when adding.

### 9.3 Graceful rollback rules

- Flag-off must leave Home, Browse, Vehicle Detail, Articles, Search, Health working (isolation §5).
- Do not require a same-day code deploy to disable a risky feature if a flag exists.
- If post-deploy validate fails: **rollback or flag-off first**, then investigate — do not mark COMPLETE ([`RELEASE.md`](./RELEASE.md)).
- Cache write failures remain non-fatal (Phase 4); do not couple rollback to cache flush unless data corruption is proven.
- This section documents strategy only — it does not invent new runtime code.

---

## 10. Deprecation strategy

Retire obsolete features cleanly so dead code, flags, and tests do not linger.

### 10.1 Removal order (mandatory sequence)

1. **Docs** — Mark deprecated in this set / ADR / feature doc (owner, sunset target, replacement).
2. **Announce in PR / release notes** — Who still depends on it; migration path.
3. **Flag default off** — Prefer a release cycle with the feature disabled in production before deletion.
4. **Tests** — Convert “feature works” E2E to “flag-off / route gone does not break core”; keep regression coverage for replacements.
5. **Code removal** — Routes/components/services/flags/env docs in one PR (or tightly sequenced PRs); no orphan imports.
6. **Verify** — `validate:local` / CI green; spot-check core routes; update checklist links.

### 10.2 Rules

- Do not delete a public route while SEO/canonical still points at it without redirects or intentional de-index ([`SEO.md`](./SEO.md)).
- Do not remove Phase 1–4 locked behavior under a “deprecation” label — open an ADR first.
- Legacy API field sunsets follow [`ARCHITECTURE.md`](./ARCHITECTURE.md) §8 (dual-model → migrate consumers → remove).
- After removal, delete unused `FLAG_*` entries from `featureFlags.js` and provider env docs in the same change set when practical.

---

## 11. Explicit status

### Phase 5 LOCKED — engineering standard

- Architecture and planning documentation only.
- **No application code changes** in this phase.
- **Locked** as the prerequisite standard for all future feature implementation phases.
- Does **not** mark any product feature COMPLETE — only the standards set is locked.
- Phases 1–4 remain LOCKED.

---

## 12. Risks & gaps (honest)

| Risk / gap | Notes |
| :--- | :--- |
| In-process cache only | Multi-instance prod still needs Redis before claiming shared-cache semantics ([`PHASE4_PERFORMANCE.md`](./PHASE4_PERFORMANCE.md)) |
| Compare / Related EVs not redesigned here | Standards apply when those features are built; current `/compare` must keep working |
| Virtual scroll not yet required | Recommended at ~500+ visible list rows ([`PERFORMANCE.md`](./PERFORMANCE.md) §8) |
| File-DB CI ≠ Atlas latency | Perf claims for large catalogs need staging Mongo (`perf:load`) |
| Feature flags exist but are coarse | New features should add named flags when rollout risk is non-trivial |
