/**
 * Input validation utilities for Minimal Metrics
 */

const MAX_URL_LENGTH = 2000;
const MAX_SESSION_ID_LENGTH = 50;
const MAX_REFERRER_LENGTH = 2000;
const MAX_SCREEN_SIZE_LENGTH = 20;
const MAX_TIMEZONE_LENGTH = 50;
const MAX_EVENT_NAME_LENGTH = 100;
const MAX_EVENT_PROPS_SIZE = 5000;
const MAX_UTM_LENGTH = 200;

/**
 * Validate URL string
 * @param {unknown} url
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUrl(url) {
  if (typeof url !== 'string') {
    return { valid: false, error: 'URL must be a string' };
  }
  if (url.length === 0) {
    return { valid: false, error: 'URL is required' };
  }
  if (url.length > MAX_URL_LENGTH) {
    return { valid: false, error: `URL exceeds maximum length of ${MAX_URL_LENGTH}` };
  }
  // Basic URL format check
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }
  return { valid: true };
}

/**
 * Validate session ID
 * @param {unknown} sid
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSessionId(sid) {
  if (typeof sid !== 'string') {
    return { valid: false, error: 'Session ID must be a string' };
  }
  if (sid.length === 0) {
    return { valid: false, error: 'Session ID is required' };
  }
  if (sid.length > MAX_SESSION_ID_LENGTH) {
    return { valid: false, error: `Session ID exceeds maximum length of ${MAX_SESSION_ID_LENGTH}` };
  }
  // Alphanumeric and common separators only
  if (!/^[a-zA-Z0-9_-]+$/.test(sid)) {
    return { valid: false, error: 'Session ID contains invalid characters' };
  }
  return { valid: true };
}

/**
 * Validate referrer URL
 * @param {unknown} ref
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateReferrer(ref) {
  if (ref === null || ref === undefined || ref === '') {
    return { valid: true }; // Optional field
  }
  if (typeof ref !== 'string') {
    return { valid: false, error: 'Referrer must be a string' };
  }
  if (ref.length > MAX_REFERRER_LENGTH) {
    return { valid: false, error: `Referrer exceeds maximum length of ${MAX_REFERRER_LENGTH}` };
  }
  return { valid: true };
}

/**
 * Validate screen size
 * @param {unknown} scr
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateScreenSize(scr) {
  if (scr === null || scr === undefined || scr === '') {
    return { valid: true }; // Optional field
  }
  if (typeof scr !== 'string') {
    return { valid: false, error: 'Screen size must be a string' };
  }
  if (scr.length > MAX_SCREEN_SIZE_LENGTH) {
    return { valid: false, error: `Screen size exceeds maximum length of ${MAX_SCREEN_SIZE_LENGTH}` };
  }
  // Format: WIDTHxHEIGHT
  if (!/^\d+x\d+$/.test(scr)) {
    return { valid: false, error: 'Screen size must be in format WIDTHxHEIGHT' };
  }
  return { valid: true };
}

/**
 * Validate timezone
 * @param {unknown} tz
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTimezone(tz) {
  if (tz === null || tz === undefined || tz === '') {
    return { valid: true }; // Optional field
  }
  if (typeof tz !== 'string') {
    return { valid: false, error: 'Timezone must be a string' };
  }
  if (tz.length > MAX_TIMEZONE_LENGTH) {
    return { valid: false, error: `Timezone exceeds maximum length of ${MAX_TIMEZONE_LENGTH}` };
  }
  return { valid: true };
}

/**
 * Validate timestamp
 * @param {unknown} ts
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTimestamp(ts) {
  if (ts === null || ts === undefined) {
    return { valid: true }; // Will use current time
  }
  if (typeof ts !== 'number') {
    return { valid: false, error: 'Timestamp must be a number' };
  }
  // Reasonable range: not before 2020, not more than 1 day in future
  const minTime = new Date('2020-01-01').getTime();
  const maxTime = Date.now() + 86400000; // 24 hours in future
  if (ts < minTime || ts > maxTime) {
    return { valid: false, error: 'Timestamp is out of valid range' };
  }
  return { valid: true };
}

/**
 * Validate event name
 * @param {unknown} evt
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEventName(evt) {
  if (evt === null || evt === undefined || evt === '') {
    return { valid: true }; // Optional field
  }
  if (typeof evt !== 'string') {
    return { valid: false, error: 'Event name must be a string' };
  }
  if (evt.length > MAX_EVENT_NAME_LENGTH) {
    return { valid: false, error: `Event name exceeds maximum length of ${MAX_EVENT_NAME_LENGTH}` };
  }
  return { valid: true };
}

/**
 * Validate event properties
 * @param {unknown} props
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEventProps(props) {
  if (props === null || props === undefined) {
    return { valid: true }; // Optional field
  }
  if (typeof props !== 'object' || Array.isArray(props)) {
    return { valid: false, error: 'Event properties must be an object' };
  }
  const propsString = JSON.stringify(props);
  if (propsString.length > MAX_EVENT_PROPS_SIZE) {
    return { valid: false, error: `Event properties exceed maximum size of ${MAX_EVENT_PROPS_SIZE}` };
  }
  return { valid: true };
}

/**
 * Validate UTM parameter
 * @param {unknown} utm
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUtm(utm, name) {
  if (utm === null || utm === undefined || utm === '') {
    return { valid: true }; // Optional field
  }
  if (typeof utm !== 'string') {
    return { valid: false, error: `${name} must be a string` };
  }
  if (utm.length > MAX_UTM_LENGTH) {
    return { valid: false, error: `${name} exceeds maximum length of ${MAX_UTM_LENGTH}` };
  }
  return { valid: true };
}

/**
 * Validate complete collect request data
 * @param {Record<string, unknown>} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCollectData(data) {
  const errors = [];

  // Required fields
  const urlResult = validateUrl(data.url);
  if (!urlResult.valid) errors.push(urlResult.error);

  const sidResult = validateSessionId(data.sid);
  if (!sidResult.valid) errors.push(sidResult.error);

  // Optional fields
  const refResult = validateReferrer(data.ref);
  if (!refResult.valid) errors.push(refResult.error);

  const scrResult = validateScreenSize(data.scr);
  if (!scrResult.valid) errors.push(scrResult.error);

  const tzResult = validateTimezone(data.tz);
  if (!tzResult.valid) errors.push(tzResult.error);

  const tsResult = validateTimestamp(data.ts);
  if (!tsResult.valid) errors.push(tsResult.error);

  const evtResult = validateEventName(data.evt);
  if (!evtResult.valid) errors.push(evtResult.error);

  const propsResult = validateEventProps(data.props);
  if (!propsResult.valid) errors.push(propsResult.error);

  // UTM parameters
  const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  for (const field of utmFields) {
    const utmResult = validateUtm(data[field], field);
    if (!utmResult.valid) errors.push(utmResult.error);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize string by removing control characters
 * @param {string} str
 * @returns {string}
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  // Remove control characters except newlines and tabs
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
