/**
 * Unit tests: slow-request detection helpers + requestId middleware propagation.
 */
describe('requestId middleware', () => {
  it('propagates client-supplied x-request-id', () => {
    jest.resetModules();
    const requestIdMiddleware = require('../../middlewares/requestId.middleware');
    const req = { headers: { 'x-request-id': 'client-xyz' } };
    const headers = {};
    const res = { setHeader: (k, v) => { headers[k] = v; } };
    const next = jest.fn();
    requestIdMiddleware(req, res, next);
    expect(req.id).toBe('client-xyz');
    expect(headers['x-request-id']).toBe('client-xyz');
    expect(next).toHaveBeenCalled();
  });

  it('generates a request id when none is supplied', () => {
    jest.resetModules();
    const requestIdMiddleware = require('../../middlewares/requestId.middleware');
    const req = { headers: {} };
    const headers = {};
    const res = { setHeader: (k, v) => { headers[k] = v; } };
    requestIdMiddleware(req, res, jest.fn());
    expect(req.id).toBeDefined();
    expect(String(req.id).length).toBeGreaterThan(8);
    expect(headers['x-request-id']).toBe(req.id);
  });
});

describe('requestLogger slow threshold export', () => {
  const ORIGINAL = process.env.SLOW_REQUEST_MS;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.SLOW_REQUEST_MS;
    else process.env.SLOW_REQUEST_MS = ORIGINAL;
    jest.resetModules();
  });

  it('reads SLOW_REQUEST_MS env override', () => {
    process.env.SLOW_REQUEST_MS = '1234';
    jest.resetModules();
    const { SLOW_REQUEST_THRESHOLD_MS } = require('../../middlewares/requestLogger.middleware');
    expect(SLOW_REQUEST_THRESHOLD_MS).toBe(1234);
  });

  it('defaults to 2000ms when unset', () => {
    delete process.env.SLOW_REQUEST_MS;
    jest.resetModules();
    const { SLOW_REQUEST_THRESHOLD_MS } = require('../../middlewares/requestLogger.middleware');
    expect(SLOW_REQUEST_THRESHOLD_MS).toBe(2000);
  });
});

describe('requestLoggerMiddleware slow detection', () => {
  it('emits warn with slow_request kind when duration exceeds threshold', () => {
    jest.resetModules();
    process.env.SLOW_REQUEST_MS = '5';
    process.env.COLD_START_WINDOW_MS = '0';

    const warn = jest.fn();
    const info = jest.fn();
    jest.doMock('../../utils/logger', () => ({
      info,
      warn,
      error: jest.fn(),
      debug: jest.fn(),
      audit: jest.fn()
    }));

    const { requestLoggerMiddleware } = require('../../middlewares/requestLogger.middleware');

    const req = {
      method: 'GET',
      originalUrl: '/api/vehicles',
      id: 'rid-slow',
      ip: '127.0.0.1',
      headers: {}
    };
    let onFinish;
    const res = {
      statusCode: 200,
      on: (event, cb) => {
        if (event === 'finish') onFinish = cb;
      }
    };
    const next = jest.fn();

    const start = Date.now();
    requestLoggerMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    const realNow = Date.now;
    Date.now = () => start + 40;
    onFinish();
    Date.now = realNow;

    expect(warn).toHaveBeenCalled();
    const slowCall = warn.mock.calls.find(([msg]) => String(msg).includes('SLOW REQUEST'));
    expect(slowCall).toBeDefined();
    expect(slowCall[1]).toMatchObject({
      requestId: 'rid-slow',
      kind: 'slow_request',
      eventType: 'http_slow'
    });
    expect(slowCall[1].durationMs).toBeGreaterThanOrEqual(5);

    jest.dontMock('../../utils/logger');
  });
});
