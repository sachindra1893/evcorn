# EVCorn Enterprise Scalability, Reliability & Disaster Recovery Standard

> **Document Status:** Active Enterprise Reliability Standard (Phase 15 Complete)  
> **Version:** 1.0.0  

---

## 1. Backup & Recovery Strategy

| Resource | Backup Mechanism | Frequency | RPO (Recovery Point) | RTO (Recovery Time) |
| :--- | :--- | :--- | :--- | :--- |
| **MongoDB Atlas** | Continuous PITR & Daily Automated Snapshots | Hourly / Daily | **< 1 Hour** | **< 15 Minutes** |
| **Cloudinary Media** | Automated Cloudinary Cross-Region Replication | Real-time | **< 1 Hour** | **< 5 Minutes** |
| **Local File Data** | `backend/data/vehicles_backup_*.json` | Git Commit / Build | **Instant** | **< 1 Minute** |
| **Config & Secrets** | Encrypted Provider Variables (Render & Vercel) | On Change | **Instant** | **< 5 Minutes** |

---

## 2. Versioned Database Migration Framework

Database schema evolution is managed via `backend/migrations/`:
- **Idempotent Migration Runner (`backend/scripts/run-migrations.js`):** Scans versioned migration files (`001_initial_schema.js`, `002_add_editorial_indexes.js`) and applies schema updates safely.
- **Rollback Interface (`down(db)`):** Reverses schema changes cleanly if a deployment fails.

---

## 3. Maintenance Mode (`maintenance.middleware.js`)

Controlled platform maintenance triggered via environment variable:
- **Toggle:** Set `MAINTENANCE_MODE=true` in Render environment settings.
- **Public Response:** Public traffic receives HTTP `503 Service Unavailable` with `SERVICE_MAINTENANCE` JSON payload.
- **Admin & Health Bypass:** `/api/health`, `/api/health/*`, `/api/auth/login`, and requests carrying valid `Bearer` admin tokens or `x-admin-password` headers bypass maintenance mode for operational fixes.

---

## 4. Feature Flag System (`config/featureFlags.js`)

Lightweight, environment-configurable feature toggles without third-party dependencies:
- `ENABLE_ADVANCED_SEARCH`
- `ENABLE_ANALYTICS_TELEMETRY`
- `ENABLE_EDITORIAL_WORKFLOW`
- `ENABLE_COMMUNITY_FEATURES`
- `ENABLE_AI_RECOMMENDATIONS`

---

## 5. Resilience, Retries & Rate Limiting

- **Exponential Backoff Retry (`retry.utils.js`):** `withRetry(fn, { retries: 3, delayMs: 300 })` wraps network-sensitive operations (Atlas connection attempts, Cloudinary stream uploads).
- **Rate Limit Tiers (`rateLimit.middleware.js`):**
  - Public API Read: 100 req/min
  - Auth Endpoints: 5 req/min
  - Admin Operations: 60 req/min

---

## 6. Infrastructure Capacity Planning (Scaling Benchmarks)

| Monthly Active Users (MAU) | Estimated Requests/sec (RPS) | Infrastructure Architecture Recommendation |
| :--- | :--- | :--- |
| **10,000 MAU** | ~0.5 - 2 RPS | Current Render Free/Starter + Vercel Edge + Atlas M0 |
| **100,000 MAU** | ~5 - 20 RPS | Render Standard Instance (2 GB RAM) + Atlas M10 (Connection Pool: 50) |
| **1,000,000 MAU** | ~50 - 200 RPS | Render Horizontal Auto-Scaling (2-4 Nodes) + Redis Edge Caching |

---

## 7. Disaster Recovery Playbook

1. **Database Failure (MongoDB Atlas Outage):**
   - Application falls back to local File DB mode (`useLocalFileDb = true`) allowing public read traffic to remain 100% operational.
2. **Backend Outage (Render Cold Start / Failure):**
   - Vercel frontend displays cached static pages and pre-rendered SSR routes seamlessly.
3. **Frontend Outage (Vercel Failure):**
   - Execute 1-click Vercel instant deployment rollback (< 5 seconds).
