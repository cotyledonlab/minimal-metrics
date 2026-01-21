/**
 * Unit tests for validation utilities
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateUrl,
  validateSessionId,
  validateReferrer,
  validateScreenSize,
  validateTimezone,
  validateTimestamp,
  validateEventName,
  validateEventProps,
  validateUtm,
  validateCollectData,
  sanitizeString
} from '../../server/utils/validation.js';

describe('validateUrl', () => {
  it('should accept valid HTTP URLs', () => {
    const result = validateUrl('http://example.com/page');
    assert.strictEqual(result.valid, true);
  });

  it('should accept valid HTTPS URLs', () => {
    const result = validateUrl('https://example.com/page?query=1');
    assert.strictEqual(result.valid, true);
  });

  it('should reject non-string values', () => {
    const result = validateUrl(123);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('string'));
  });

  it('should reject empty strings', () => {
    const result = validateUrl('');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('required'));
  });

  it('should reject URLs that are too long', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2000);
    const result = validateUrl(longUrl);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('maximum length'));
  });

  it('should reject URLs without protocol', () => {
    const result = validateUrl('example.com/page');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('http'));
  });
});

describe('validateSessionId', () => {
  it('should accept valid session IDs', () => {
    const result = validateSessionId('abc123-xyz_789');
    assert.strictEqual(result.valid, true);
  });

  it('should reject empty session IDs', () => {
    const result = validateSessionId('');
    assert.strictEqual(result.valid, false);
  });

  it('should reject session IDs with invalid characters', () => {
    const result = validateSessionId('session<script>');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('invalid characters'));
  });

  it('should reject session IDs that are too long', () => {
    const longId = 'a'.repeat(51);
    const result = validateSessionId(longId);
    assert.strictEqual(result.valid, false);
  });
});

describe('validateReferrer', () => {
  it('should accept valid referrer URLs', () => {
    const result = validateReferrer('https://google.com/search');
    assert.strictEqual(result.valid, true);
  });

  it('should accept null/undefined (optional field)', () => {
    assert.strictEqual(validateReferrer(null).valid, true);
    assert.strictEqual(validateReferrer(undefined).valid, true);
    assert.strictEqual(validateReferrer('').valid, true);
  });

  it('should reject non-string values', () => {
    const result = validateReferrer(123);
    assert.strictEqual(result.valid, false);
  });
});

describe('validateScreenSize', () => {
  it('should accept valid screen sizes', () => {
    const result = validateScreenSize('1920x1080');
    assert.strictEqual(result.valid, true);
  });

  it('should accept null/undefined (optional field)', () => {
    assert.strictEqual(validateScreenSize(null).valid, true);
    assert.strictEqual(validateScreenSize(undefined).valid, true);
  });

  it('should reject invalid format', () => {
    const result = validateScreenSize('1920-1080');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('format'));
  });

  it('should reject non-numeric dimensions', () => {
    const result = validateScreenSize('widexhigh');
    assert.strictEqual(result.valid, false);
  });
});

describe('validateTimestamp', () => {
  it('should accept valid timestamps', () => {
    const result = validateTimestamp(Date.now());
    assert.strictEqual(result.valid, true);
  });

  it('should accept null/undefined (uses current time)', () => {
    assert.strictEqual(validateTimestamp(null).valid, true);
    assert.strictEqual(validateTimestamp(undefined).valid, true);
  });

  it('should reject non-number values', () => {
    const result = validateTimestamp('2024-01-01');
    assert.strictEqual(result.valid, false);
  });

  it('should reject timestamps too far in the past', () => {
    const oldTimestamp = new Date('2019-01-01').getTime();
    const result = validateTimestamp(oldTimestamp);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('range'));
  });

  it('should reject timestamps too far in the future', () => {
    const futureTimestamp = Date.now() + 86400000 * 2; // 2 days ahead
    const result = validateTimestamp(futureTimestamp);
    assert.strictEqual(result.valid, false);
  });
});

describe('validateEventName', () => {
  it('should accept valid event names', () => {
    const result = validateEventName('button_click');
    assert.strictEqual(result.valid, true);
  });

  it('should accept null/undefined (optional field)', () => {
    assert.strictEqual(validateEventName(null).valid, true);
    assert.strictEqual(validateEventName(undefined).valid, true);
  });

  it('should reject event names that are too long', () => {
    const longName = 'a'.repeat(101);
    const result = validateEventName(longName);
    assert.strictEqual(result.valid, false);
  });
});

describe('validateEventProps', () => {
  it('should accept valid event properties', () => {
    const result = validateEventProps({ button: 'signup', value: 100 });
    assert.strictEqual(result.valid, true);
  });

  it('should accept null/undefined (optional field)', () => {
    assert.strictEqual(validateEventProps(null).valid, true);
    assert.strictEqual(validateEventProps(undefined).valid, true);
  });

  it('should reject arrays', () => {
    const result = validateEventProps(['item1', 'item2']);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('object'));
  });

  it('should reject properties that are too large', () => {
    const largeProps = { data: 'x'.repeat(6000) };
    const result = validateEventProps(largeProps);
    assert.strictEqual(result.valid, false);
  });
});

describe('validateUtm', () => {
  it('should accept valid UTM values', () => {
    const result = validateUtm('twitter', 'utm_source');
    assert.strictEqual(result.valid, true);
  });

  it('should accept null/undefined (optional field)', () => {
    assert.strictEqual(validateUtm(null, 'utm_source').valid, true);
    assert.strictEqual(validateUtm(undefined, 'utm_source').valid, true);
  });

  it('should reject UTM values that are too long', () => {
    const longUtm = 'a'.repeat(201);
    const result = validateUtm(longUtm, 'utm_source');
    assert.strictEqual(result.valid, false);
  });
});

describe('validateCollectData', () => {
  it('should accept valid complete data', () => {
    const data = {
      url: 'https://example.com/page',
      sid: 'session123',
      ref: 'https://google.com',
      scr: '1920x1080',
      tz: 'America/New_York',
      ts: Date.now()
    };
    const result = validateCollectData(data);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should reject data missing required fields', () => {
    const data = {
      ref: 'https://google.com'
    };
    const result = validateCollectData(data);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length >= 2); // Missing url and sid
  });

  it('should collect multiple validation errors', () => {
    const data = {
      url: 'invalid-url',
      sid: '<script>alert(1)</script>',
      scr: 'invalid',
      ts: 'not-a-timestamp'
    };
    const result = validateCollectData(data);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length >= 3);
  });
});

describe('sanitizeString', () => {
  it('should remove control characters', () => {
    const input = 'Hello\x00World\x1F!';
    const result = sanitizeString(input);
    assert.strictEqual(result, 'HelloWorld!');
  });

  it('should preserve normal text', () => {
    const input = 'Hello, World!';
    const result = sanitizeString(input);
    assert.strictEqual(result, 'Hello, World!');
  });

  it('should return empty string for non-strings', () => {
    assert.strictEqual(sanitizeString(null), '');
    assert.strictEqual(sanitizeString(123), '');
  });
});
