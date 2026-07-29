# EVCorn Feature Acceptance Checklist (Phase 5)

> **Document Status:** Active Pre-Merge Checklist (Phase 5 **LOCKED**)  
> **Version:** 1.0.0  
> **Parent:** [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md)  
> **Use:** Copy into the PR description or tick locally before requesting review.  
> **Also:** [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md)

---

## Problem & scope

- [ ] Real user problem stated (who / what pain / success metric)
- [ ] Improves UX and/or SEO (not novelty-only)
- [ ] Out of scope items listed (no drive-by redesign of unrelated pages)
- [ ] Phases 1–4 behavior not regressed (reliability, observability, release gates, performance contracts)

---

## Trust & data

- [ ] Uses Published / trusted API data only
- [ ] Missing fields show unavailable / omit — **never** invented specs or prices
- [ ] No misleading “success” when the API failed or returned empty
- [ ] Admin/draft content cannot leak onto public surfaces

---

## Isolation & removability

- [ ] Feature is modular (lazy route and/or section-owned state)
- [ ] Failure cannot blank Home, Browse (`/evs`), Vehicle Detail, Articles, or Search
- [ ] Compare failure would not break vehicle pages (and vice versa)
- [ ] Related / widget / optional section failure is section-local
- [ ] Can be feature-flagged or deleted without cascading compile/runtime breakage
- [ ] Removability test considered (see Product Experience Architecture §5.3)
- [ ] Rollback path known (flag-off and/or provider rollback — Product Experience Architecture §9)
- [ ] Lifecycle stage clear (Idea → … → Maintenance — Product Experience Architecture §8)

---

## Failure & loading UX

- [ ] Uses `AsyncState` (or equivalent) — distinct `loading` / `success` / `empty` / `error` / `timeout` / `offline`
- [ ] No infinite loading path (timeout bounded; Playwright-class loader regressions avoided)
- [ ] Empty states use meaningful copy + recovery CTA where appropriate (`app-empty-state` pattern)
- [ ] Errors use classified user messages; no raw stack traces in UI
- [ ] Offline / cold-start / waking behavior compatible with Phase 1 patterns
- [ ] Matrix reviewed: [`FAILURE_HANDLING_MATRIX.md`](./FAILURE_HANDLING_MATRIX.md)

---

## Performance & scale

- [ ] Stays within [`PERFORMANCE_BUDGET.md`](./PERFORMANCE_BUDGET.md) (API calls, cache, lazy load)
- [ ] `npm run perf:check` PASS (largest JS ≤ 1024 KB, total ≤ 2500 KB) — no silent budget raise
- [ ] Prefers `?light=` / cached / fingerprinted list endpoints; no full-catalog client scan
- [ ] New hot queries indexed or proven cheap; recommendations remain scoped/capped
- [ ] Works conceptually at 10 / 100 / 1,000 / 10,000 variants per [`SCALABILITY_GUIDELINES.md`](./SCALABILITY_GUIDELINES.md)
- [ ] Does not reintroduce API cache-busting query timestamps
- [ ] Does not switch back to preload-all-modules

---

## UX & a11y (future UI only — match existing language)

- [ ] Follows [`UX_PRINCIPLES.md`](./UX_PRINCIPLES.md) (clean section, clear CTA, mobile-usable)
- [ ] Single sensible heading hierarchy; SEO metadata wired if indexable ([`SEO.md`](./SEO.md))
- [ ] Keyboard / screen-reader basics for new controls; status roles for empty/offline where needed

---

## Observability

- [ ] Does not strip `x-request-id` / error correlation
- [ ] Does not disable interceptor retry/timeout without documented `HttpContext` reason
- [ ] Failures diagnosable via existing logging/diagnostics kinds when applicable

---

## Testing & release gates

- [ ] Unit tests for new logic (including empty vs error)
- [ ] Integration/API tests if endpoints or query contracts changed
- [ ] E2E coverage for new user-visible flow **or** justified reliance on existing specs + unit isolation tests
- [ ] Error / empty / timeout paths covered
- [ ] `npm run validate:local` PASS **or** GitHub Actions critical jobs green on the PR
- [ ] Smoke / SEO gates still PASS if touched
- [ ] Permanent regression added next to any bug fix (Phase 3 developer guide)
- [ ] Post-deploy: plan `validate:production` + spot-check including this feature before calling the **release** COMPLETE

---

## Architecture compliance

- [ ] Backend layering respected (no DB in controllers) — [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [ ] Envelope / pagination / MAX_LIMIT conventions preserved
- [ ] Feature flag added if rollout risk is material (`backend/config/featureFlags.js`)

---

## Sign-off

| Role | Name | Date |
| :--- | :--- | :--- |
| Author | | |
| Reviewer | | |

**Standards referenced:** Product Experience Architecture (lifecycle / rollback / deprecation) · Architecture Decisions · Failure Matrix · Performance Budget · UX Principles · Scalability · Testing Requirements · Release / CI / Reliability / Observability
