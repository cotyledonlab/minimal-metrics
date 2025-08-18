import Database from 'better-sqlite3';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/metrics.db';
let db;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

export function hashSession(sessionId, ip) {
  return crypto
    .createHash('sha256')
    .update(`${sessionId}:${ip}:${new Date().toDateString()}`)
    .digest('hex')
    .substring(0, 16);
}

export function insertEvent(data) {
  const stmt = getDb().prepare(`
    INSERT INTO events (
      timestamp, page_url, referrer, session_hash, 
      country, screen_size, timezone, event_name, event_props
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    data.timestamp,
    data.page_url,
    data.referrer,
    data.session_hash,
    data.country,
    data.screen_size,
    data.timezone,
    data.event_name || 'pageview',
    data.event_props ? JSON.stringify(data.event_props) : null
  );
}

export function updateActiveVisitor(sessionHash, pageUrl, country) {
  const stmt = getDb().prepare(`
    INSERT INTO active_visitors (session_hash, page_url, country, last_seen, page_count)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(session_hash) DO UPDATE SET
      page_url = excluded.page_url,
      last_seen = excluded.last_seen,
      page_count = page_count + 1
  `);
  
  return stmt.run(sessionHash, pageUrl, country, Math.floor(Date.now() / 1000));
}

export function getActiveVisitors() {
  const stmt = getDb().prepare(`
    SELECT COUNT(DISTINCT session_hash) as count
    FROM active_visitors
    WHERE last_seen > ?
  `);
  
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
  return stmt.get(fiveMinutesAgo);
}

export function getPageViews(startTime, endTime) {
  const stmt = getDb().prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT session_hash) as unique_visitors
    FROM events
    WHERE timestamp BETWEEN ? AND ?
      AND event_name = 'pageview'
  `);
  
  return stmt.get(startTime, endTime);
}

export function getTopPages(startTime, endTime, limit = 10) {
  const stmt = getDb().prepare(`
    SELECT 
      page_url,
      COUNT(*) as views,
      COUNT(DISTINCT session_hash) as unique_visitors
    FROM events
    WHERE timestamp BETWEEN ? AND ?
      AND event_name = 'pageview'
    GROUP BY page_url
    ORDER BY views DESC
    LIMIT ?
  `);
  
  return stmt.all(startTime, endTime, limit);
}

export function getTopReferrers(startTime, endTime, limit = 10) {
  const stmt = getDb().prepare(`
    SELECT 
      COALESCE(referrer, 'Direct') as referrer,
      COUNT(*) as visits,
      COUNT(DISTINCT session_hash) as unique_visitors
    FROM events
    WHERE timestamp BETWEEN ? AND ?
      AND event_name = 'pageview'
    GROUP BY referrer
    ORDER BY visits DESC
    LIMIT ?
  `);
  
  return stmt.all(startTime, endTime, limit);
}

export function getCountryStats(startTime, endTime) {
  const stmt = getDb().prepare(`
    SELECT 
      country,
      COUNT(*) as visits,
      COUNT(DISTINCT session_hash) as unique_visitors
    FROM events
    WHERE timestamp BETWEEN ? AND ?
      AND event_name = 'pageview'
      AND country IS NOT NULL
    GROUP BY country
    ORDER BY visits DESC
  `);
  
  return stmt.all(startTime, endTime);
}

export function getHourlyStats(date) {
  const stmt = getDb().prepare(`
    SELECT 
      strftime('%H', datetime(timestamp/1000, 'unixepoch')) as hour,
      COUNT(*) as page_views,
      COUNT(DISTINCT session_hash) as unique_visitors
    FROM events
    WHERE date(datetime(timestamp/1000, 'unixepoch')) = date(?)
      AND event_name = 'pageview'
    GROUP BY hour
    ORDER BY hour
  `);
  
  return stmt.all(date);
}

export function aggregateHourlyStats() {
  const db = getDb();
  const transaction = db.transaction(() => {
    const hourAgo = Date.now() - 3600000;
    
    const stats = db.prepare(`
      SELECT 
        datetime(timestamp/1000, 'unixepoch', 'start of hour') as hour,
        COUNT(*) as page_views,
        COUNT(DISTINCT session_hash) as unique_visitors
      FROM events
      WHERE timestamp < ?
        AND event_name = 'pageview'
      GROUP BY hour
    `).all(hourAgo);
    
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO stats_hourly (hour, page_views, unique_visitors)
      VALUES (?, ?, ?)
    `);
    
    for (const stat of stats) {
      insertStmt.run(stat.hour, stat.page_views, stat.unique_visitors);
    }
    
    db.prepare('DELETE FROM events WHERE timestamp < ?').run(hourAgo - 86400000);
  });
  
  transaction();
}

export function cleanupOldData() {
  const db = getDb();
  const retentionDays = parseInt(process.env.AGGREGATED_DATA_RETENTION || '365');
  const cutoffDate = Date.now() - (retentionDays * 86400000);
  
  db.prepare('DELETE FROM stats_daily WHERE date < date(?, "unixepoch")').run(cutoffDate / 1000);
  db.prepare('DELETE FROM stats_hourly WHERE hour < datetime(?, "unixepoch")').run(cutoffDate / 1000);
}