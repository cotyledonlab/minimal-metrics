import { insertEvent, updateActiveVisitor, hashSession } from '../db/queries.js';
import { extractIpInfo } from '../utils/geo.js';
import { validateCollectData } from '../utils/validation.js';
import { setCorsHeaders } from '../middleware/security.js';

const MAX_BODY_SIZE = 10 * 1024; // 10KB limit

const eventQueue = [];
let flushTimer = null;

function flushEvents() {
  if (eventQueue.length === 0) return;

  const events = eventQueue.splice(0, eventQueue.length);

  for (const event of events) {
    try {
      insertEvent(event);
      updateActiveVisitor(event.session_hash, event.page_url, event.country);
    } catch (error) {
      console.error('Failed to insert event:', error);
    }
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushEvents();
    flushTimer = null;
  }, 5000);
}

function parseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      path: parsed.pathname,
      host: parsed.hostname,
      query: parsed.search,
      full: url
    };
  } catch {
    return { path: url, host: '', query: '', full: url };
  }
}

function parseReferrer(referrer) {
  if (!referrer) return null;

  try {
    const url = new URL(referrer);

    if (url.hostname.includes('google')) return 'Google';
    if (url.hostname.includes('facebook')) return 'Facebook';
    if (url.hostname.includes('twitter') || url.hostname.includes('t.co')) return 'Twitter';
    if (url.hostname.includes('linkedin')) return 'LinkedIn';
    if (url.hostname.includes('reddit')) return 'Reddit';
    if (url.hostname.includes('youtube')) return 'YouTube';
    if (url.hostname.includes('github')) return 'GitHub';
    if (url.hostname.includes('bing')) return 'Bing';
    if (url.hostname.includes('duckduckgo')) return 'DuckDuckGo';

    return url.hostname;
  } catch {
    return referrer;
  }
}

export function handleCollect(req, res) {
  // Set CORS headers for all responses
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  let bodySize = 0;
  let aborted = false;

  req.on('data', chunk => {
    if (aborted) return;

    bodySize += chunk.length;
    if (bodySize > MAX_BODY_SIZE) {
      aborted = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request too large' }));
      req.destroy();
      return;
    }
    body += chunk;
  });

  req.on('end', () => {
    if (aborted) return;

    try {
      const data = JSON.parse(body);

      // Validate input data
      const validation = validateCollectData(data);
      if (!validation.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid data', details: validation.errors }));
        return;
      }

      const { ip, country } = extractIpInfo(req);
      const sessionHash = hashSession(data.sid, ip);
      const urlData = parseUrl(data.url);

      const event = {
        timestamp: data.ts || Date.now(),
        page_url: urlData.path,
        referrer: parseReferrer(data.ref),
        session_hash: sessionHash,
        country: country,
        screen_size: data.scr || null,
        timezone: data.tz || null,
        event_name: data.evt || 'pageview',
        event_props: data.props || null,
        // UTM parameters
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_term: data.utm_term || null,
        utm_content: data.utm_content || null
      };

      eventQueue.push(event);
      scheduleFlush();

      res.writeHead(204, {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end();

    } catch (error) {
      console.error('Collection error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
}

process.on('SIGINT', () => {
  flushEvents();
  process.exit(0);
});

process.on('SIGTERM', () => {
  flushEvents();
  process.exit(0);
});
