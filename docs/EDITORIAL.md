# EVCorn Enterprise Editorial Workflow & Content Operations Standard

> **Document Status:** Active Editorial Standard (Phase 11 Complete)  
> **Version:** 1.0.0  

---

## 1. Editorial Workflow Lifecycle States

Every article transitions through explicit lifecycle states enforced at the repository and query builder layers:

```
┌───────────┐     ┌───────────┐     ┌─────────────┐     ┌───────────┐
│   DRAFT   │ ──> │ IN REVIEW │ ──> │  SCHEDULED  │ ──> │ PUBLISHED │
└───────────┘     └───────────┘     └─────────────┘     └─────┬─────┘
                                                              │
                                                              ▼
                                                        ┌───────────┐
                                                        │ ARCHIVED  │
                                                        └───────────┘
```

1. **`draft`:** Initial work-in-progress content. Invisible to public API endpoints.
2. **`in_review`:** Content submitted for editor-in-chief review. Invisible publicly.
3. **`scheduled`:** Approved content waiting for future publication date (`publishAt > Date.now()`). Automatically hidden from public endpoints until `publishAt` timestamp is reached.
4. **`published`:** Live public content visible on website and RSS feeds (`status: 'published'` and `publishAt <= Date.now()`).
5. **`archived`:** Delisted content retained for audit compliance. Invisible publicly.

---

## 2. Author Profile & Metadata Schema

Associated author sub-document attached to every article (`Article.author`):

```json
{
  "author": {
    "name": "EVCorn Editorial Team",
    "role": "EV Content Strategist",
    "bio": "Expert analysis on electric mobility, solar ROI, and battery technology in India.",
    "imageUrl": "https://evcorn.com/assets/images/authors/editor.jpg",
    "socialLinks": {
      "twitter": "https://twitter.com/EVCorn",
      "linkedin": "https://linkedin.com/company/evcorn"
    }
  }
}
```

---

## 3. Media Metadata & Cloudinary Reference Model

Standardized media sub-document for image governance (`Article.media`):

```json
{
  "media": {
    "url": "https://res.cloudinary.com/kuu2880f/image/upload/v1/ev-hero.jpg",
    "alt": "Tata Nexon EV Charging at Fast DC Station",
    "caption": "DC fast charging Tata Nexon EV from 10% to 80% in 56 minutes.",
    "credit": "Photo by EVCorn Media Team",
    "width": 1200,
    "height": 675,
    "public_id": "ev-hero"
  }
}
```

---

## 4. Content Validation Gatekeeper (`article.validator.js`)

Before any article status can be set to `'published'`, the validation middleware enforces mandatory quality prerequisites:
- **Title:** Required string.
- **Description:** Required string (minimum 10 characters).
- **Category:** Required valid `categoryId`.
- **Active State:** Must be `active: true`.

Unmet prerequisites reject the request with HTTP `400 Bad Request` (`INVALID_REQUEST_PAYLOAD`).

---

## 5. Audit Trail & Lightweight Revision History

- **Audit Metadata (`Article.audit`):**
  - `createdBy`, `updatedBy`, `publishedBy`, `publishedAt`, `archivedAt`.
- **Revision History (`Article.revisions`):**
  - Appends lightweight change log entries `{ updatedBy, updatedAt, summaryOfChanges }` without full Git overhead.

---

## 6. Content Relationships & Topical Authority

Articles link bidirectionally to relevant platform entities (`Article.relationships`):
- `relatedArticleIds`: Cross-links relevant articles for recommended reading.
- `relatedVehicleIds`: Links mentioned vehicle variants.
- `relatedBrandIds`: Links manufacturer brands (e.g. Tata, Mahindra, Hyundai, MG).
