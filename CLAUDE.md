# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Start development server with auto-restart
npm run dev

# Build the tracking script (required before deployment)
npm run build:tracker

# Initialize/reset database
npm run init:db

# Start production server
npm start

# Docker development
docker-compose up -d

# Manual Docker build
docker build -f docker/Dockerfile -t minimal-metrics .
```

## Architecture Overview

Minimal Metrics is a privacy-first analytics dashboard with three main components:

### 1. Tracking Script (`tracker/`)
- `tracker.js` - Ultra-lightweight client-side tracking (<2KB when minified)
- `build.js` - Minification and build process using Terser
- Privacy-first: no cookies, respects DNT header, session-only tracking
- Uses Beacon API with fallback to XHR, automatic retry with exponential backoff

### 2. Server Backend (`server/`)
- **Main server** (`index.js`) - HTTP server with routing and static file serving
- **API layer** (`api/`) - Three main endpoints:
  - `collect.js` - Receives tracking data, batches writes every 5 seconds
  - `stats.js` - Serves analytics data with configurable time periods
  - `export.js` - Data export in JSON/CSV formats
- **Database layer** (`db/`) - SQLite with privacy-preserving design:
  - `schema.sql` - Database structure with proper indexing
  - `queries.js` - Database operations with session hashing
  - `init.js` - Database initialization script
- **Utilities** (`utils/`) - Rate limiting and geographic IP resolution

### 3. Dashboard (`dashboard/`)
- `index.html` - Single-page dashboard with responsive design
- `style.css` - CSS with dark/light theme support using CSS custom properties
- `app.js` - Vanilla JavaScript client with real-time updates and export functionality

## Key Design Principles

### Privacy Architecture
- **Session hashing**: IP addresses are SHA-256 hashed with daily salt rotation
- **No persistent tracking**: Uses sessionStorage only, no cookies or localStorage
- **Data aggregation**: Raw events are aggregated hourly and cleaned up automatically
- **Geographic data**: Extracted from proxy headers (Cloudflare, etc.) not IP geolocation

### Data Flow
1. Client-side tracker collects minimal data (URL, referrer, session ID)
2. Data is batched and sent via Beacon API to `/api/collect`
3. Server hashes session IDs with IP for privacy
4. Events are queued in memory and flushed to SQLite every 5 seconds
5. Hourly aggregation runs automatically, cleaning up raw events after 24 hours

### Database Design
- **Events table**: Raw page views with minimal data
- **Stats tables**: Hourly/daily aggregations for performance
- **Active visitors**: Real-time tracking with 5-minute window
- **WAL mode**: Better concurrency for read-heavy workloads

## Environment Configuration

Copy `.env.example` to `.env`. Key settings:
- `DATABASE_PATH`: SQLite database location (default: `./data/metrics.db`)
- `RAW_DATA_RETENTION`: Hours to keep raw events (default: 24)
- `RATE_LIMIT_*`: API rate limiting configuration

## API Structure

All stats endpoints support `?period=1h|24h|7d|30d|90d` parameter:
- `/api/collect` - POST endpoint for tracking data
- `/api/stats/realtime` - Active visitor count
- `/api/stats/overview` - Dashboard summary stats
- `/api/stats/pages|referrers|countries` - Top lists with optional `limit` parameter
- `/api/export` - Data export with `type` and `format` parameters

## Development Notes

- Uses ES modules throughout (`"type": "module"` in package.json)
- No external frameworks - vanilla JavaScript for dashboard
- SQLite with better-sqlite3 for synchronous operations
- Rate limiting implemented in-memory (not persistent)
- Real-time updates via polling every 30 seconds
- Tracking script must be rebuilt after changes (`npm run build:tracker`)