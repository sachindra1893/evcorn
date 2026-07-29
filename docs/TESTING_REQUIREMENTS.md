# EVCorn Testing Requirements (Phase 5)

> **Document Status:** Active Feature Testing Requirements (Phase 5 Architecture)  
> **Version:** 1.0.0  
> **Parent:** [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md)  
> **Aligns with:** Phase 3 CI ([`CICD.md`](./CICD.md), [`RELEASE.md`](./RELEASE.md)) · inventory in [`TESTING.md`](./TESTING.md)

---

## 1. Absolute rule

**No merge without Phase 3 critical gates PASS.**

Required CI jobs: `backend`, `frontend`, `smoke`, `e2e`, `release-report` (see branch protection in [`DEPLOYMENT.md`](./DEPLOYMENT.md) / [`RELEASE.md`](./RELEASE.md)).

Local equivalent:

```bash
npm run validate:local
# or SKIP_E2E=1 npm run validate:local  only when E2E is run in CI on the same PR
```

Advisory: `security-audit` may warn; do not ignore high severity without triage.

**PR CI must not hit live Render/Vercel.** Production validation is post-deploy only (`npm run validate:production` / `production-validate.yml`).

---

## 2. Required test layers for new features

| Layer | When required | Location / runner | What to prove |
| :--- | :--- | :--- | :--- |
| **Unit** | Always for new pure logic, classifiers, mappers, cache keys, validators | `backend/tests/unit/**` (Jest) · `frontend/src/**/*.spec.ts` (Vitest) | Correctness, empty vs error, edge inputs |
| **Integration / API** | New or changed endpoints, query filters, cache/ETag contracts | `backend/tests/integration/**` | Envelope shape, Published filter, status codes, cache hit safety |
| **Frontend unit** | New AsyncState wiring, interceptors, isolation of section failures | `*.spec.ts` | loading→terminal transitions; offline/timeout classification |
| **E2E (Playwright)** | New user-visible routes or loader/error races on core flows | `e2e/*.spec.ts` | Happy path + no infinite loader; resilient selectors (`h1`, URL, body text) |
| **Smoke** | New public read APIs that production validate cares about | Extend `scripts/smoke-validate.mjs` if needed | Health + Published non-empty invariants |
| **Perf gate** | Any frontend change that can grow JS | `npm run perf:check` after build | Largest ≤ 1024 KB, total ≤ 2500 KB |
| **SEO static** | New indexable shell / head changes | `npm run seo:check` | Title/description/OG/Twitter/JSON-LD intact |
| **Load (optional)** | New hot list/search endpoints claiming capacity | `npm run perf:load` | Document results; never enable `LOAD_TEST` in prod |

---

## 3. Error handling & empty-state tests (mandatory)

For each new async surface, tests must cover:

1. **Success with data**
2. **Success empty** (`empty` ≠ `error`)
3. **Timeout** (or classified timeout path)
4. **Offline / network** (as applicable)
5. **Server error / 503** with retryable messaging
6. **Isolation** — sibling content still conceptually renderable (unit or component test preferred; E2E when UI race risk is high)

Reuse patterns from:

- `frontend/src/app/core/http/reliability-regression.spec.ts`
- AsyncState / interceptor specs
- Backend `apiQuery` Published-status regressions
- Phase 4 `cache.phase4` / `etag.phase4` tests when touching cache

---

## 4. E2E expectations

Existing coverage (do not regress): Home, Browse EVs, Vehicle Detail, Articles, Article Detail, Search, Compare, Health (`x-request-id`), SEO head tags, loader/navigation regressions.

New features:

- Add a focused spec **or** extend an existing one — prefer permanent regression over one-off manual only.
- File-DB backend (`MONGO_URI` empty) — deterministic.
- Fail on console errors / stuck loaders the same way core specs do.

---

## 5. Performance verification

| Check | Command | Merge blocker? |
| :--- | :--- | :--- |
| Bundle budget | `npm run perf:check` | **Yes** (via frontend CI job) |
| Unit/integration still green | `test:backend` / `test:frontend` | **Yes** |
| Load harness | `npm run perf:load` | No for every PR; **Yes** for PRs that claim capacity or change hot paths materially |
| Slow query discipline | Review + existing `measureQuery` warns | Review |

---

## 6. Production validation

After deploy to live (not in PR CI):

```bash
npm run validate:production
```

Spot-check per [`RELEASE.md`](./RELEASE.md): Home, Browse EVs, one Vehicle Detail, Articles, Search, Compare — **plus the new feature**.

Only then may a **release** be marked COMPLETE. Phase 5 architecture docs alone do not COMPLETE product features.

---

## 7. What “done” means for a feature PR

1. Checklist in [`FEATURE_ACCEPTANCE_CHECKLIST.md`](./FEATURE_ACCEPTANCE_CHECKLIST.md) completed  
2. `validate:local` or CI green  
3. No intentional disable of Phase 1/2 hooks  
4. New failure modes have tests  
5. Perf/SEO gates still PASS  

---

## 8. Related docs

- [`TESTING.md`](./TESTING.md) — suite inventory  
- [`RELEASE.md`](./RELEASE.md) — debugging failures, artifacts  
- [`CICD.md`](./CICD.md) — job graph  
- [`FAILURE_HANDLING_MATRIX.md`](./FAILURE_HANDLING_MATRIX.md)  
- [`PERFORMANCE_BUDGET.md`](./PERFORMANCE_BUDGET.md)  
- [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md) — lifecycle / rollback / deprecation  
- [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md) — standing ADRs  
