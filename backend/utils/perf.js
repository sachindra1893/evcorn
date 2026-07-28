/**
 * Request-scoped performance tracing (diagnostic only, near-zero overhead).
 *
 * Uses AsyncLocalStorage so any layer (middleware/controller/service/repository)
 * can record a named checkpoint via `mark()` without threading a timing object
 * through every function signature. `buildServerTimingHeader()` turns the marks
 * into a standard `Server-Timing` response header, which Chrome DevTools /
 * the Resource Timing API surface natively in the Network waterfall — no
 * custom client-side tooling needed to read it.
 *
 * Enabled unconditionally: `process.hrtime.bigint()` + a small array push per
 * request is sub-microsecond overhead, safe to leave on in production for
 * ongoing observability.
 */
const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

function startTrace() {
  const t0 = process.hrtime.bigint();
  als.enterWith({ t0, marks: [{ label: 'start', t: t0 }] });
}

function mark(label) {
  const store = als.getStore();
  if (!store) return;
  store.marks.push({ label, t: process.hrtime.bigint() });
}

/**
 * Wraps an async/sync function call with automatic start/end marks.
 * Usage: await time('mongo_query', () => repo.findById(id))
 */
async function time(label, fn) {
  mark(`${label}_start`);
  try {
    return await fn();
  } finally {
    mark(`${label}_end`);
  }
}

function sanitizeName(label) {
  return String(label).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Builds a `Server-Timing` header value: one segment per consecutive mark
 * delta, plus a `total` segment spanning the full trace.
 */
function buildServerTimingHeader() {
  const store = als.getStore();
  if (!store || store.marks.length < 2) return null;

  const segments = [];
  for (let i = 1; i < store.marks.length; i++) {
    const durMs = Number(store.marks[i].t - store.marks[i - 1].t) / 1e6;
    segments.push(`${sanitizeName(store.marks[i].label)};dur=${durMs.toFixed(2)}`);
  }
  const totalMs = Number(store.marks[store.marks.length - 1].t - store.t0) / 1e6;
  segments.push(`total;dur=${totalMs.toFixed(2)}`);
  return segments.join(', ');
}

/** Returns the raw {label, elapsedMs} list for logging/debugging. */
function getBreakdown() {
  const store = als.getStore();
  if (!store) return [];
  const out = [];
  for (let i = 1; i < store.marks.length; i++) {
    out.push({
      label: store.marks[i].label,
      elapsedMs: Number(store.marks[i].t - store.marks[i - 1].t) / 1e6
    });
  }
  return out;
}

module.exports = { startTrace, mark, time, buildServerTimingHeader, getBreakdown };
