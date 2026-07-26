# EVCorn Enterprise Admin Experience, Productivity & Operations Standard

> **Document Status:** Active Admin Operations Standard (Phase 14 Complete)  
> **Version:** 1.0.0  

---

## 1. Admin Operations Architecture

The EVCorn Admin Operations layer provides lightweight management tools for scaling catalog data across thousands of vehicles, articles, and media assets:
- **`AdminController` (`backend/controllers/admin.controller.js`):** Ingests dashboard metrics, activity streams, media asset tracking, bulk mutations, and CSV/JSON export routines.
- **`AdminPreferencesService` (`frontend/src/app/services/admin-preferences.service.ts`):** Client-side persistence for admin table pagination (`pageSize`), column sorting preferences, and category filter selections.

---

## 2. Dashboard Operational Telemetry (`GET /api/admin/dashboard`)

Returns operational health metrics:

```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalVehicles": 12,
      "totalArticles": 8,
      "publishedArticles": 6,
      "draftArticles": 2,
      "totalBrands": 5,
      "totalCategories": 5
    },
    "systemHealth": {
      "status": "HEALTHY",
      "uptimeSeconds": 3420,
      "memoryUsageMB": 64
    },
    "recentActivity": [
      { "action": "ADMIN_LOGIN", "user": "admin", "timestamp": "2026-07-26T18:00:00.000Z" }
    ]
  }
}
```

---

## 3. Bulk Operations Engine (`POST /api/admin/bulk`)

Supports atomic multi-record actions:
- `bulk_publish`: Batch transition article status to `'published'` & `active: true`.
- `bulk_archive`: Batch transition article status to `'archived'` & `active: false`.
- `bulk_category_update`: Batch update target category (`categoryId`).

Payload Schema:
```json
{
  "action": "bulk_publish",
  "ids": ["66a2...", "66a3..."]
}
```

---

## 4. Import & Export Engine (`GET /api/admin/export`)

- **JSON Export (`/api/admin/export?entity=articles&format=json`):** Full entity schema dump for backups.
- **CSV Export (`/api/admin/export?entity=articles&format=csv`):** Formatted CSV file download with `Content-Disposition` header.

---

## 5. Activity Log Stream & Media Asset Management

- **Activity Timeline (`GET /api/admin/activity`):** Audit stream recording logins, publications, edits, and bulk mutations.
- **Media Asset Library (`GET /api/admin/media`):** Aggregates Cloudinary asset references across vehicles and articles for usage tracking and orphan image detection.
