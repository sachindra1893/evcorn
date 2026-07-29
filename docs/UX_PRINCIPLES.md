# EVCorn UX Principles (Phase 5)

> **Document Status:** Active UX Principles for Future Features (Phase 5 Architecture)  
> **Version:** 1.0.0  
> **Parent:** [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md)  
> **Important:** These principles guide **future** work. They do **not** authorize redesigning current pages in Phase 5.

---

## 1. Product context

EVCorn helps people discover, compare, and understand electric vehicles and editorial content.

Primary public routes today:

| Route | Role |
| :--- | :--- |
| `/` | Home — discovery entry |
| `/evs` | Browse catalog |
| `/ev/:brandSlug/:modelSlug` | Vehicle (variant) detail |
| `/articles`, `/articles/:id` | Editorial |
| `/search` | Unified search |
| `/compare` | Side-by-side compare |
| `/energy`, `/about`, info pages | Secondary |
| `/admin`, `/login` | Ops — not shopper chrome |

Future features should deepen these jobs — not add competing global navigation paradigms.

---

## 2. Principles for future UI

### 2.1 Clean UI, one job per section

- Each new section has **one purpose**, one clear heading, one short supporting line when needed.
- Prefer the existing visual language (spacing, type, muted empty states) over introducing a second design system.
- Avoid dashboard clutter on marketing/discovery surfaces: no stat strips, badge piles, or multi-widget chrome in the first viewport of a new landing experience unless the surface is explicitly a tool (Compare, quiz).

### 2.2 Minimal navigation

- Do not add top-level nav items unless the feature is a primary shopper job.
- Prefer in-context entry (from vehicle detail → compare / related / search) over global sprawl.
- Admin tools stay under `/admin` — never leak into public nav.

### 2.3 Clear CTAs

- Primary action labeled with outcome (“Browse EVs”, “Compare selected”, “View details”).
- Empty and error states include **one** recovery CTA when possible (`app-empty-state` action pattern).
- Do not trap users on failed optional sections — page must remain scannable.

### 2.4 Consistent spacing & hierarchy

- Match existing section padding, card/list rhythm, and heading levels (single `<h1>` per page — [`SEO.md`](./SEO.md)).
- New components should look native next to Browse / Detail / Articles, not like a third-party widget.

### 2.5 Mobile-first

- Touch targets usable on narrow viewports; compare/filter UIs must not require horizontal-only desktop assumptions without a mobile plan.
- Prefer `?light=` payloads and optimized images on mobile networks.
- Test critical paths at mobile width in Playwright or manual spot-check before merge.

### 2.6 Accessibility

- Meaningful `role="status"` / live regions for empty and offline patterns (already used by empty-state and offline banner).
- Buttons for actions; links for navigation.
- Do not rely on color alone for error vs success.
- Preserve keyboard access for search, compare selection, and dialogs/trays.
- Images: alt text from vehicle/article titles where available.

### 2.7 Fast interactions

- Optimistic UI only when data cannot become misleading (e.g. UI selection chrome — never optimistic **prices**).
- Debounce search autocomplete; avoid request storms.
- Use rAF/throttling for scroll/parallax-style listeners (Home already throttles mousemove).
- Exit loading promptly into AsyncState terminals ([`FAILURE_HANDLING_MATRIX.md`](./FAILURE_HANDLING_MATRIX.md)).

### 2.8 Trust & honesty

- Specs and prices only from trusted API fields.
- Missing data → explicit unavailable treatment, never fabricated.
- Cold-start / waking messaging stays honest (“takes about 30 seconds” class copy already used on Compare) — do not promise instant backend wake.

---

## 3. Content & SEO UX

- Public pages keep unique titles/descriptions; new indexable routes wire `SeoService` / schema where applicable.
- Zero-result search keeps helpful fallbacks ([`SEARCH.md`](./SEARCH.md)) — never a dead end.
- Do not `noindex` shopper-valuable pages accidentally; keep `/admin` and `/login` out of SEO surfaces.

---

## 4. Motion

- Motion supports hierarchy and feedback (load settle, tray open), not decoration spam.
- Respect existing site motion density; new features should add at most subtle, purposeful transitions.

---

## 5. What Phase 5 does *not* change

- No visual redesign of Home, Browse, Detail, Articles, Search, or Compare in this phase.
- No new design tokens package or dependency.
- Implementation phases may iterate UI **within** these principles and existing patterns.

---

## 6. Related docs

- [`FAILURE_HANDLING_MATRIX.md`](./FAILURE_HANDLING_MATRIX.md)  
- [`SEO.md`](./SEO.md)  
- [`PERFORMANCE_BUDGET.md`](./PERFORMANCE_BUDGET.md)  
- [`FEATURE_ACCEPTANCE_CHECKLIST.md`](./FEATURE_ACCEPTANCE_CHECKLIST.md)  
- [`PRODUCT_EXPERIENCE_ARCHITECTURE.md`](./PRODUCT_EXPERIENCE_ARCHITECTURE.md) — umbrella + lifecycle  
- [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md)  
