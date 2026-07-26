# EVCorn Enterprise Analytics, Business Intelligence & Growth Infrastructure Standard

> **Document Status:** Active Growth Analytics Standard (Phase 12 Complete)  
> **Version:** 1.0.0  

---

## 1. Centralized Analytics Architecture

All frontend tracking operations funnel strictly through a single decoupled service: `AnalyticsService` (`frontend/src/app/services/analytics.service.ts`).
- **No Scattered Tracking:** View components delegate event tracking directly to `AnalyticsService` without inline HTTP or third-party SDK calls.
- **Asynchronous Non-Blocking Dispatch:** Events are pushed asynchronously to `/api/analytics/event` with silent error handling to ensure zero impact on user interaction or page load performance.

---

## 2. Standardized Event Catalog

| Event Name | Trigger Context | Metadata Payload |
| :--- | :--- | :--- |
| **`page_view`** | Automated on Angular `NavigationEnd` | `{ url: string }` |
| **`article_view`** | Article detail page load | `{ articleId, title, categoryId }` |
| **`vehicle_view`** | Vehicle spec view | `{ vehicleId, name, brand }` |
| **`vehicle_compare`** | Compare tray vehicle submission | `{ vehicleIds: string[], count: number }` |
| **`search`** | Global search submission | `{ searchTerm, resultCount, zeroResult: boolean }` |
| **`calculator_usage`** | Solar ROI / Charging calculator execution | `{ calculatorType, inputs }` |
| **`error_404`** | Non-existent route navigation | `{ attemptedUrl: string }` |

Standard Event Header: `timestamp` (ISO string), `pageUrl`, `deviceType` (`desktop` | `mobile` | `tablet`), `referrer`.

---

## 3. Business Intelligence & Admin Telemetry APIs

The backend Analytics Engine (`backend/controllers/analytics.controller.js`) exposes 4 growth endpoints:

1. **`POST /api/analytics/event`:** Ingests privacy-conscious tracking payload.
2. **`GET /api/analytics/overview`:**
   - Content Totals: `totalArticles`, `publishedArticles`, `draftArticles`, `totalVehicles`, `totalBrands`.
   - Traffic Performance: `totalEvents`, `totalPageViews`, `dailyViews`, `weeklyViews`, `monthlyViews`.
3. **`GET /api/analytics/top-content`:** Most viewed articles, most viewed vehicles, and most compared vehicle pairs (e.g. `"Nexon EV vs Punch EV"`).
4. **`GET /api/analytics/search-queries`:** Top search terms and zero-result search terms.

---

## 4. Privacy & Compliance Strategy (Zero PII)

EVCorn adheres to strict privacy-by-design principles:
- ❌ **No PII Collection:** Passwords, emails, user names, and exact IP addresses are **never** logged or stored.
- ❌ **No Third-Party Cookies:** Zero tracking cookies or third-party DOM trackers are injected into the user browser.
- 🛡️ **Anonymized Metadata:** Device classification uses coarse viewport width breakpoints (`desktop`, `tablet`, `mobile`).

---

## 5. Third-Party Provider Adapter Roadmap

`AnalyticsService` is engineered using the Adapter Pattern to allow instant plug-and-play activation of third-party analytics providers in future phases:
- **Google Analytics 4 (GA4):** Dispatch via `gtag('event', eventName, metadata)`.
- **Plausible / PostHog:** Dispatch via lightweight privacy proxies.
- **Microsoft Clarity:** Visual heatmaps and session replay integration.
