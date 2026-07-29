# EVCorn Architecture Decision Records (ADRs)

> **Document Status:** Active Engineering Standard (Phase 5)  
> **Version:** 1.0.0  
> **Parent:** [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md)  
> **Scope:** Product and architecture decisions that bind future feature work. Documentation only.

Add new ADRs when a decision is intentional, hard to reverse, or frequently re-litigated. Keep entries concise and EVCorn-specific.

---

## ADR-001 — Reliability-first product surfaces

| Field | Content |
| :--- | :--- |
| **Decision** | Every async product surface uses Phase 1 patterns (`AsyncState`, classified errors, empty ≠ error, bounded timeouts, offline/waking UX). |
| **Context** | Infinite loaders and blank pages caused P0-class outages; ad-hoc spinners diverged per page. |
| **Rationale** | Shoppers must always see a recoverable shell. Shared patterns beat per-feature inventiveness. |
| **Consequences** | New features reuse `toAsyncState` / empty-state components; parallel loader systems are forbidden. |
| **Approval date** | 2026-07-29 (Phase 1 locked; reaffirmed Phase 5) |

See [`RELIABILITY.md`](./RELIABILITY.md), [`FAILURE_HANDLING_MATRIX.md`](./FAILURE_HANDLING_MATRIX.md).

---

## ADR-002 — Observability is a non-optional contract

| Field | Content |
| :--- | :--- |
| **Decision** | Propagate `x-request-id`, structured logs, diagnostics kinds, and health/metrics contracts on every feature path. |
| **Context** | Production failures were hard to correlate across Vercel SSR and Render API cold starts. |
| **Rationale** | Without correlation, release gates and post-deploy validate cannot prove or disprove regressions. |
| **Consequences** | Features must not strip request IDs, silent-swallow errors, or invent one-off diagnostic strings when existing kinds fit. |
| **Approval date** | 2026-07-29 (Phase 2 locked; reaffirmed Phase 5) |

See [`OBSERVABILITY.md`](./OBSERVABILITY.md).

---

## ADR-003 — CI and release gates before COMPLETE

| Field | Content |
| :--- | :--- |
| **Decision** | No merge without critical CI jobs green; no release marked COMPLETE without post-deploy live validation. |
| **Context** | PR Playwright against live Render/Vercel flaked on cold starts; “shipped” releases lacked a clear COMPLETE bar. |
| **Rationale** | Local/file-DB CI catches regressions deterministically; live checks stay post-deploy only. |
| **Consequences** | Features add permanent regressions where needed; `validate:local` / CI + `validate:production` remain mandatory. |
| **Approval date** | 2026-07-29 (Phase 3 locked; reaffirmed Phase 5) |

See [`RELEASE.md`](./RELEASE.md), [`CICD.md`](./CICD.md), [`TESTING.md`](./TESTING.md).

---

## ADR-004 — Performance and caching budgets are enforceable

| Field | Content |
| :--- | :--- |
| **Decision** | New work stays inside Phase 4 cache/ETag/`?light=` contracts and CI bundle budgets (largest JS ≤ 1024 KB, total ≤ 2500 KB). |
| **Context** | Cache-busting timestamps and preload-all modules destroyed caching and inflated bundles. |
| **Rationale** | Catalog growth (→ 10k variants) requires server-side filtering, light lists, and measured budgets—not hope. |
| **Consequences** | Silent budget raises forbidden; full-catalog client scans forbidden; prefer cached fingerprinted list paths. |
| **Approval date** | 2026-07-29 (Phase 4 locked; reaffirmed Phase 5) |

See [`PERFORMANCE_BUDGET.md`](./PERFORMANCE_BUDGET.md), [`PERFORMANCE.md`](./PERFORMANCE.md), [`PHASE4_PERFORMANCE.md`](./PHASE4_PERFORMANCE.md).

---

## ADR-005 — Product experience architecture precedes feature build

| Field | Content |
| :--- | :--- |
| **Decision** | Phase 5 docs are the prerequisite standard for all future product features (Compare, Search, Filters, Related EVs, widgets, calculators). Implementation phases must cite them. |
| **Context** | Features were landing without shared isolation, failure UX, acceptance, or removability rules. |
| **Rationale** | Architecture-first prevents cascading breakage and trust violations (false specs, blank pages). |
| **Consequences** | PRs complete [`FEATURE_ACCEPTANCE_CHECKLIST.md`](./FEATURE_ACCEPTANCE_CHECKLIST.md); Phase 5 itself ships **no** application code. |
| **Approval date** | 2026-07-29 |

See [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md).

---

## ADR-006 — Feature isolation and flag-based rollback

| Field | Content |
| :--- | :--- |
| **Decision** | Product surfaces fail locally; risky work ships behind `backend/config/featureFlags.js` (`FLAG_*` env) so production can disable without downtime or UI rewrites. |
| **Context** | One widget/API failure must not blank Home, Browse, Vehicle Detail, Articles, or Search. |
| **Rationale** | Instant env toggle + provider deploy rollback beats emergency code surgery. |
| **Consequences** | New risky features add named flags; default-off for experimental (`=== 'true'`); default-on only when mature (`!== 'false'`). |
| **Approval date** | 2026-07-29 |

See Product Experience Architecture § Rollback Strategy and [`RELIABILITY.md`](./RELIABILITY.md) §4.

---

## ADR-007 — Trusted Published data only

| Field | Content |
| :--- | :--- |
| **Decision** | Shopper-facing surfaces use Published catalog data via layered APIs; missing fields show unavailable/omit — never invent specs, prices, or ranges client-side. |
| **Context** | Misleading vehicle data destroys trust; empty `status=Published` filters caused a P0 outage class. |
| **Rationale** | EVCorn’s value is accurate EV information, not fabricated completeness. |
| **Consequences** | Empty results and missing fields are first-class UX; Published-filter regressions stay permanent tests. |
| **Approval date** | 2026-07-29 |

---

## How to add an ADR

1. Next number (`ADR-00N`), title, context, decision, rationale, consequences, approval date.
2. Link from [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md) document map if it becomes a standing rule.
3. Do not rewrite locked Phase 1–4 behavior “for cleanliness”; open an ADR if a deliberate change is required.
