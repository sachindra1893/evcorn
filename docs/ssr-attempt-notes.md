# Angular SSR Implementation Attempt & Architecture Notes

## Overview
This document summarizes the technical findings, proven components, unconfirmed behaviors, and open questions from the initial Angular 21 SSR setup attempt on EVCorn. All SSR infrastructure code remains preserved on the `ssr-implementation` branch for future reference.

---

## 1. What Was Tried
* **Angular 21 `@angular/ssr` Integration**: Installed `@angular/ssr` version `21.2.17` and created `src/server.ts`, `src/main.server.ts`, `src/app/app.config.server.ts`, and `src/app/app.routes.server.ts`.
* **Prerendering vs. Server-Rendering Strategy**:
  * 55 static routes (article detail pages, vehicle spec pages, legal/static pages) were set to `RenderMode.Prerender`.
  * Dynamic routes (Homepage `/`) were configured for `RenderMode.Server` on demand.
* **Vercel Serverless Function & Rewrite Iterations**:
  * Added `frontend/api/index.js` serverless function entrypoint.
  * Attempted multiple `vercel.json` routing configurations (including single catch-all `/(.*)`, `framework: null`, post-build `index.html` to `index.csr.html` renaming, and Vercel's official two-rewrite-rule pattern `{ "source": "/", "destination": "/api/index" }`).
* **Render Dedicated Node Service Deployment**:
  * Created `render.yaml` specification for `evcorn-frontend-ssr` running Node 22 (`node frontend/dist/evera-app/server/server.mjs`).
  * Updated Angular host security `security.allowedHosts` in `angular.json` and backend CORS origins (`backend/config/cors.js` and `backend/config/env.js`) for `.onrender.com`.

---

## 2. What Was Proven to Work
1. **Local Node Express SSR Execution**:
   * Running `PORT=4005 node frontend/dist/evera-app/server/server.mjs` locally executed cleanly and rendered 8.95 MB of full server-side HTML containing `ng-server-context="ssr"`, dynamic title tags, and pre-hydrated DOM nodes.
2. **Build-Time Prerendering**:
   * Prerendering 55 static routes during `ng build` succeeded cleanly without memory leaks or build errors.
3. **Vehicle Detail Payload Optimization** (Merged to `main`):
   * Scoped `VehicleDetailComponent` to fetch brand-specific vehicles (`getVehiclesByBrandState(brandSlug)`) instead of fetching all 30 launched vehicles with full specs, reducing single vehicle static HTML payload size by ~70% (from 7.14 MB down to 2.18 MB).
4. **Dependency Pinning & CORS Enhancements** (Merged to `main`):
   * `@angular/*` packages pinned to exact version `21.2.17`.
   * Backend CORS updated to match `.onrender.com` origins safely.

---

## 3. What Was Never Fully Confirmed
* **Remote Dynamic SSR Response Payload**:
  * While local execution produced `ng-server-context="ssr"`, curling remote endpoints (both Vercel preview deployments and Render web service) yielded static/CSR shell HTML rather than server-rendered body content for dynamic routes.
  * Despite fixing host security (`allowedHosts`), CORS permissions, rewrites, and Node versions, raw HTML returned from remote requests did not output dynamic SSR body tags.

---

## 4. Open Questions & Future Investigation Items
1. **Caching / Proxy Interception**:
   * Verify whether Cloudflare, Render's static asset cache, or Vercel's CDN edge proxy is intercepting requests to `/` and serving a cached static `index.html` shell before reaching the Node `server.mjs` / Express process.
2. **`AngularNodeAppEngine` Fallback Criteria**:
   * Inspect under what exact condition `AngularNodeAppEngine.handle(req)` returns `null` or falls back to static index rendering in a cloud environment vs local dev server.
3. **Production Alignment**:
   * All SSR infrastructure code is safely preserved on `ssr-implementation`. Future iterations can resume directly from branch `ssr-implementation`.
