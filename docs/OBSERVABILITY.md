# EVCorn Enterprise Observability, Monitoring & Operational Excellence Standard

> **Document Status:** Active Operational Standard (Phase 7 Complete)  
> **Version:** 1.0.0  

---

## 1. Structured Logging & Request Correlation Architecture

- **Correlation ID:** Every request is tagged with a unique `x-request-id` (UUIDv4) attached via `requestIdMiddleware`.
- **Log Levels:** `info`, `warn`, `error`, `debug`, `audit`.
- **Secret Redaction:** Passwords, JWT secrets, and tokens are automatically stripped from log context metadata.
- **Log Format:**
  ```text
  [INFO] 2026-07-26T16:45:00.000Z [reqId:8f3c7e12-4b2a-4a5c-890a-1a2b3c4d5e6f] - HTTP GET /api/vehicles 200 42ms {"reqId":"8f3c7e12-4b2a-4a5c-890a-1a2b3c4d5e6f","ip":"::1","status":200,"durationMs":42}
  ```

---

## 2. Slow Query Threshold Monitoring

All MongoDB repository interactions are wrapped using `measureQuery(operationName, queryFn, meta)` (`backend/utils/slowQuery.utils.js`):
- Threshold: **100ms** (`SLOW_QUERY_THRESHOLD_MS = 100`).
- Any query exceeding 100ms triggers an automated `[WARN]` log containing the operation name, execution duration, and query filter criteria for index optimization.

---

## 3. Production Health Check & Readiness Endpoints

| Endpoint | HTTP Status | Response Payload | Operational Purpose |
| :--- | :--- | :--- | :--- |
| **`GET /api/health`** | `200 OK` | `{ status: 'UP', environment, database, metrics }` | Full cluster status & process telemetry |
| **`GET /api/health/live`** | `200 OK` | `{ status: 'UP', timestamp }` | Kubernetes / Render liveness probe |
| **`GET /api/health/ready`** | `200 / 503` | `{ status: 'READY', database }` | Load Balancer readiness check (MongoDB active) |
| **`GET /api/metrics`** | `200 OK` | `{ success: true, data: { uptime, totalRequests, errorRate, avgResponseTimeMs, memory, nodeVersion, pid } }` | Application performance telemetry |

---

## 4. Error Handling & Operational Classification

- **Operational Errors (`isOperational: true`):** Client errors (validation, 404, invalid auth) are logged with context and returned formatted as `{ success: false, requestId, error: { code, message } }`.
- **Programmer Errors (`isOperational: false`):** Unexpected exceptions (500) hide internal stack traces in production mode (`NODE_ENV === 'production'`).

---

## 5. Conditional Request & ETag 304 Revalidation

- `conditionalRequestMiddleware` intercepts GET requests carrying client `If-None-Match` headers.
- If the computed `ETag` matches `If-None-Match`, the server immediately terminates response with `304 Not Modified` and 0-byte payload body transfer.

---

## 6. Process Monitoring & Graceful Shutdown

- **Process Signals (`SIGTERM`, `SIGINT`):** Gracefully stops the HTTP server, waits for pending requests to finish, cleanly closes the MongoDB Mongoose connection (`mongoose.connection.close()`), and exits with code `0`.
- **Exception Guards:** `uncaughtException` logs and triggers graceful shutdown. `unhandledRejection` is logged with structured context (does not force process exit — avoids cascading restarts from a single rejected promise).

---

## 7. Startup Configuration Audit

- `validateEnv()` in `backend/config/env.js` validates `PORT` and, in **production**, **fails fast** if:
  - `ADMIN_PASSWORD` is missing or still the default `admin`
  - `JWT_SECRET` is missing or still the built-in insecure default
  - `MONGO_URI` is missing unless `ALLOW_FILE_DB_IN_PRODUCTION=true`
- Incomplete Cloudinary credentials emit a **warning** (uploads degrade) but do not block boot.
- See [`PHASE_6.md`](./PHASE_6.md) for the ops runbook.
