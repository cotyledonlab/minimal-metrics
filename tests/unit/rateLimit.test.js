/**
 * Unit tests for rate limiter
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createRateLimiter } from '../../server/utils/rateLimit.js';
import { createMockRequest, createMockResponse } from '../setup.js';

describe('createRateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    // Create a new rate limiter for each test
    // 1 second window, 5 requests max
    rateLimiter = createRateLimiter(1000, 5);
  });

  it('should allow requests under the limit', (t, done) => {
    const req = createMockRequest({
      headers: { 'x-forwarded-for': '192.168.1.1' }
    });
    const { res, getResult } = createMockResponse();

    rateLimiter(req, res, () => {
      // Callback was called, request was allowed
      const result = getResult();
      assert.notStrictEqual(result.statusCode, 429);
      done();
    });
  });

  it('should block requests over the limit', (t, done) => {
    const req = createMockRequest({
      headers: { 'x-forwarded-for': '192.168.1.2' }
    });

    // Make 5 requests (should all pass)
    let passed = 0;
    for (let i = 0; i < 5; i++) {
      const { res } = createMockResponse();
      rateLimiter(req, res, () => {
        passed++;
      });
    }

    assert.strictEqual(passed, 5, 'First 5 requests should pass');

    // 6th request should be blocked
    const { res, getResult } = createMockResponse();
    rateLimiter(req, res, () => {
      assert.fail('6th request should have been blocked');
    });

    const result = getResult();
    assert.strictEqual(result.statusCode, 429);
    done();
  });

  it('should track different IPs separately', (t, done) => {
    // Use up limit for IP 1
    const req1 = createMockRequest({
      headers: { 'x-forwarded-for': '192.168.1.10' }
    });

    for (let i = 0; i < 5; i++) {
      const { res } = createMockResponse();
      rateLimiter(req1, res, () => {});
    }

    // IP 2 should still be allowed
    const req2 = createMockRequest({
      headers: { 'x-forwarded-for': '192.168.1.20' }
    });
    const { res } = createMockResponse();

    let called = false;
    rateLimiter(req2, res, () => {
      called = true;
    });

    assert.strictEqual(called, true, 'Different IP should not be rate limited');
    done();
  });

  it('should extract IP from x-forwarded-for header', (t, done) => {
    const req = createMockRequest({
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' }
    });

    // Should use first IP in the list
    for (let i = 0; i < 5; i++) {
      const { res } = createMockResponse();
      rateLimiter(req, res, () => {});
    }

    // Same first IP should be blocked
    const { res, getResult } = createMockResponse();
    rateLimiter(req, res, () => {
      assert.fail('Should be rate limited');
    });

    assert.strictEqual(getResult().statusCode, 429);
    done();
  });

  it('should return JSON error response', (t, done) => {
    const req = createMockRequest({
      headers: { 'x-forwarded-for': '192.168.1.30' }
    });

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      const { res } = createMockResponse();
      rateLimiter(req, res, () => {});
    }

    // Check error response format
    const { res, getResult } = createMockResponse();
    rateLimiter(req, res, () => {});

    const result = getResult();
    assert.strictEqual(result.statusCode, 429);
    assert.strictEqual(result.headers['Content-Type'], 'application/json');

    const body = JSON.parse(result.body);
    assert.ok(body.error);
    done();
  });
});
