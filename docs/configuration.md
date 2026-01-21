# Configuration Reference

All configuration is done through environment variables. Copy `.env.example` to `.env` and customize as needed.

## Server Settings

### PORT

- **Default:** `3000`
- **Description:** HTTP server port
- **Example:** `PORT=8080`

### HOST

- **Default:** `0.0.0.0`
- **Description:** Network interface to bind to
- **Example:** `HOST=127.0.0.1` (localhost only)

## Database Settings

### DATABASE_PATH

- **Default:** `./data/metrics.db`
- **Description:** Path to SQLite database file
- **Example:** `DATABASE_PATH=/var/lib/minimal-metrics/metrics.db`

**Note:** The directory must exist and be writable.

## Security Settings

### AUTH_TOKEN

- **Default:** (empty - no authentication)
- **Description:** When set, requires this token for dashboard and stats API access
- **Example:** `AUTH_TOKEN=your-secret-token-here`

**Usage:**
- Dashboard: Login form appears, enter token
- API: Include `Authorization: Bearer <token>` header

### CORS_ORIGINS

- **Default:** `*` (allow all)
- **Description:** Comma-separated list of allowed origins for CORS
- **Example:** `CORS_ORIGINS=https://mysite.com,https://blog.mysite.com`

**Note:** The `/api/collect` endpoint must allow your website's origin.

## Rate Limiting

### RATE_LIMIT_WINDOW

- **Default:** `60000` (1 minute)
- **Description:** Time window for rate limiting in milliseconds
- **Example:** `RATE_LIMIT_WINDOW=120000` (2 minutes)

### RATE_LIMIT_MAX

- **Default:** `100`
- **Description:** Maximum requests per window per IP
- **Example:** `RATE_LIMIT_MAX=200`

**Note:** Collection endpoint has separate, higher limits (200/min by default).

## Data Retention

### RAW_DATA_RETENTION

- **Default:** `24` (hours)
- **Description:** How long to keep raw event data before aggregation
- **Example:** `RAW_DATA_RETENTION=48`

Raw events are aggregated into hourly stats, then deleted. Increase this if you need access to individual events for longer.

### AGGREGATED_DATA_RETENTION

- **Default:** `8760` (1 year in hours)
- **Description:** How long to keep aggregated statistics
- **Example:** `AGGREGATED_DATA_RETENTION=17520` (2 years)

## Full Example

```env
# Server
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_PATH=./data/metrics.db

# Security
AUTH_TOKEN=super-secret-dashboard-token
CORS_ORIGINS=https://mywebsite.com,https://blog.mywebsite.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Data Retention
RAW_DATA_RETENTION=24
AGGREGATED_DATA_RETENTION=8760
```

## Docker Environment

When using Docker, set environment variables in `docker-compose.yml`:

```yaml
services:
  minimal-metrics:
    environment:
      - PORT=3000
      - AUTH_TOKEN=your-secret-token
      - CORS_ORIGINS=https://mysite.com
```

Or use an env file:

```yaml
services:
  minimal-metrics:
    env_file:
      - .env
```

## Security Best Practices

1. **Always set AUTH_TOKEN** in production
2. **Restrict CORS_ORIGINS** to only your domains
3. **Use HTTPS** (via reverse proxy like Nginx)
4. **Regular backups** of the SQLite database file
5. **Monitor rate limiting** logs for abuse patterns
