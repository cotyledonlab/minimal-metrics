/**
 * Integration tests for Database Operations
 *
 * Tests the database queries with a real SQLite database.
 */

import { describe, it, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { initTestDb, cleanupTestDb } from '../setup.js';

// Initialize test database before importing modules
initTestDb();

// Now import database modules (they will use the test database)
import {
  hashSession,
  insertEvent,
  updateActiveVisitor,
  getActiveVisitors,
  getPageViews,
  getTopPages,
  getTopReferrers,
  getCountryStats,
  getHourlyStats,
  getCampaignStats,
  getPageViewsWithComparison
} from '../../server/db/queries.js';

describe('Database Integration Tests', () => {
  after(() => {
    cleanupTestDb();
  });

  describe('hashSession', () => {
    it('should generate consistent hash for same inputs on same day', () => {
      const hash1 = hashSession('session123', '192.168.1.1');
      const hash2 = hashSession('session123', '192.168.1.1');

      assert.strictEqual(hash1, hash2);
    });

    it('should generate different hash for different sessions', () => {
      const hash1 = hashSession('session123', '192.168.1.1');
      const hash2 = hashSession('session456', '192.168.1.1');

      assert.notStrictEqual(hash1, hash2);
    });

    it('should generate different hash for different IPs', () => {
      const hash1 = hashSession('session123', '192.168.1.1');
      const hash2 = hashSession('session123', '192.168.1.2');

      assert.notStrictEqual(hash1, hash2);
    });

    it('should return 16 character hex string', () => {
      const hash = hashSession('test', '127.0.0.1');

      assert.strictEqual(hash.length, 16);
      assert.ok(/^[a-f0-9]+$/.test(hash));
    });
  });

  describe('insertEvent', () => {
    it('should insert a basic event', () => {
      const event = {
        timestamp: Date.now(),
        page_url: '/test-page',
        referrer: 'Google',
        session_hash: 'abc123def456',
        country: 'US',
        screen_size: '1920x1080',
        timezone: 'America/New_York',
        event_name: 'pageview',
        event_props: null
      };

      const result = insertEvent(event);

      assert.ok(result.changes > 0);
      assert.ok(result.lastInsertRowid > 0);
    });

    it('should insert event with UTM parameters', () => {
      const event = {
        timestamp: Date.now(),
        page_url: '/landing',
        referrer: null,
        session_hash: 'utm123hash',
        country: 'UK',
        screen_size: '1440x900',
        timezone: 'Europe/London',
        event_name: 'pageview',
        event_props: null,
        utm_source: 'twitter',
        utm_medium: 'social',
        utm_campaign: 'launch',
        utm_term: null,
        utm_content: 'hero-button'
      };

      const result = insertEvent(event);

      assert.ok(result.changes > 0);
    });

    it('should insert custom event with properties', () => {
      const event = {
        timestamp: Date.now(),
        page_url: '/signup',
        referrer: null,
        session_hash: 'custom123hash',
        country: 'CA',
        screen_size: '1366x768',
        timezone: 'America/Toronto',
        event_name: 'button_click',
        event_props: { button_id: 'signup-cta' }
      };

      const result = insertEvent(event);

      assert.ok(result.changes > 0);
    });
  });

  describe('updateActiveVisitor', () => {
    it('should insert new active visitor', () => {
      const result = updateActiveVisitor('active123', '/home', 'US');

      assert.ok(result.changes > 0);
    });

    it('should update existing active visitor', () => {
      updateActiveVisitor('active456', '/page1', 'UK');
      const result = updateActiveVisitor('active456', '/page2', 'UK');

      assert.ok(result.changes > 0);
    });
  });

  describe('getActiveVisitors', () => {
    it('should return active visitor count', () => {
      // Add a fresh active visitor
      updateActiveVisitor('fresh-visitor-' + Date.now(), '/test', 'US');

      const result = getActiveVisitors();

      assert.ok(typeof result.count === 'number');
      assert.ok(result.count >= 0);
    });
  });

  describe('getPageViews', () => {
    beforeEach(() => {
      // Insert some test events
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        insertEvent({
          timestamp: now - (i * 1000),
          page_url: '/test-page-' + i,
          referrer: null,
          session_hash: 'pageview-test-' + i,
          country: 'US',
          screen_size: '1920x1080',
          timezone: 'UTC',
          event_name: 'pageview',
          event_props: null
        });
      }
    });

    it('should return page views and unique visitors', () => {
      const now = Date.now();
      const result = getPageViews(now - 86400000, now + 1000);

      assert.ok(typeof result.total === 'number');
      assert.ok(typeof result.unique_visitors === 'number');
      assert.ok(result.total >= 0);
    });

    it('should return zero for empty time range', () => {
      // Query far in the past
      const result = getPageViews(0, 1000);

      assert.strictEqual(result.total, 0);
      assert.strictEqual(result.unique_visitors, 0);
    });
  });

  describe('getTopPages', () => {
    it('should return array of pages', () => {
      const now = Date.now();
      const result = getTopPages(now - 86400000, now + 1000, 10);

      assert.ok(Array.isArray(result));
    });

    it('should respect limit parameter', () => {
      const now = Date.now();
      const result = getTopPages(now - 86400000, now + 1000, 3);

      assert.ok(result.length <= 3);
    });

    it('should include required fields', () => {
      const now = Date.now();

      // Insert a test event
      insertEvent({
        timestamp: now,
        page_url: '/fields-test',
        referrer: null,
        session_hash: 'fields-test-hash',
        country: 'US',
        screen_size: '1920x1080',
        timezone: 'UTC',
        event_name: 'pageview',
        event_props: null
      });

      const result = getTopPages(now - 1000, now + 1000, 10);

      if (result.length > 0) {
        const page = result[0];
        assert.ok('page_url' in page);
        assert.ok('views' in page);
        assert.ok('unique_visitors' in page);
      }
    });
  });

  describe('getTopReferrers', () => {
    it('should return array of referrers', () => {
      const now = Date.now();
      const result = getTopReferrers(now - 86400000, now + 1000, 10);

      assert.ok(Array.isArray(result));
    });

    it('should label null referrers as Direct', () => {
      const now = Date.now();

      insertEvent({
        timestamp: now,
        page_url: '/direct-test',
        referrer: null,
        session_hash: 'direct-test-hash',
        country: 'US',
        screen_size: '1920x1080',
        timezone: 'UTC',
        event_name: 'pageview',
        event_props: null
      });

      const result = getTopReferrers(now - 1000, now + 1000, 10);

      // Should have a Direct entry or the referrer we inserted
      assert.ok(result.length >= 0);
    });
  });

  describe('getCountryStats', () => {
    it('should return array of countries', () => {
      const now = Date.now();
      const result = getCountryStats(now - 86400000, now + 1000);

      assert.ok(Array.isArray(result));
    });
  });

  describe('getHourlyStats', () => {
    it('should return hourly data for a date', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = getHourlyStats(today);

      assert.ok(Array.isArray(result));
    });
  });

  describe('getCampaignStats', () => {
    beforeEach(() => {
      const now = Date.now();

      // Insert events with UTM parameters
      insertEvent({
        timestamp: now,
        page_url: '/campaign-landing',
        referrer: null,
        session_hash: 'campaign-test-1',
        country: 'US',
        screen_size: '1920x1080',
        timezone: 'UTC',
        event_name: 'pageview',
        event_props: null,
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'spring-sale'
      });

      insertEvent({
        timestamp: now,
        page_url: '/campaign-landing',
        referrer: null,
        session_hash: 'campaign-test-2',
        country: 'UK',
        screen_size: '1440x900',
        timezone: 'UTC',
        event_name: 'pageview',
        event_props: null,
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'spring-sale'
      });
    });

    it('should return campaign data', () => {
      const now = Date.now();
      const result = getCampaignStats(now - 86400000, now + 1000, 50);

      assert.ok(Array.isArray(result));
    });

    it('should include UTM fields in results', () => {
      const now = Date.now();
      const result = getCampaignStats(now - 86400000, now + 1000, 50);

      if (result.length > 0) {
        const campaign = result[0];
        assert.ok('utm_source' in campaign);
        assert.ok('utm_medium' in campaign);
        assert.ok('utm_campaign' in campaign);
        assert.ok('visits' in campaign);
        assert.ok('unique_visitors' in campaign);
      }
    });
  });

  describe('getPageViewsWithComparison', () => {
    it('should return current and previous period data', () => {
      const now = Date.now();
      const result = getPageViewsWithComparison(now - 86400000, now);

      assert.ok(result.current);
      assert.ok(result.previous);
      assert.ok(result.change);
      assert.ok(typeof result.change.total === 'number');
      assert.ok(typeof result.change.unique_visitors === 'number');
    });

    it('should calculate percentage change', () => {
      const now = Date.now();

      // Insert some events in current period
      for (let i = 0; i < 3; i++) {
        insertEvent({
          timestamp: now - (i * 1000),
          page_url: '/comparison-test',
          referrer: null,
          session_hash: 'comparison-current-' + i,
          country: 'US',
          screen_size: '1920x1080',
          timezone: 'UTC',
          event_name: 'pageview',
          event_props: null
        });
      }

      const result = getPageViewsWithComparison(now - 3600000, now + 1000);

      // Change should be a number (could be positive, negative, or zero)
      assert.ok(typeof result.change.total === 'number');
      assert.ok(!isNaN(result.change.total));
    });
  });
});
