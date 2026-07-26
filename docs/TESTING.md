# EVCorn Enterprise Testing & Quality Assurance Standard

> **Document Status:** Active QA & Test Suite Standard (Phase 8 Complete)  
> **Version:** 1.0.0  

---

## 1. Test Suite Execution Summary

- **Total Test Suites:** 5 (100% PASS)
- **Total Tests:** 17 (100% PASS)
- **Execution Time:** ~1.5 seconds
- **Line Coverage:** 50.28% overall (focusing on core business logic & security boundaries)

```bash
PASS  tests/unit/auth.utils.test.js
PASS  tests/unit/apiQuery.test.js
PASS  tests/integration/health.api.test.js
PASS  tests/integration/auth.api.test.js
PASS  tests/integration/vehicle.api.test.js
```

---

## 2. Test Classification Breakdown

| Test Suite | Type | Test Cases | Status | Scope / Verification |
| :--- | :--- | :--- | :--- | :--- |
| `tests/unit/apiQuery.test.js` | Unit | 5 | **PASS** | Pagination, limit capping (max 100), sorting whitelist, projections, format envelopes. |
| `tests/unit/auth.utils.test.js` | Unit | 2 | **PASS** | JWT token generation, payload decoding, malformed token rejection. |
| `tests/integration/health.api.test.js` | Integration | 4 | **PASS** | `/api/health`, `/api/health/live`, `/api/health/ready`, `/api/metrics`, request ID injection. |
| `tests/integration/vehicle.api.test.js` | Integration | 3 | **PASS** | `GET /api/vehicles`, `GET /api/vehicles?format=envelope`, 404 AppError handling. |
| `tests/integration/auth.api.test.js` | Integration | 2 | **PASS** | Valid admin login, JWT issuance, 401 Unauthorized handling for invalid password. |

---

## 3. Frontend & Build Integrity Verification

- **Angular Build Test:** `npm run build` executed in `frontend/` $\rightarrow$ **0 TypeScript / Angular Compiler Errors**, 6 static routes prerendered cleanly.
- **Sitemap Generator:** `generate-sitemap.js` generates valid dynamic `sitemap.xml`.

---

## 4. How to Execute Tests

```bash
# Run backend test suite with coverage
cd backend && npm test

# Run tests in single-threaded mode for debugging
cd backend && npx jest --runInBand

# Build Angular frontend
cd frontend && npm run build
```

---

## 5. Remaining Testing Gaps & Quality Roadmap

1. **Playwright / Cypress E2E Tests:** In a future phase, headful E2E browser tests can automate multi-step visual workflows (interactive vehicle comparison tray, search dropdowns, article block rendering).
2. **Cloudinary Mock Upload Testing:** Add mock stream interceptors to unit test `UploadService` image deletions without contacting Cloudinary servers.
