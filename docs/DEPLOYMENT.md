# EVCorn Enterprise Deployment & Release Management Standard

> **Document Status:** Active Production Deployment Standard (Phase 9 Complete)  
> **Version:** 1.0.0  

---

## 1. Deployment Architecture Overview

EVCorn operates a decoupled Cloud-Native monorepo architecture:
- **Frontend App:** Hosted on **Vercel Edge Network** (Angular 18 Standalone App with SSR Prerendering).
- **Backend API:** Hosted on **Render Web Services** (Node.js + Express Layered Monolith).
- **Database Layer:** Hosted on **MongoDB Atlas** (Replica Set with Connection Pooling).
- **Media CDN:** Hosted on **Cloudinary CDN** (Auto-WebP, dynamic resizing).

---

## 2. Environment Variables & Secret Management

| Secret Parameter | Purpose | Scope | Production Source |
| :--- | :--- | :--- | :--- |
| `PORT` | Node.js Server Port | Backend | Set by Cloud Provider (default: 3000) |
| `NODE_ENV` | Runtime Environment (`production`) | Backend | Provider Configuration |
| `MONGO_URI` | MongoDB Atlas Cluster Connection String | Backend | Render Encrypted Environment |
| `ADMIN_PASSWORD` | Admin Control Panel Access Credential | Backend | Render Encrypted Environment |
| `JWT_SECRET` | Secret key for signing admin authentication JWTs | Backend | Render Encrypted Environment |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Account Identifier | Backend | Render Encrypted Environment |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Backend | Render Encrypted Environment |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Backend | Render Encrypted Environment |
| `ALLOWED_ORIGINS` | Permitted CORS Origins (comma-separated) | Backend | Render Encrypted Environment |

---

## 3. Pre-Flight Deployment Verification Checklist

Before pushing any release to production (see also **`docs/RELEASE.md`**):

- [ ] **Local / CI gate:** `npm run validate:local` or green GitHub Actions on the PR.
- [ ] **Automated Tests:** Backend Jest + Frontend Vitest pass with coverage.
- [ ] **Playwright E2E:** Core routes + regression specs pass.
- [ ] **Angular Build:** Production bundle compiles (`npm run build`) and bundle-size gate passes.
- [ ] **SEO / Smoke:** Static SEO + API smoke (Published vehicles non-empty) pass.
- [ ] **Static Sitemap:** Sitemap auto-generates without errors (`public/sitemap.xml`).
- [ ] **Environment Validation:** All required secrets (`MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`) present in production settings.
- [ ] **Post-deploy:** `npm run validate:production` (or **Production Post-Deploy Validate** workflow) PASS before marking COMPLETE.
- [ ] **Health Endpoint Probes (LIVE):** `/api/health`, `/api/health/live`, and `/api/health/ready` healthy after deploy.

---

## 4. Rollback & Disaster Recovery Procedure

If a production deployment encounters critical failures:

1. **Vercel Instant Frontend Rollback:**
   - Navigate to Vercel Dashboard $\rightarrow$ **Deployments**.
   - Select the previous stable deployment and click **Promote to Production**. Rollback takes < 5 seconds.
2. **Render Backend Instant Rollback:**
   - Navigate to Render Dashboard $\rightarrow$ **Events / Deploys**.
   - Select the previous successful deployment commit and click **Roll Back**.
3. **Database Rollback & Backups:**
   - MongoDB Atlas provides automated continuous point-in-time recovery (PITR).
   - Local DB migration backups are preserved in `backend/data/vehicles_backup_*.json`.

---

## 5. Branching & Release Strategy

### Recommended Branch Protection Rules (`main` branch):
- Require Pull Request reviews before merging.
- Require status checks to pass before merging (`backend`, `frontend`, `smoke`, `e2e`, `release-report`).
- Enforce Linear History and require signed commits.

### Semantic Versioning Convention:
- `v1.0.0` - Major Release (Phase 1-9 Baseline Architecture).
- `v1.1.0` - Minor Feature Additions (New calculators, AI features).
- `v1.0.1` - Patch Fixes (Bug fixes, security updates).

---

## 6. Related documentation

- `docs/RELEASE.md` — Phase 3 release engineering & post-deploy COMPLETE criteria
- `docs/PRODUCT_EXPERIENCE_ARCHITECTURE.md` — Phase 5 feature standards, lifecycle, feature-flag rollback (**LOCKED**)
- `docs/ARCHITECTURE_DECISIONS.md` — ADRs binding future feature phases
- `docs/FEATURE_ACCEPTANCE_CHECKLIST.md` — pre-merge product checklist
