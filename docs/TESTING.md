# EVCorn Enterprise Testing & Quality Assurance Standard

> **Document Status:** Active QA & Test Suite Standard (Phase 3 Release Engineering)  
> **Version:** 2.0.0  

---

## 1. Test layers

| Layer | Location | Runner |
| :--- | :--- | :--- |
| Backend unit/integration | `backend/tests/**` | Jest (`npm test` / `npm run test:ci`) |
| Frontend unit | `frontend/src/**/*.spec.ts` | Vitest via `ng test` (`npm run test:ci`) |
| Playwright E2E | `e2e/*.spec.ts` | Playwright (`npm run test:e2e` from repo root) |
| Smoke / perf / SEO gates | `scripts/*.mjs` | Node |
| Full local gate | `npm run validate:local` | Orchestrator |

Release handbook: **`docs/RELEASE.md`**.

---

## 2. Backend suites (representative)

```bash
cd backend && npm test
```

Includes (non-exhaustive): `apiQuery` (Published-status P0 regressions), `auth`, `health`, `vehicle`, `search`, `reliability`, `observability-regression` (Server-Timing + request-id + retry), contracts, admin, analytics, evDomain.

---

## 3. Frontend suites

```bash
cd frontend && npm run test:ci
```

Includes HTTP interceptor (retry/timeout/request-id), AsyncState (empty/offline/timeout), diagnostics, logging, global error handler, and `reliability-regression.spec.ts`.

---

## 4. Playwright E2E

```bash
npm ci   # root — installs @playwright/test
npx playwright install chromium
npm run test:e2e
```

Covers Home, Browse EVs, Vehicle Detail, Articles, Article Detail, Search, Compare, Health API, SEO head tags, and permanent loader/navigation regressions. Uses local file DB (empty `MONGO_URI`).

---

## 5. How to Execute (quick)

```bash
# Full Phase 3 local validation
npm run validate:local

# Backend only
npm --prefix backend test

# Frontend only
npm --prefix frontend run test:ci

# Build Angular frontend
npm --prefix frontend run build
```

---

## 6. Remaining gaps

1. **Cloudinary mock upload testing** — optional; do not hit live Cloudinary in CI.
2. **Expanded visual compare-tray interactions** — add only if stable selectors exist.
