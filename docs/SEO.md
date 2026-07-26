# EVCorn Enterprise SEO, Discoverability & Search Optimization Standard

> **Document Status:** Active SEO & Search Engine Optimization Standard (Phase 10 Complete)  
> **Version:** 1.0.0  

---

## 1. Technical SEO Audit Summary

| Component | Status | Strategy |
| :--- | :--- | :--- |
| **Title Tags** | **Dynamic** | Dynamic data-driven format: `{Page / Vehicle / Article Title} \| EVCorn` |
| **Meta Descriptions** | **Dynamic** | 150-160 character unique descriptions generated for every page |
| **Canonical URLs** | **Enforced** | Self-referencing `<link rel="canonical">` stripping non-essential query strings |
| **Open Graph (OG)** | **Enforced** | `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name` |
| **Twitter Cards** | **Enforced** | `twitter:card="summary_large_image"`, `twitter:site="@EVCorn"` |
| **Robots Directives** | **Enforced** | Allow public pages; disallow `/admin`, `/login`, `/api/auth`, `/api/upload` |
| **Semantic HTML5** | **Compliant** | Single `<h1>` per page with hierarchical `<h2>` and `<h3>` tags |

---

## 2. Dynamic Metadata & Social Card Matrix

```typescript
// Example dynamic metadata call via SeoService:
this.seoService.updateSeo({
  title: 'Tata Nexon EV Long Range Specs & Pricing',
  description: 'Detailed specs, battery capacity, range, and pricing for Tata Nexon EV.',
  image: 'https://res.cloudinary.com/kuu2880f/image/upload/w_1200,f_auto,q_auto/v1/nexon.jpg',
  type: 'article',
  author: 'EVCorn Editorial Team',
  publishDate: '2026-07-26T00:00:00.000Z'
});
```

---

## 3. Structured Data JSON-LD Implementation Report

All dynamic schemas are generated via `SchemaService` and injected cleanly into the `<head>` with `data-dynamic="true"` attribute:

1. **`Organization` & `WebSite`:** Injected globally with `SearchAction` (`urlTemplate: https://evcorn.com/search?q={search_term_string}`).
2. **`BreadcrumbList`:** Injected on all detail & inner pages to generate Search Result Breadcrumb snippets.
3. **`NewsArticle` / `Article`:** Full schema with `headline`, `author`, `publisher`, `logo`, `datePublished`, `dateModified`.
4. **`Product` (Vehicle):** Structured specifications (`brand`, `price`, `offers`, `batteryCapacity`, `range`, `chargingTime`).
5. **`FAQPage`:** Injected on FAQ and spec pages for Google FAQ rich snippets.

---

## 4. Sitemap & Robots.txt Architecture

- **`robots.txt` (`public/robots.txt`):**
  ```text
  User-agent: *
  Allow: /
  Disallow: /admin
  Disallow: /login
  Disallow: /api/auth
  Disallow: /api/upload

  Sitemap: https://evcorn.com/sitemap.xml
  ```
- **Sitemap Generator (`generate-sitemap.js`):**
  Auto-builds `public/sitemap.xml` during frontend build, incorporating static routes (`1.0` and `0.8` priority) and active article URLs (`0.7` priority).

---

## 5. AI Search & LLM Discoverability Readiness

EVCorn is optimized for AI search engines (Perplexity, ChatGPT Search, Gemini):
1. **Clear Entity Definitions:** Every vehicle model and article explicitly maps entities (`Brand`, `Model`, `Variant`, `Battery`, `Range`, `Price`).
2. **Structured JSON-LD Data:** Allows LLM crawlers to instantly parse specs without DOM scraping errors.
3. **Internal Topical Linking:** Cross-linking related articles, vehicle comparison trays, and charging guides establishes high topical authority in the Indian EV ecosystem.

---

## 6. Google Search Console & Bing Webmaster Verification Checklist

- [ ] **Verification File / Tag:** Deploy HTML tag or TXT record for `evcorn.com`.
- [ ] **Sitemap Submission:** Submit `https://evcorn.com/sitemap.xml` in Search Console.
- [ ] **Core Web Vitals Monitoring:** Track LCP, CLS, and INP metrics in Search Console dashboard.
- [ ] **Rich Results Test:** Validate JSON-LD markup on [Google Rich Results Test](https://search.google.com/test/rich-results).

---

## 7. Remaining Technical Debt & Opportunities

1. **Multilingual Hreflang:** Add `hreflang` alternate tags when adding Hindi / regional Indian language EV guides.
2. **Dynamic Vehicle Variant Routes in Sitemap:** In a future phase, expand sitemap generation to include `/ev/:brandSlug/:modelSlug` vehicle URLs.
