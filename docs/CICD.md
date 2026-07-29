# EVCorn Enterprise CI/CD Pipeline Documentation

> **Document Status:** Active CI/CD Pipeline Standard (Phase 3 Release Engineering)  
> **Version:** 2.0.0  

---

## 1. CI/CD Architecture & Pipeline Flow

The EVCorn automated CI pipeline is powered by **GitHub Actions**:

- **PR / push to `main`:** `.github/workflows/ci-cd.yml` (merge gate)
- **Post-deploy LIVE check:** `.github/workflows/production-validate.yml` (`workflow_dispatch` only)

Vercel (frontend) and Render (backend) auto-deploy remain unchanged. CI gates merges; it does not replace provider deploys.

```
                  ┌───────────────────────┐
                  │   Git Push / PR to    │
                  │        'main'         │
                  └───────────┬───────────┘
                              │
    ┌─────────────┬───────────┼───────────┬─────────────┐
    ▼             ▼           ▼           ▼             ▼
 backend      frontend      smoke        e2e      security-audit
 lint/test    test/build   file-DB    Playwright   (advisory)
 coverage     size/SEO      API
    └─────────────┴───────────┴───────────┴─────────────┘
                              │
                              ▼
                     release-report (PASS/FAIL)
```

Full release process, local commands, rollback, and checklists: **`docs/RELEASE.md`**.

---

## 2. GitHub Actions Job Specifications

### `backend` (critical)
Node 20 · `npm ci` · syntax lint · Jest with coverage · uploads coverage artifact.

### `frontend` (critical)
Node 20 · `npm ci` · `ng test --watch=false --coverage` · production build · bundle size gate · static SEO gate · uploads `dist` + artifacts.

### `smoke` (critical)
Starts backend with empty `MONGO_URI` (file DB) · `scripts/smoke-validate.mjs` against `/api/health*`, vehicles (Published non-empty), articles, search.

### `e2e` (critical)
Installs Playwright Chromium · runs `e2e/*.spec.ts` with local `ng serve` + file-DB backend (see `playwright.config.ts`).

### `security-audit` (advisory)
`npm audit --audit-level=high` on backend and frontend (`continue-on-error`).

### `release-report` (critical aggregator)
Merges job artifacts and runs `scripts/release-report.mjs` → `artifacts/RELEASE_REPORT.md`.

### Production validate (manual)
`scripts/validate-production.mjs` against `https://evcorn.com` + Render API. **Not** part of PR CI.

---

## 3. Caching & timeouts

- npm cache via `actions/setup-node` per lockfile
- Job timeouts: backend 15m, frontend 25m, e2e 35m, smoke 10m
- Concurrency group cancels outdated runs on the same ref

---

## 4. Related documentation

- `docs/RELEASE.md` — release engineering handbook (Phase 3)
- `docs/TESTING.md` — test inventory
- `docs/DEPLOYMENT.md` — env vars & rollback
- `docs/TESTING_REQUIREMENTS.md` — Phase 5 feature testing requirements (no merge without critical gates)
- `docs/PRODUCT_EXPERIENCE_ARCHITECTURE.md` — Phase 5 product experience standards (**LOCKED**)
- `docs/ARCHITECTURE_DECISIONS.md` — ADRs for future feature phases
