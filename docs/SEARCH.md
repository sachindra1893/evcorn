# EVCorn Enterprise Search, Recommendation Engine & Content Discovery Standard

> **Document Status:** Active Content Discovery Standard (Phase 13 Complete)  
> **Version:** 1.0.0  

---

## 1. Unified Search Architecture

EVCorn provides a centralized search engine via `SearchService` (`backend/services/search.service.js`):
- **Cross-Collection Querying:** Queries vehicles, categories, and articles concurrently.
- **Backward-Compatible Endpoints:**
  - `GET /api/search/unified?q={query}`
  - `GET /api/search/autocomplete?q={query}`
  - `GET /api/search/recommendations`
  - `GET /api/search/trending`

---

## 2. Search Relevance & Ranking Strategy

Relevance score calculation combines term matching with content freshness:
1. **Exact Match (+10 pts):** Query string matches exact vehicle or article name.
2. **Prefix Match (+5 pts):** Query starts with target string (`RegExp('^term', 'i')`).
3. **Partial Match (+2 pts):** Substring match in title, description, or parentModel.
4. **Popularity & Recency Boost:** Articles ordered by `createdAt: -1` and high-demand vehicle categories prioritised.

---

## 3. Fast Autocomplete Engine

The autocomplete endpoint (`GET /api/search/autocomplete?q=term`) returns a lightweight array capped at **8 items**:
- **Brand / Category Suggestions:** `{ type: 'brand', title: 'Tata', url: '/evs?category=tata' }`
- **Vehicle Suggestions:** `{ type: 'vehicle', title: 'Nexon EV', url: '/ev/tata/nexon-ev', imageUrl }`
- **Article Suggestions:** `{ type: 'article', title: 'Tata Nexon EV Charging Guide', url: '/articles/...', imageUrl }`

---

## 4. Deterministic Recommendation Engine

`RecommendationService` (`backend/services/recommendation.service.js`) generates explainable recommendations using rule-based scoring:
- **Vehicle-to-Vehicle:** Recommends models sharing the same `brand` or `categoryId`, scored by category similarity (+5) and brand match (+3).
- **Article-to-Article:** Recommends related articles within the same category.

---

## 5. Zero-Result Experience & Fallbacks

When a query yields 0 matching results:
- Returns an informative fallback payload with `fallbacks`:
  - `message`: `"No direct matches found for {q}. Explore top EV brands and guides below:"`
  - `recommendedBrands`: Top EV category brands.
  - `suggestedArticles`: Recent trending EV buying guides.

---

## 6. Privacy-Friendly Recent History

User recent viewing history is managed client-side via `RecentHistoryService` (`frontend/src/app/services/recent-history.service.ts`):
- **Storage:** Saved exclusively in `window.localStorage` (`evcorn_recent_history`).
- **Cap:** Maximum 10 items.
- 🛡️ **Zero Server Tracking:** Server remains completely stateless regarding user browser history.

---

## 7. Future MongoDB Atlas Search Migration Roadmap

For future scalability when catalog expands to 10,000+ vehicles:
1. **Atlas Search Indexing:** Transition from Mongoose regex to MongoDB Atlas Lucene indexes (`$search`).
2. **Fuzzy Search & Typo Tolerance:** Auto-correct common typos (e.g. `"Nexun"` $\rightarrow$ `"Nexon"`).
3. **Synonym Dictionaries:** Mapping EV terms (e.g. `"battery car"` $\rightarrow$ `"Electric Vehicle"`).
