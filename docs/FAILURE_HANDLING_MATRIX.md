# EVCorn Failure Handling Matrix (Phase 5)

> **Document Status:** Active Product Resilience Standard (Phase 5 Architecture)  
> **Version:** 1.0.0  
> **Parent:** [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md)  
> **Builds on:** Phase 1 `AsyncState` + `classifyHttpError` + offline/waking UX; Phase 2 request IDs & diagnostics

---

## 1. Core rule

**Empty is not error. Error is not blank. Loading is never forever.**

Use the shared shape from `frontend/src/app/core/async-state/async-state.ts`:

| `AsyncState` status | Meaning | Typical UI |
| :--- | :--- | :--- |
| `loading` | In flight | Skeleton / spinner in **that** section only |
| `success` | Non-empty data | Render content |
| `empty` | Successful response, no items | `app-empty-state` + optional CTA (Browse EVs / clear filters) |
| `error` | Classified HTTP/app failure | User message + Retry if `retryable`; preserve shell |
| `timeout` | Exceeded interceptor timeout | Timeout copy + Retry |
| `offline` | Browser offline | Offline copy; global `app-offline-banner` may also show |

Never collapse these into a single boolean that produces a white page.

---

## 2. Failure handling matrix

| Scenario | Detection (EVCorn today) | User-facing behavior | Must not | Observability |
| :--- | :--- | :--- | :--- | :--- |
| **No data / empty collection** | HTTP 200 + `[]` / null → `empty` | Meaningful empty copy (“No EVs match…”) + navigation CTA | Treat as error; show spinner forever | Optional info log; not an error storm |
| **Empty API (Published filter yields 0)** | Same as empty; smoke gate expects Published non-empty in healthy envs | Empty state on surface; ops investigate data if prod smoke fails | Ship “success” with blank body; skip Published checks | Smoke / production validate FAIL → do not COMPLETE release ([`RELEASE.md`](./RELEASE.md)) |
| **Timeout** | Interceptor / RxJS `TimeoutError`; GET default **20s** | “This is taking longer than expected…” + Retry; exit loading | Infinite loader (Playwright vehicle-detail regression class) | Log with `x-request-id`; category `timeout` |
| **Backend unavailable** | Status 0 / 502 / 503 / 504; maintenance `503 SERVICE_MAINTENANCE` | Network/server message; bounded retry; cold-start / waking signal while retrying | Crash sibling features; blank entire app shell | `cold_start` diagnostic when suspected; request ID |
| **Partial data** | Some fields missing on otherwise valid Published vehicle/article | Show available fields; missing → “—” / omit / “Not available” | Invent price, range, battery, or images | Warn in admin/editorial paths if critical fields missing |
| **Invalid data** | Validator / DTO reject; malformed client payload; 4xx | Client message (“That request could not be completed…”) or 404 not-found | Render garbage JSON; throw uncaught in template | Operational error envelope + `requestId` |
| **Rate limited** | 429 | “You're doing that a bit too fast…” | Tight retry loops that worsen limits | Category `rateLimit` |
| **Auth expired (admin)** | 401/403 | Sign-in again; public site unaffected | Log user out of public browsing | Category `auth` |
| **Lazy chunk / navigation fail** | Router navigation error handler (Phase 1 Task 9) | Recover / reload path — not stuck route | Uncaught chunk error white-screen | Diagnostics as configured |
| **Offline** | `NetworkStatusService` / `navigator.onLine` | Offline banner + offline AsyncState | Pretend online with endless retry noise | `network_offline` |

---

## 3. Surface-scoped fallbacks (isolation)

Apply the matrix **per surface**, not per app:

| Surface | On failure / empty |
| :--- | :--- |
| **Home widget** | Hide or empty that widget; keep hero/nav/other widgets |
| **Vehicle detail primary** | Page shell + error/empty for primary payload; secondary Related section independent |
| **Related EVs / recommendations** | Section-only empty or omit section; detail content remains |
| **Search page / autocomplete** | Empty/zero-result fallbacks per [`SEARCH.md`](./SEARCH.md) (`fallbacks`, brands, articles); Browse still works |
| **Compare** | Compare error/empty only on `/compare`; vehicle pages unaffected |
| **Browse / Articles lists** | Empty state with clear filters / browse CTA; pagination shell remains |

---

## 4. Trusted-data fallbacks (anti-misinformation)

| Field situation | Allowed | Forbidden |
| :--- | :--- | :--- |
| Missing price / range / battery | “Not available”, “—”, hide row | Estimated or “typical” invented numbers |
| Missing image | Brand/placeholder pattern already used on site | Broken `<img>` layout shift without aspect ratio |
| Stale cache vs write | Rely on Phase 4 invalidation / TTL; accept short staleness within TTL | Show Admin draft as Published |
| Zero search hits | Informative fallback payload ([`SEARCH.md`](./SEARCH.md) §5) | Fake “top match” vehicles |

---

## 5. Retry & cold-start policy (do not reinvent)

- Prefer existing `httpErrorInterceptor` bounded retry for transient `0/502/503/504`.
- Opt out only via `DISABLE_HTTP_RETRY` / override via `HTTP_TIMEOUT_MS` with a documented reason.
- While retrying suspected Render wake: keep waking UX / diagnostics — do not replace with a blank spinner.
- Compare already documents waking copy; new features should reuse the same conceptual language, not invent conflicting timers.

---

## 6. Maintenance mode

When `MAINTENANCE_MODE=true` ([`RELIABILITY.md`](./RELIABILITY.md)):

- Public API → `503` + `SERVICE_MAINTENANCE`
- Frontend surfaces treat as backend unavailable (retryable server category)
- `/api/health*` and admin bypass remain for ops

---

## 7. Acceptance bar for failure UX

A feature is not merge-ready until:

- [ ] All six AsyncState outcomes are handled for its primary fetch(es)
- [ ] No path leaves `loading` indefinitely
- [ ] Failure of this feature cannot blank locked core routes (`/`, `/evs`, `/ev/...`, `/articles`, `/search`)
- [ ] User messages follow `messageFor()` categories (professional, actionable — not raw stack traces)
- [ ] Request ID available for support when an HTTP error response exists

See also [`FEATURE_ACCEPTANCE_CHECKLIST.md`](./FEATURE_ACCEPTANCE_CHECKLIST.md) · [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md) (§§8–10 lifecycle / rollback / deprecation) · [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md).
