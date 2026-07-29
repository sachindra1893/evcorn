/**
 * Unit tests: structured logger shape + requestId normalization.
 */
const ORIGINAL_ENV = process.env.NODE_ENV;

describe('logger (structured)', () => {
  let infoSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    jest.resetModules();
    infoSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('emits JSON lines in production with requestId normalized from reqId', () => {
    process.env.NODE_ENV = 'production';
    const logger = require('../../utils/logger');

    logger.info('hello', { reqId: 'abc-123', durationMs: 10 });

    expect(infoSpy).toHaveBeenCalled();
    const line = infoSpy.mock.calls[0][0];
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe('info');
    expect(parsed.msg).toBe('hello');
    expect(parsed.service).toBe('evcorn-backend');
    expect(parsed.requestId).toBe('abc-123');
    expect(parsed.durationMs).toBe(10);
    expect(parsed.time).toBeDefined();
  });

  it('redacts sensitive fields', () => {
    process.env.NODE_ENV = 'production';
    const logger = require('../../utils/logger');
    logger.error('bad', { requestId: 'r1', password: 'secret', token: 't' });
    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(parsed.password).toBe('[REDACTED]');
    expect(parsed.token).toBe('[REDACTED]');
    expect(parsed.requestId).toBe('r1');
  });

  it('suppresses debug in production', () => {
    process.env.NODE_ENV = 'production';
    const logger = require('../../utils/logger');
    logger.debug('noisy');
    expect(infoSpy).not.toHaveBeenCalled();
  });
});
