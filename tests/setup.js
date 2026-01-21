/**
 * Test setup and utilities for Minimal Metrics
 */

import { existsSync, mkdirSync, unlinkSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use unique test database per process to avoid locking issues in parallel tests
const TEST_DB_SUFFIX = process.pid || Math.random().toString(36).slice(2);
export const TEST_DB_PATH = join(__dirname, 'fixtures', `test-${TEST_DB_SUFFIX}.db`);

/**
 * Set up test environment
 */
export function setupTestEnv() {
  // Override environment for tests
  process.env.DATABASE_PATH = TEST_DB_PATH;
  process.env.RAW_DATA_RETENTION = '24';
  process.env.AGGREGATED_DATA_RETENTION = '8760';
  process.env.RATE_LIMIT_WINDOW = '60000';
  process.env.RATE_LIMIT_MAX = '100';

  // Ensure fixtures directory exists
  const fixturesDir = dirname(TEST_DB_PATH);
  if (!existsSync(fixturesDir)) {
    mkdirSync(fixturesDir, { recursive: true });
  }
}

/**
 * Initialize test database with schema
 */
export function initTestDb() {
  setupTestEnv();
  cleanupTestDb();

  const db = new Database(TEST_DB_PATH);
  const schemaPath = join(__dirname, '..', 'server', 'db', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf8');

  try {
    db.exec(schema);
  } finally {
    db.close();
  }
}

/**
 * Clean up test database
 */
export function cleanupTestDb() {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
  // Also clean up WAL and SHM files
  const walPath = TEST_DB_PATH + '-wal';
  const shmPath = TEST_DB_PATH + '-shm';
  if (existsSync(walPath)) unlinkSync(walPath);
  if (existsSync(shmPath)) unlinkSync(shmPath);
}

/**
 * Create mock HTTP request
 * @param {object} options
 * @returns {object}
 */
export function createMockRequest(options = {}) {
  const {
    method = 'GET',
    url = '/',
    headers = {},
    body = null
  } = options;

  const req = {
    method,
    url,
    headers: {
      host: 'localhost:3000',
      ...headers
    },
    on: (event, callback) => {
      if (event === 'data' && body) {
        callback(Buffer.from(JSON.stringify(body)));
      }
      if (event === 'end') {
        callback();
      }
    },
    destroy: () => {}
  };

  return req;
}

/**
 * Create mock HTTP response
 * @returns {{ res: object, getResult: () => { statusCode: number, headers: object, body: string } }}
 */
export function createMockResponse() {
  let statusCode = 200;
  const headers = {};
  let body = '';

  const res = {
    writeHead: (code, hdrs = {}) => {
      statusCode = code;
      Object.assign(headers, hdrs);
    },
    setHeader: (name, value) => {
      headers[name] = value;
    },
    end: (data = '') => {
      body = data;
    }
  };

  return {
    res,
    getResult: () => ({ statusCode, headers, body })
  };
}

/**
 * Sample event data for testing
 */
export const sampleEventData = {
  url: 'https://example.com/page',
  ref: 'https://google.com',
  sid: 'test-session-123',
  scr: '1920x1080',
  tz: 'America/New_York',
  ts: Date.now()
};

/**
 * Sample event with UTM parameters
 */
export const sampleEventWithUtm = {
  ...sampleEventData,
  utm_source: 'twitter',
  utm_medium: 'social',
  utm_campaign: 'launch2024'
};

/**
 * Sample custom event
 */
export const sampleCustomEvent = {
  ...sampleEventData,
  evt: 'button_click',
  props: { button_id: 'signup', variant: 'blue' }
};

/**
 * Wait for specified milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
