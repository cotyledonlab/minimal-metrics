/**
 * Server Integration Tests
 *
 * Tests the HTTP server endpoints using a test server instance.
 * This file sets up its own server to avoid conflicts.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { createServer } from 'node:http';
import { initTestDb, cleanupTestDb } from '../setup.js';

// Initialize test environment
initTestDb();

// Import server handlers after env is set up
import { handleCollect } from '../../server/api/collect.js';
import { handleStats } from '../../server/api/stats.js';
import { handleExport } from '../../server/api/export.js';
import { securityHeaders } from '../../server/middleware/security.js';
import { requireAuth, handleLogin, handleLogout, isAuthEnabled } from '../../server/middleware/auth.js';

const TEST_PORT = 3997;
let server;

/**
 * Create a simple test server with the handlers
 */
function createTestServer() {
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const path = url.pathname;

    // Apply security headers
    securityHeaders(req, res, () => {
      if (path === '/api/collect') {
        handleCollect(req, res);
      } else if (path.startsWith('/api/stats/')) {
        requireAuth(req, res, () => handleStats(req, res));
      } else if (path === '/api/export') {
        requireAuth(req, res, () => handleExport(req, res));
      } else if (path === '/api/login') {
        handleLogin(req, res);
      } else if (path === '/api/logout') {
        handleLogout(req, res);
      } else if (path === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: Date.now(),
          uptime: process.uptime(),
          authEnabled: isAuthEnabled()
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
  });
}

/**
 * Make HTTP request to test server
 */
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json: () => {
            try {
              return JSON.parse(body);
            } catch {
              return null;
            }
          }
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(bodyStr);
    }

    req.end();
  });
}

describe('Server Integration Tests', () => {
  before((t, done) => {
    server = createTestServer();
    server.listen(TEST_PORT, 'localhost', () => {
      done();
    });
  });

  after((t, done) => {
    server.close(() => {
      cleanupTestDb();
      done();
    });
  });

  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      const res = await request('/health');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.strictEqual(data.status, 'ok');
      assert.ok(typeof data.timestamp === 'number');
    });

    it('should include security headers', async () => {
      const res = await request('/health');

      assert.ok(res.headers['x-content-type-options']);
      assert.ok(res.headers['x-frame-options']);
    });
  });

  describe('Collect Endpoint', () => {
    it('should accept valid POST request', async () => {
      const res = await request('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://example.com/test',
          sid: 'test-session-server-1'
        }
      });

      assert.strictEqual(res.statusCode, 204);
    });

    it('should accept request with all fields', async () => {
      const res = await request('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://example.com/full-test',
          sid: 'test-session-server-2',
          ref: 'https://google.com',
          scr: '1920x1080',
          tz: 'UTC',
          ts: Date.now(),
          utm_source: 'test',
          utm_medium: 'integration',
          utm_campaign: 'server-test'
        }
      });

      assert.strictEqual(res.statusCode, 204);
    });

    it('should reject missing required fields', async () => {
      const res = await request('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { url: 'https://example.com/missing-sid' }
      });

      assert.strictEqual(res.statusCode, 400);
    });

    it('should reject GET request', async () => {
      const res = await request('/api/collect', { method: 'GET' });

      assert.strictEqual(res.statusCode, 405);
    });

    it('should handle OPTIONS preflight', async () => {
      const res = await request('/api/collect', { method: 'OPTIONS' });

      assert.strictEqual(res.statusCode, 204);
    });
  });

  describe('Stats Endpoints', () => {
    it('should return realtime stats', async () => {
      const res = await request('/api/stats/realtime');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.ok('active_visitors' in data);
    });

    it('should return overview stats', async () => {
      const res = await request('/api/stats/overview');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.ok('page_views' in data);
      assert.ok('unique_visitors' in data);
      assert.ok('top_pages' in data);
    });

    it('should accept period parameter', async () => {
      const res = await request('/api/stats/overview?period=30d');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.strictEqual(data.period, '30d');
    });

    it('should include comparison when requested', async () => {
      const res = await request('/api/stats/overview?compare=true');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.ok(data.comparison);
    });

    it('should return pages stats', async () => {
      const res = await request('/api/stats/pages');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.ok(Array.isArray(data.pages));
    });

    it('should return referrers stats', async () => {
      const res = await request('/api/stats/referrers');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.ok(Array.isArray(data.referrers));
    });

    it('should return countries stats', async () => {
      const res = await request('/api/stats/countries');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.ok(Array.isArray(data.countries));
    });

    it('should return hourly stats', async () => {
      const res = await request('/api/stats/hourly');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.ok(Array.isArray(data.hours));
      assert.strictEqual(data.hours.length, 24);
    });

    it('should return campaigns stats', async () => {
      const res = await request('/api/stats/campaigns');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.ok(Array.isArray(data.campaigns));
    });

    it('should return 404 for unknown endpoint', async () => {
      const res = await request('/api/stats/unknown');

      assert.strictEqual(res.statusCode, 404);
    });
  });

  describe('Export Endpoint', () => {
    it('should export overview as JSON', async () => {
      const res = await request('/api/export?type=overview&format=json');

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('application/json'));
      const data = res.json();
      assert.ok(data.summary);
    });

    it('should export pages as CSV', async () => {
      const res = await request('/api/export?type=pages&format=csv');

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/csv'));
      assert.ok(res.body.includes('page_url'));
    });

    it('should reject CSV for overview', async () => {
      const res = await request('/api/export?type=overview&format=csv');

      assert.strictEqual(res.statusCode, 400);
    });

    it('should reject invalid type', async () => {
      const res = await request('/api/export?type=invalid');

      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request('/unknown/path');

      assert.strictEqual(res.statusCode, 404);
      const data = res.json();
      assert.strictEqual(data.error, 'Not found');
    });
  });
});
