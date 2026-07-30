# Phase 6 — Production Engineering & Operations

> **Status:** COMPLETE  
> **Mode:** Ops reliability only — no UI/UX/feature/SEO/schema redesign.  
> **Production:** https://evcorn.com · API https://evcorn-backend.onrender.com/api  
> **Gate:** `npm run validate:production` PASS required on live after promote.

---

## 1. Audit verdict (what was already shipped)

| Area | Prior phase | Status entering Phase 6 |
| :--- | :--- | :--- |
| Request IDs + structured logs | 2 | Done |
| Health live/ready + metrics + slow request | 2 | Done (DB-only deps) |
| Error envelopes (no stack to clients) | 1–2 | Done |
| CI gates + `validate:production` + smoke | 3 | Done |
| Cache-Control / compression / ETag | 4 | Done |
| Light DTOs / scale harnesses | 5.3 | Done |
| Rollback / backup / DR docs | 3 / RELIABILITY | Done |
| robots / sitemap / favicon / SPA 404 | SEO / FE | Done |

Phase 6 **did not rewrite** the above. It filled proven gaps only.

---

## 2. Phase 6 changes (gaps closed)

| Gap | Fix | Validation |
| :--- | :--- | :--- |
| Soft prod env warnings allowed insecure JWT/admin defaults | `validateEnv()` **fail-fast** in production | `backend/tests/unit/env.phase6.test.js` |
| Ready/live/metrics CDN-cached (`s-maxage=60`) | Probes → `Cache-Control: no-store` | Health API tests |
| Health lacked dependency snapshot | `dependencies.database` + `cloudinary` (config presence) | Health API tests |
| Vercel SPA lacked static asset cache headers **and** explicit `outputDirectory` | Long-cache static; short HTML/SEO; `dist/evera-app/browser` pinned | Preview + `vercel curl` |
| Missing web manifest link | `site.webmanifest` + `index.html` link | Build / SEO / preview |
| Broken `PHASE4_PERFORMANCE.md` links | Restored durable summary | Doc links resolve |
| FE high advisories fixable without major bumps | `npm audit fix` (non-force) | Re-audit |

---

## 3. Operator runbook (existing scripts)

| Goal | Command |
| :--- | :--- |
| Local full gate | `npm run validate:local` |
| Pre-deploy critical | `npm run predeploy` |
| Smoke (API up) | `npm run smoke` |
| LIVE post-deploy | `npm run validate:production` |
| Bundle / SEO | `npm run perf:check` · `npm run seo:check` |
| Prod env contract (unit) | `npm --prefix backend test -- --testPathPattern=env.phase6` |

### Production secrets (must be set on Render)

- `MONGO_URI` (or `ALLOW_FILE_DB_IN_PRODUCTION=true` for intentional File-DB)
- `ADMIN_PASSWORD` (non-default)
- `JWT_SECRET` (explicit; not the built-in default)
- `CLOUDINARY_*` (uploads; warned if missing)
- `ALLOWED_ORIGINS`

### Vercel preview verification

Preview deployments may use **Deployment Protection (SSO)**. Public `curl` gets a 302 to Vercel login — use:

```bash
npx vercel curl https://<preview-host>/
npx vercel curl https://<preview-host>/site.webmanifest
```

Frontend project `outputDirectory` must be `dist/evera-app/browser` (pinned in `frontend/vercel.json`).

Rollback / backup: [`DEPLOYMENT.md`](./DEPLOYMENT.md) §4 · [`RELIABILITY.md`](./RELIABILITY.md) §1 · [`RELEASE.md`](./RELEASE.md) §5.

---

## 4. Deferred (explicitly not implemented)

| Item | Why deferred |
| :--- | :--- |
| Dedicated branded `500.html` / ServerError route | SPA on Vercel; API already returns generic JSON 500; no proven static 500 incidence |
| Live Cloudinary / Redis health pings | Side effects, latency, no Redis in stack yet |
| OpenTelemetry / vendor APM / RUM | Product sink not selected; stdout JSON sufficient today |
| Hard-fail CI on backend `npm audit` | Jest transitive chain; “fix” suggests jest@25 downgrade (unsafe) |
| Remove Prettier / other unused-looking deps | Prettier has `.prettierrc` (editor/format contract) — no proof of unused |
| Service worker / offline PWA | Feature/UX expansion — out of Phase 6 scope |
| Redis multi-instance cache | Phase 4/5.3 already deferred; needs capacity justification |

---

## 5. Remaining production risks

1. In-process cache is per-instance (no Redis).
2. Backend Jest audit noise remains advisory.
3. File-DB production opt-in is an escape hatch — use only knowingly.
4. Metrics are process-local (lost on restart / multi-instance).
5. No automated Atlas backup verification job in CI (provider PITR relied upon).
