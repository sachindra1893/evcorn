# EVCorn Enterprise CI/CD Pipeline Documentation

> **Document Status:** Active CI/CD Pipeline Standard (Phase 9 Complete)  
> **Version:** 1.0.0  

---

## 1. CI/CD Architecture & Pipeline Flow

The EVCorn automated CI/CD pipeline is powered by **GitHub Actions** (`.github/workflows/ci-cd.yml`). Every code change submitted via Pull Request or merged to `main` executes 3 automated quality jobs:

```
                  ┌───────────────────────┐
                  │   Git Push / PR to    │
                  │        'main'         │
                  └───────────┬───────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   backend-test   │ │  frontend-build  │ │  security-audit  │
│  - npm ci        │ │  - npm ci        │ │  - npm audit     │
│  - Jest Unit     │ │  - ng build      │ │  - High/Critical │
│  - Supertest     │ │  - Prerender 6   │ │    Vulnerability │
│    Integration   │ │    Static Routes │ │    Reporting     │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │  All Checks Passed    │
                  │  Ready for Production │
                  └───────────────────────┘
```

---

## 2. GitHub Actions Job Specifications

### Job 1: `backend-test`
- **Environment:** `ubuntu-latest`, Node.js `20.x`.
- **Steps:**
  1. Check out repository code (`actions/checkout@v4`).
  2. Restore/cache backend npm dependencies (`actions/setup-node@v4`).
  3. Execute backend test suite with line coverage reporting (`npm test`).
  4. Ensures 100% test pass rate across all 17 unit and integration tests.

### Job 2: `frontend-build`
- **Environment:** `ubuntu-latest`, Node.js `20.x`.
- **Steps:**
  1. Check out repository code.
  2. Restore/cache frontend npm dependencies.
  3. Compile TypeScript and generate Angular production bundle (`npm run build`).
  4. Validates zero compilation errors and verifies static sitemap generation (`public/sitemap.xml`).

### Job 3: `security-audit`
- **Environment:** `ubuntu-latest`, Node.js `20.x`.
- **Steps:**
  1. Scans backend and frontend dependencies for high/critical security vulnerabilities (`npm audit`).
  2. Flags outdated dependencies for review without performing unverified auto-upgrades.

---

## 3. Future CI/CD Pipeline Enhancements

1. **Automated Staging Preview Deployments:** Provisioning temporary PR preview environments on Vercel and Render for visual design QA before merging to `main`.
2. **Playwright E2E Integration Job:** Adding a headful Playwright browser testing job to the pipeline to validate dynamic UI interactions automatically on every PR.
