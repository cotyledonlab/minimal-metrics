/**
 * Integration tests for Authentication
 *
 * Tests the authentication middleware and login/logout endpoints.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { createServer } from 'node:http';
import { initTestDb, cleanupTestDb } from '../setup.js';

// Initialize test environment
initTestDb();

// Import handlers after env is set up
import { handleStats } from '../../server/api/stats.js';
import { handleExport } from '../../server/api/export.js';
import { handleCollect } from '../../server/api/collect.js';
import { securityHeaders } from '../../server/middleware/security.js';
import { requireAuth, handleLogin, handleLogout, isAuthEnabled } from '../../server/middleware/auth.js';

const TEST_TOKEN = 'test-secret-token-12345';

// Use different ports for each test suite to avoid race conditions
const PORTS = {
  noAuth: 3996,
  withAuth: 3997,
  login: 3998,
  logout: 3999,
  cookie: 4000
};

let server;
let currentPort;

/**
 * Create a test server with auth handlers
 */
function createTestServer() {
  return createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

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
      } else if (path === '/api/auth/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authEnabled: isAuthEnabled() }));
      } else if (path === '/tracker.min.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end('// tracker');
      } else if (path === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', authEnabled: isAuthEnabled() }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
  });
}

/**
 * Make HTTP request
 */
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: currentPort,
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

describe('Authentication Tests', () => {
  describe('Without AUTH_TOKEN configured', () => {
    before((t, done) => {
      // Ensure no AUTH_TOKEN
      delete process.env.AUTH_TOKEN;
      currentPort = PORTS.noAuth;
      server = createTestServer();
      server.listen(currentPort, 'localhost', done);
    });

    after((t, done) => {
      server.close(done);
    });

    it('should report auth not enabled', async () => {
      const res = await request('/api/auth/status');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.strictEqual(data.authEnabled, false);
    });

    it('should allow access to stats API without authentication', async () => {
      const res = await request('/api/stats/overview');

      assert.notStrictEqual(res.statusCode, 401);
      assert.strictEqual(res.statusCode, 200);
    });

    it('should report no auth required on login', async () => {
      const res = await request('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { token: 'any-token' }
      });

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.strictEqual(data.success, true);
    });
  });

  describe('With AUTH_TOKEN configured', () => {
    before((t, done) => {
      process.env.AUTH_TOKEN = TEST_TOKEN;
      currentPort = PORTS.withAuth;
      server = createTestServer();
      server.listen(currentPort, 'localhost', done);
    });

    after((t, done) => {
      delete process.env.AUTH_TOKEN;
      server.close(done);
    });

    it('should report auth enabled', async () => {
      const res = await request('/api/auth/status');

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.strictEqual(data.authEnabled, true);
    });

    it('should reject stats access without token', async () => {
      const res = await request('/api/stats/overview');

      assert.strictEqual(res.statusCode, 401);
      const data = res.json();
      assert.strictEqual(data.error, 'Unauthorized');
    });

    it('should reject export access without token', async () => {
      const res = await request('/api/export?type=overview');

      assert.strictEqual(res.statusCode, 401);
    });

    it('should allow access with Bearer token', async () => {
      const res = await request('/api/stats/overview', {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });

      assert.strictEqual(res.statusCode, 200);
    });

    it('should reject access with invalid Bearer token', async () => {
      const res = await request('/api/stats/overview', {
        headers: {
          'Authorization': 'Bearer wrong-token'
        }
      });

      assert.strictEqual(res.statusCode, 401);
    });

    it('should allow public endpoints without auth', async () => {
      const res = await request('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          url: 'https://example.com/test',
          sid: 'test-session-auth'
        }
      });

      assert.notStrictEqual(res.statusCode, 401);
    });

    it('should allow tracker script without auth', async () => {
      const res = await request('/tracker.min.js');

      assert.notStrictEqual(res.statusCode, 401);
    });

    it('should allow health check without auth', async () => {
      const res = await request('/health');

      assert.strictEqual(res.statusCode, 200);
    });
  });

  describe('Login endpoint', () => {
    before((t, done) => {
      process.env.AUTH_TOKEN = TEST_TOKEN;
      currentPort = PORTS.login;
      server = createTestServer();
      server.listen(currentPort, 'localhost', done);
    });

    after((t, done) => {
      delete process.env.AUTH_TOKEN;
      server.close(done);
    });

    it('should accept correct token', async () => {
      const res = await request('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { token: TEST_TOKEN }
      });

      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.strictEqual(data.success, true);

      // Should set cookie
      assert.ok(res.headers['set-cookie']);
      assert.ok(res.headers['set-cookie'][0].includes('mm_token'));
    });

    it('should reject incorrect token', async () => {
      const res = await request('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { token: 'wrong-token' }
      });

      assert.strictEqual(res.statusCode, 401);
      const data = res.json();
      assert.strictEqual(data.error, 'Invalid token');
    });

    it('should reject non-POST requests', async () => {
      const res = await request('/api/login', {
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 405);
    });

    it('should reject malformed JSON', async () => {
      const res = await request('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json'
      });

      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('Logout endpoint', () => {
    before((t, done) => {
      currentPort = PORTS.logout;
      server = createTestServer();
      server.listen(currentPort, 'localhost', done);
    });

    after((t, done) => {
      server.close(done);
    });

    it('should clear cookie on logout', async () => {
      const res = await request('/api/logout');

      assert.strictEqual(res.statusCode, 200);

      // Should clear cookie
      assert.ok(res.headers['set-cookie']);
      assert.ok(res.headers['set-cookie'][0].includes('Max-Age=0'));
    });
  });

  describe('Cookie-based authentication', () => {
    before((t, done) => {
      process.env.AUTH_TOKEN = TEST_TOKEN;
      currentPort = PORTS.cookie;
      server = createTestServer();
      server.listen(currentPort, 'localhost', done);
    });

    after((t, done) => {
      delete process.env.AUTH_TOKEN;
      server.close(() => {
        cleanupTestDb();
        done();
      });
    });

    it('should accept valid cookie', async () => {
      const res = await request('/api/stats/overview', {
        headers: {
          'Cookie': `mm_token=${TEST_TOKEN}`
        }
      });

      assert.strictEqual(res.statusCode, 200);
    });

    it('should reject invalid cookie', async () => {
      const res = await request('/api/stats/overview', {
        headers: {
          'Cookie': 'mm_token=wrong-token'
        }
      });

      assert.strictEqual(res.statusCode, 401);
    });

    it('should accept cookie with other cookies present', async () => {
      const res = await request('/api/stats/overview', {
        headers: {
          'Cookie': `other_cookie=value; mm_token=${TEST_TOKEN}; another=123`
        }
      });

      assert.strictEqual(res.statusCode, 200);
    });
  });
});
