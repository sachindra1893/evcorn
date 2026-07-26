# EVCorn Enterprise Security, Authentication & Hardening Standard

> **Document Status:** Active Security Policy (Phase 4 Complete)  
> **Version:** 1.0.0  

---

## 1. Authentication & JWT Token Flow

EVCorn implements a **Dual-Mode Admin Authentication System** designed for security and seamless backward compatibility:

1. **JWT Bearer Authentication (Recommended):**
   - Admin logs in via `POST /api/auth/login`.
   - On success, server issues a signed JSON Web Token (JWT) with 24-hour expiration (`JWT_EXPIRES_IN=24h`).
   - Admin requests include `Authorization: Bearer <jwt_token>`.
2. **Legacy Password Verification (Backward Compatible):**
   - Direct requests with `x-admin-password: <password>` header remain verified for existing admin panel components.

---

## 2. Authorization Boundary Matrix

| Endpoint | Method | Permission Level | Rate Limit |
| :--- | :--- | :--- | :--- |
| `GET /api/vehicles` | GET | **Public** | `apiLimiter` (300 req / 15m) |
| `GET /api/vehicles/:id` | GET | **Public** | `apiLimiter` (300 req / 15m) |
| `POST /api/vehicles` | POST | **Admin Auth Required** | Standard |
| `DELETE /api/vehicles/:id` | DELETE | **Admin Auth Required** | Standard |
| `GET /api/articles` | GET | **Public** | `apiLimiter` (300 req / 15m) |
| `POST /api/articles` | POST | **Admin Auth Required** | Standard |
| `POST /api/upload` | POST | **Admin Auth Required** | `uploadLimiter` (30 req / 15m) |
| `POST /api/auth/login` | POST | **Public** | `authLimiter` (10 req / 15m) |

---

## 3. Security Middlewares Implemented

### 🛡️ Helmet Security Headers
- `X-Frame-Options: SAMEORIGIN` (Clickjacking defense)
- `X-Content-Type-Options: nosniff` (MIME sniffing defense)
- `X-XSS-Protection: 0` (Modern XSS auditor handling)
- `Strict-Transport-Security` (HSTS enforced)
- `Referrer-Policy: no-referrer-when-downgrade`

### 🔒 Strict CORS Policy
- Configured in `backend/config/cors.js`.
- Whitelisted Origins: `https://evcorn.com`, `https://www.evcorn.com`, `https://evcorn.vercel.app`, `http://localhost:4200`, and Vercel preview domains (`*.vercel.app`).
- Restricts unapproved external origin requests.

### 🛑 Rate Limiting (`express-rate-limit`)
- **Public API Limiter:** 300 requests per 15-minute window.
- **Admin Login Limiter:** 10 requests per 15-minute window (Brute-Force Lockout Defense).
- **Media Upload Limiter:** 30 requests per 15-minute window.

### 🧹 MongoDB Operator Injection Sanitizer (`sanitize.middleware.js`)
- Recursively strips any keys starting with `$` or containing invalid injection operators in `req.body`, `req.query`, and `req.params`.

---

## 4. File Upload Security

- **File Type Whitelist:** Only `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif` permitted.
- **File Size Limit:** Hard limit of **10MB** per upload.
- **In-Memory Streaming:** Buffer processing without temporary disk writes.

---

## 5. Audit Logging & Leakage Protection

- **Audit Logs:** All admin logins, login failures, vehicle mutations, article creations, and image deletions are logged with timestamp and IP address (passwords and tokens are stripped).
- **Error Information Leakage Guard:** In production (`NODE_ENV === 'production'`), error responses return clean code and message without stack traces or internal database paths.
