# GitHub Copilot Instructions

This file provides context to GitHub Copilot when working with this repository.

## Project Overview

Minimal Metrics is a privacy-first, lightweight analytics dashboard built as an alternative to Google Analytics. The project prioritizes simplicity, speed, and user privacy.

## Technology Stack

- **Runtime**: Node.js 18+ with ES modules (`"type": "module"`)
- **Database**: SQLite with better-sqlite3 (synchronous operations, WAL mode)
- **Frontend**: Vanilla JavaScript (no frameworks), responsive design with dark/light theme
- **Build**: Terser for minification of tracking script
- **Deployment**: Docker support with docker-compose

## Architecture

### Tracking Script (`tracker/`)
- Ultra-lightweight client-side tracking (<2KB minified)
- Privacy-first: no cookies, respects DNT header, session-only tracking
- Uses Beacon API with XHR fallback, exponential backoff retry
- Must be rebuilt after changes: `npm run build:tracker`

### Server Backend (`server/`)
- `index.js` - HTTP server with routing and static file serving
- `api/collect.js` - Receives tracking data, batches writes every 5 seconds
- `api/stats.js` - Serves analytics data with configurable time periods
- `api/export.js` - Data export in JSON/CSV formats
- `db/queries.js` - Database operations with session hashing
- `db/schema.sql` - Database structure with proper indexing
- `utils/` - Rate limiting and geographic IP resolution

### Dashboard (`dashboard/`)
- Single-page application with responsive design
- Real-time updates via polling every 30 seconds
- Export functionality for data backup

## Privacy Design

- **Session hashing**: IP addresses are SHA-256 hashed with daily salt rotation
- **No persistent tracking**: sessionStorage only, no cookies or localStorage
- **Data aggregation**: Raw events aggregated hourly, cleaned up after 24 hours
- **Geographic data**: From proxy headers (Cloudflare, etc.), not IP geolocation
- **GDPR compliant**: No personal data collection

## Development Commands

```bash
npm run dev          # Start development server with auto-restart
npm run build:tracker # Build tracking script (required before deployment)
npm run init:db      # Initialize/reset database
npm start           # Start production server
```

## Environment Variables

Copy `.env.example` to `.env`:
- `DATABASE_PATH`: SQLite database location (default: `./data/metrics.db`)
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `RAW_DATA_RETENTION`: Hours to keep raw events (default: 24)
- `RATE_LIMIT_*`: API rate limiting configuration

## API Endpoints

All stats endpoints support `?period=1h|24h|7d|30d|90d` parameter:
- `POST /api/collect` - Receive tracking data
- `GET /api/stats/realtime` - Active visitor count
- `GET /api/stats/overview` - Dashboard summary stats
- `GET /api/stats/pages` - Top pages with optional `limit` parameter
- `GET /api/stats/referrers` - Top referrers with optional `limit` parameter
- `GET /api/stats/countries` - Geographic data
- `GET /api/export` - Data export with `type` and `format` parameters

## Code Style Guidelines

- Use ES modules (`import`/`export`)
- No external frameworks for dashboard
- Synchronous database operations (better-sqlite3)
- Rate limiting implemented in-memory (not persistent)
- Descriptive variable names
- Error handling with try-catch blocks
- Logging important events to console

## Data Flow

1. Client-side tracker collects minimal data (URL, referrer, session ID)
2. Data batched and sent via Beacon API to `/api/collect`
3. Server hashes session IDs with IP for privacy
4. Events queued in memory, flushed to SQLite every 5 seconds
5. Hourly aggregation runs automatically, cleans up raw events after 24 hours

## Important Notes

- Always rebuild tracking script after changes: `npm run build:tracker`
- Database uses WAL mode for better concurrency
- Real-time updates poll every 30 seconds
- Rate limiting is in-memory (resets on restart)
- Tracking script must remain <2KB when minified
