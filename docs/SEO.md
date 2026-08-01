# EVCorn Enterprise SEO, Discoverability & Search Optimization Standard

> **Document Status:** Active SEO & Search Engine Optimization Standard (Phase 7.1 + 7.2 AEO + 7.3 Entity Graph)  
> **Version:** 1.2.0  

---

## 1. Technical SEO Audit Summary

| Component | Status | Strategy |
| :--- | :--- | :--- |
| **Title Tags** | **Dynamic** | `{Page / Vehicle / Article Title} \| EVCorn` via `formatSeoTitle` (no double suffix) |
| **Meta Descriptions** | **Dynamic** | Unique descriptions; clamped to ≤160 chars (`formatMetaDescription`) |
| **Canonical URLs** | **Enforced** | Production origin `https://evcorn.com`; query stripped unless `keepQuery` |
| **Open Graph (OG)** | **Enforced** | title, description, image, image:alt, url, type, site_name, locale |
| **Twitter Cards** | **Enforced** | `summary_large_image` + title/description/image/image:alt |
| **Robots Directives** | **Enforced** | Public `index,follow,max-image-preview:large`; noindex admin/login/404/search?q |
| **Semantic HTML5** | **Compliant** | Single `<h1>` per page with hierarchical headings |

---

## 2. Services

| Service | Role |
| :--- | :--- |
| `SeoService` | Title, meta description, robots, OG, Twitter, canonical, optional `rel=prev/next` |
| `SchemaService` | JSON-LD: Organization, WebSite, WebPage, CollectionPage, SearchResultsPage, BreadcrumbList, Article, Product/Car, Brand, FAQPage, ImageObject |
| `seo.utils` / `seo.constants` | Shared production origin, title/description/canonical helpers |
| Entity Graph (7.3) | Stable ids, canonical hrefs, page graphs → optional `@id` / Brand / `about` / `isRelatedTo` / `mentions` inputs for SchemaService |

```typescript
this.seoService.updateSeo({
  title: 'Tata Nexon EV Long Range Specs & Pricing',
  description: 'Detailed specs, battery capacity, range, and pricing for Tata Nexon EV in India.',
  image: 'https://res.cloudinary.com/.../nexon.jpg',
  type: 'article',
  author: 'EVCorn Editorial Team',
  publishDate: '2026-07-26T00:00:00.000Z'
});
```

---

## 3. Structured Data JSON-LD

All dynamic schemas use `data-dynamic="true"` and are replaced on navigation:

1. **Organization & WebSite** — home (+ static shell in `index.html`) with SearchAction  
2. **BreadcrumbList** — detail & hub pages  
3. **Article** — article detail with ImageObject  
4. **Product + Car** — vehicle detail (`buildVehicle`); optional `@id`, Brand ref, capped `isRelatedTo` from Entity Graph  
5. **Brand** — vehicle detail when Entity Graph provides brand node (`buildBrand`)  
6. **FAQPage** — `/faqs` and article FAQ blocks (AEO vehicle FAQs / article block-renderer ownership unchanged)  
7. **CollectionPage / WebPage** — hubs and info pages  

Entity Graph enhancements are optional: if the graph is empty or throws, Phase 7.1 base Product/Article/FAQ JSON-LD still emits.

---

## 4. Sitemap & Robots

- **`robots.txt`:** Allow `/`; Disallow `/admin`, `/login`, `/api/`; Sitemap → `https://evcorn.com/sitemap.xml`
- **Build generator:** `frontend/generate-sitemap.js` (static hubs + articles + unique `/ev/:brand/:model`)
- **API:** `GET /api/sitemap.xml` via `backend/utils/sitemap.js` (same shape)
- **Excluded:** admin, login, dead `/charging`

---

## 5. Validation

```bash
npm run seo:check          # static dist gates
npx playwright test e2e/seo.spec.ts
```

---

## 6. Phase 7.2 (AEO)

**Shipped (M1–M4):** FE pure AEO engine at `frontend/src/app/aeo/` derives `AeoPageModel` from existing Vehicle/Article DTOs (no CMS/DB duplicate). Cache key `entityId|updatedAt` with LRU bound. Vehicle + article detail render answer chrome (spacing/hierarchy, mobile, a11y, rebuild guards); Related* DTO inputs come from RecommendationService at the wire layer; vehicle FAQs feed `SchemaService.buildFAQ`; article FAQPage stays with block-renderer. Playwright: `e2e/aeo.spec.ts`. Phase 7.1 meta/JSON-LD ownership unchanged.

See `artifacts/PHASE_7_2_AEO_ARCHITECTURE.md`, `PHASE_7_2_FINAL_AUDIT.md`.

**Deferred:** ops feature-flag registry, SSR/prerender for AI crawlers, compare-page AEO chrome (architecture non-goal for v1).

---

## 7. Phase 7.3 (Entity & Knowledge Graph)

**Shipped (M1–M4):** derived Entity Graph layer at `frontend/src/app/entity/`.

| Milestone | Outcome |
| :--- | :--- |
| M1 | Stable entity ids + `entity-href` SSOT + relationship `*Ids` normalize |
| M2 | Page-scoped graphs; AEO Related*/InternalLink/Compare consume graph hrefs; editorial > recommendation merge |
| M3 | Schema bridge → `@id`, Brand, `about` / `isRelatedTo` / `mentions`; caps ≤6 vehicles / ≤4 articles; Playwright SEO entity-linking asserts |
| M4 | Entity Graph LRU cache; search + internal-link URL alignment via entity-href; inverse Vehicle→Articles deferred; hardening + scale audit |

**Ownership:** SeoService / SchemaService / AeoEngine / RecommendationService ranking **unchanged**. EKG prepares identity, edges, and schema inputs only.

**Lifecycle / data flow:** Detail pages load CMS + RecommendationService slate → `getOrBuild*PageGraph` (LRU) → AEO + `safe*SchemaFromGraph` → SchemaService/SeoService. Failure isolation: empty/throwing graph omits enhanced links only.

**Scalability:** Page-local + capped related only — no full-catalog graph, no recursive site crawl. See `artifacts/PHASE_7_3_ENTITY_ARCHITECTURE.md`, `artifacts/PHASE_7_3_M4_HARDENING.md`.

**Deferred:** inverse Vehicle→Articles index, Neo4j, Redis adjacency, author pages, article slug routes as primary `@id`.

---

## 8. Search Console checklist

- [ ] Verify `evcorn.com`  
- [ ] Submit `https://evcorn.com/sitemap.xml`  
- [ ] Monitor Core Web Vitals  
- [ ] Validate rich results on vehicle + FAQ URLs  
