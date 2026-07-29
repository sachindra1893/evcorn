# Phase 5.2 Search Prototype — Archived Notes

> **Status:** Prototype removed from production paths (uncommitted work discarded / restored to pre–5.2 `main`).  
> **Purpose:** Capture reusable ideas only. Do **not** re-import deleted modules as dead code.

## What was attempted

Deterministic (non-LLM) “intelligent search” on top of existing unified search:

- **Intent parser** (`searchIntent.js`): map NL-ish queries → structured filters/sort  
  (price ceilings in lakh, min range km, body style, seating/family/city heuristics, charging sort).
- **Match / fuzzy helpers** (`searchMatch.js`): tokenization, field scoring, optional typo expand behind `FLAG_ENABLE_ADVANCED_SEARCH`.
- **Autocomplete intent templates**: e.g. `rang` → “Longest Range EV”; `sport` → sports-car intent.
- **Frontend discovery UX**: redesigned `/search` view, `discovery-search.service`, `recent-searches`, highlight helpers.
- **Seed enrichment**: article `keywords`/`tags`; MG Cyberster vehicle for sports-intent demos.
- **Flag**: `FLAG_ENABLE_INTELLIGENT_SEARCH` (never shipped on `main`).

## Lessons

1. Keep basic unified search (`/api/search/unified`, `/autocomplete`) stable; layer intent as an optional server module with clear feature flags.
2. Attribute intents need indexed fields (`pricing`, `performance.claimedRangeKM`, `bodyStyle`) — don’t rely only on text scoring.
3. Autocomplete should distinguish `type: 'intent'` templates from brand/vehicle/article hits to avoid UX confusion.
4. Seed-only demo vehicles/tags create test fragility; prefer fixtures in tests over production seed pollution.
5. Frontend recent-search storage is fine product-wise, but should not ship with an unfinished redesign that replaces the working basic search page.

## Restored baseline

Production search returned to **pre–5.2** behavior on `main` (Phase 13 unified search + Phase 4 cache projections + basic Angular search view). Compare / Phase 5.1 left intact.

## Do not resurrect by copy-paste

Deleted prototype paths (reference only):

- `backend/utils/searchIntent.js`, `backend/utils/searchMatch.js`
- `backend/tests/unit/searchIntent.test.js`, `searchMatch.test.js`
- `frontend/src/app/services/discovery-search.service.ts`
- `frontend/src/app/services/recent-searches.service.ts` (+ spec)
- `frontend/src/app/search/highlight.ts` (+ spec)
- `e2e/search.spec.ts` (intent-focused expansion)

Re-implement from these notes + product requirements if Search v2 is prioritized again.
