# EVCorn Release Engineering (Phase 3)

> **Document Status:** Active Release Engineering Standard (Phase 3)  
> **Version:** 1.0.0  
> **Locked predecessors:** Phase 1 (Reliability) and Phase 2 (Observability) — do not regress.

---

## 1. Release workflow (summary)

```
Developer PR
    │
    ▼
GitHub Actions CI (ci-cd.yml) ── must PASS to merge
    │  Backend lint/tests/coverage
    │  Frontend tests/build/bundle/SEO
    │  API smoke (local file DB)
    │  Playwright E2E (local FE + file-DB BE)
    │  Release report artifact
    ▼
Merge to main
    │
    ├─► Vercel auto-deploy (frontend)     ← unchanged
    └─► Render auto-deploy (backend)      ← unchanged
            │
            ▼
    Manual / workflow_dispatch:
    Production Post-Deploy Validate
    (validate-production.mjs against LIVE URLs)
            │
            ▼
    COMPLETE only if LIVE checks PASS
```

**Important:** PR CI never hits live Render/Vercel. Live checks are post-deploy only (cold starts would flake CI).

---

## 2. CI pipeline

Workflow: `.github/workflows/ci-cd.yml`

| Job | Critical? | What it runs |
| :--- | :--- | :--- |
| `backend` | Yes | `npm ci`, syntax lint, Jest + coverage |
| `frontend` | Yes | `npm ci`, Vitest/ng test + coverage, production build, bundle size, static SEO |
| `smoke` | Yes | File-DB backend + `scripts/smoke-validate.mjs` |
| `e2e` | Yes | Playwright against local `ng serve` + file-DB API |
| `security-audit` | Advisory | `npm audit` (continue-on-error) |
| `release-report` | Yes | Aggregates artifacts → `RELEASE_REPORT.md` |

Post-deploy (optional): `.github/workflows/production-validate.yml` (`workflow_dispatch`).

Branch protection recommendation: require `backend`, `frontend`, `smoke`, `e2e`, and `release-report`.

---

## 3. Local how-to

```bash
# Install (backend + frontend + Playwright)
npm ci --prefix backend
npm ci --prefix frontend
npm ci
npx playwright install chromium

# Full Phase 3 local validation (recommended before asking for merge)
npm run validate:local

# Skip Playwright if you only need unit/build/smoke
SKIP_E2E=1 npm run validate:local

# Individual gates
npm run lint:backend
npm run test:backend
npm run test:frontend
npm run build:frontend
npm run smoke          # requires backend on :3000
npm run perf:check     # requires frontend dist/
npm run seo:check      # requires frontend dist/
npm run test:e2e
npm run release:report

# Pre-deploy (no E2E smoke stack — use validate:local for full)
npm run predeploy

# After production deploy
npm run validate:production
```

### Playwright baseURL

| Environment | baseURL | How |
| :--- | :--- | :--- |
| Local / CI default | `http://localhost:4200` | `playwright.config.ts` starts BE+FE |
| Override / prod smoke | any | `PLAYWRIGHT_BASE_URL=https://evcorn.com PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e` |

E2E backend uses **`MONGO_URI=` (empty)** so `backend/data/*.json` file DB is used — deterministic, no Atlas dependency.

---

## 4. Debugging failures

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| Backend lint fail | Syntax error in `.js` | Read `node --check` output; fix parse error |
| Jest fail on Published filter | Regression of empty-status tolerance | See `apiQuery.js` + `apiQuery.test.js` |
| Smoke `vehicles_published` FAIL | File DB empty or status filter broken | Check `backend/data/vehicles.json`; re-run status filter tests |
| Bundle size FAIL | New large dependency / unoptimized chunk | Inspect `artifacts/perf-bundle-results.json`; raise budget only with review |
| Playwright timeout on Vehicle Detail | Infinite loader regression | Check AsyncState path in `vehicle-detail.ts` / Published filter |
| Playwright console errors | Uncaught exception in app | Open `artifacts/playwright-report` trace |
| SEO static FAIL | Missing tags in `index.html` | Restore title/description/OG/Twitter/JSON-LD in `src/index.html` |
| Production validate FAIL | Deploy incomplete / Render cold / empty Published | Retry after wake; do **not** mark release COMPLETE |

---

## 5. Rollback

Unchanged from `docs/DEPLOYMENT.md`:

1. **Frontend:** Vercel → previous deployment → Promote to Production  
2. **Backend:** Render → prior successful deploy → Roll Back  
3. **Data:** Atlas PITR / `backend/data/vehicles_backup_*.json`

If post-deploy validation fails: rollback first, then investigate — do not “COMPLETE” the release.

---

## 6. Deployment checklist

### Pre-deploy

- [ ] `npm run validate:local` overall **PASS** (or CI green on the PR)
- [ ] Release report shows PASS for Build, FE tests, BE tests, Playwright, Smoke, Performance, SEO
- [ ] No intentional disable of reliability/observability hooks
- [ ] Secrets present on Render/Vercel (see `docs/DEPLOYMENT.md`)

### Deploy

- [ ] Merge to `main` (Vercel + Render auto-deploy)
- [ ] Wait for both providers to show successful deploy

### Post-deploy

- [ ] `npm run validate:production` **PASS** (or run **Production Post-Deploy Validate** workflow)
- [ ] Spot-check Home, Browse EVs, one Vehicle Detail, Articles, Search, Compare
- [ ] Only then mark release **COMPLETE**

---

## 7. Developer guide (quality gates)

**Do**

- Add permanent regression tests next to the fix (unit/integration preferred; E2E only for UI races/loaders)
- Keep Playwright selectors resilient (`h1`, route URL, body text) — avoid brittle CSS chains
- Fail CI on critical steps; keep live-prod checks out of PR CI

**Don’t**

- Rewrite Phase 1/2 reliability or observability behavior for “cleaner CI”
- Point PR Playwright at `onrender.com` (flaky cold starts)
- Commit secrets, `.env`, or enlarge bundle budgets silently
- Skip `status=Published` empty-result checks — that was a P0 production outage class

### Artifact outputs

All under `artifacts/` (gitignored):

- `RELEASE_REPORT.md` / `RELEASE_REPORT.json`
- `smoke-results.json`, `perf-bundle-results.json`, `seo-static-results.json`
- `playwright-report/`, `playwright-results.json`

---

## 8. Related docs

- `docs/CICD.md` — pipeline overview  
- `docs/TESTING.md` — unit/integration/E2E map  
- `docs/DEPLOYMENT.md` — env vars & rollback  
- `docs/RELIABILITY.md` / `docs/OBSERVABILITY.md` — **LOCKED** Phase 1/2 standards  
- `docs/SEO.md` / `docs/PERFORMANCE.md` — product standards exercised by gates  
