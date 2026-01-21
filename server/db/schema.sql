-- Enable foreign keys and WAL mode for better concurrency
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- Core events table for raw page views
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    page_url TEXT NOT NULL,
    referrer TEXT,
    session_hash TEXT NOT NULL,
    country TEXT,
    screen_size TEXT,
    timezone TEXT,
    event_name TEXT DEFAULT 'pageview',
    event_props TEXT,
    -- UTM campaign tracking parameters
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_page_url ON events(page_url);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_hash);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_utm ON events(utm_source, utm_medium, utm_campaign);

-- Aggregated hourly statistics
CREATE TABLE IF NOT EXISTS stats_hourly (
    hour DATETIME PRIMARY KEY,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    bounce_rate REAL DEFAULT 0,
    top_pages TEXT,
    top_referrers TEXT,
    countries TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily aggregated statistics for long-term storage
CREATE TABLE IF NOT EXISTS stats_daily (
    date DATE PRIMARY KEY,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    new_visitors INTEGER DEFAULT 0,
    returning_visitors INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    bounce_rate REAL DEFAULT 0,
    top_pages TEXT,
    top_referrers TEXT,
    countries TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Real-time visitor tracking (last 5 minutes)
CREATE TABLE IF NOT EXISTS active_visitors (
    session_hash TEXT PRIMARY KEY,
    page_url TEXT NOT NULL,
    country TEXT,
    last_seen INTEGER NOT NULL,
    page_count INTEGER DEFAULT 1
);

-- Create cleanup trigger for old active visitors
CREATE TRIGGER IF NOT EXISTS cleanup_active_visitors
AFTER INSERT ON active_visitors
BEGIN
    DELETE FROM active_visitors 
    WHERE last_seen < (strftime('%s', 'now') - 300);
END;

-- Site metadata and configuration
CREATE TABLE IF NOT EXISTS site_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT OR IGNORE INTO site_config (key, value) VALUES
    ('site_created', datetime('now')),
    ('tracking_enabled', '1'),
    ('data_retention_days', '90'),
    ('aggregation_enabled', '1');