# Phase 7 — Security Engineering & Production Hardening

> **Status:** Complete for review (uncommitted) — independent final security review applied  
> **Date:** 2026-07-30  
> **Constraint:** No commit / no production deploy from this phase. Preview + evidence only.  
> **Builds on:** Phases 1–6 (fail-fast env, trust proxy, error envelopes, rate limits, observability).

---

## Objective

Hardening only: secrets, authn/authz, API abuse surfaces, error/log leakage, headers/CORS, uploads, dependency posture. No UI redesign, SEO, or non-security performance work.

---

## Findings summary

| Severity | Count | Disposition |
| :--- | ---: | :--- |
| Critical | 1 | Fixed |
| High | 3 | Fixed |
| Medium | 9 | Fixed |
| Low | 4+ | Fixed / deferred with rationale |

---

## What changed (code)

### Frontend auth (Critical)

- Removed hardcoded `admin` password from `AuthService` and `BlogDataService`.
- Login now calls `POST /api/auth/login` and stores JWT in `sessionStorage` (`evcorn_admin_token`).
- Admin mutations (including upload/delete) send `Authorization: Bearer <jwt>` only.

### Authorization / API

- Article listing no longer trusts `?admin=true` / arbitrary `status=` from clients.
- Public article detail hides drafts / inactive / future `publishAt`.
- Analytics read endpoints require admin auth; event ingest stays public.
- Analytics GET responses use `Cache-Control: no-store` (same as admin).

### Authn hardening (final review)

- **Removed** legacy `x-admin-password` header path from `auth.middleware`, `maintenance.middleware`, and CORS `allowedHeaders`.
- JWT (HS256, `role=admin`) is the **only** API auth mechanism.
- Login password compare uses `crypto.timingSafeEqual`.
- Deleted obsolete FE ad-hoc scripts that hardcoded `x-admin-password: admin`.

### Hardening

- CORS denials use `callback(null, false)` (no 500).
- JWT sign/verify pinned to `HS256`.
- Search/query regex inputs escaped (ReDoS).
- Sanitize strips `$` **and** `.` keys.
- JSON body limit `1mb` (uploads remain multer 10MB).
- Upload magic-byte verification after MIME filter.
- Public `/api/metrics` and health metrics omit `pid` / `nodeVersion`.
- Bulk admin ops capped at 100 ids.
- Oversized body → `413 PAYLOAD_TOO_LARGE`.
- Vercel security headers added (CSP for SPA deferred).
- Logger redaction keys expanded.

---

## Intentionally deferred

| Item | Why |
| :--- | :--- |
| bcrypt / multi-user admin DB | Documented debt; out of scope for final hardening without product redesign |
| Refresh-token rotation / JWT revocation | Single-admin SPA; logout is client-side today |
| Full SPA CSP | Angular inline styles/scripts need careful nonces; risk of breakage without UX work |
| Virus scanning uploads | Requires external AV pipeline |
| Restrict `*.vercel.app` CORS | Required for preview deploys |
| Jest `brace-expansion` high advisories | DevDependency only; `npm audit fix --force` would downgrade Jest to v25 |
| Duplicate Article `slug` index warning | Ops noise, not secret/authz; left as Low ops follow-up |
| Frontend CLI `@hono/node-server` moderate | Build-tool chain; force-fix is breaking |
| Angular `canActivate` admin route guard | UI-only gate today; **API is the real control plane** (JWT) |

---

## Validation

- Backend Jest: **20 suites / 111 tests pass** (includes `security.phase7.api.test.js`)
- Frontend Vitest: **11 files / 66 tests pass**
- Frontend production build: pass; bundle scan clean of hardcoded admin password
- In-process security probe: see `artifacts/phase7-security-curls.txt`
- Vercel preview deployed (SSO-protected in this account):  
  `https://evcorn-lqtdq64vx-sachindra1893s-projects.vercel.app`

## Live Render note

`https://evcorn-backend.onrender.com` still serves **pre–Phase 7** behavior for some checks (public analytics, metrics pid/nodeVersion, legacy header if still on old build). Local Phase 7+ backend (Jest/supertest) is the source of truth until Render is promoted after approval. After promote, Render will match local Phase 7 behavior.
