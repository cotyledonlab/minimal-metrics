# API Documentation

Minimal Metrics provides a RESTful API for data collection, statistics retrieval, and data export.

## Authentication

If `AUTH_TOKEN` is configured, all `/api/stats/*` and `/api/export` endpoints require authentication.

### Header Authentication

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3000/api/stats/overview
```

### Cookie Authentication

After logging in via the dashboard, the `mm_token` cookie is set automatically.

## Endpoints

### Data Collection

#### POST /api/collect

Receives tracking data from the client-side tracker. This endpoint is rate-limited and CORS-enabled.

**Request Body:**

```json
{
  "url": "https://example.com/page",
  "ref": "https://google.com",
  "sid": "abc123",
  "scr": "1920x1080",
  "tz": "America/New_York",
  "ts": 1705689600000,
  "utm_source": "twitter",
  "utm_medium": "social",
  "utm_campaign": "launch"
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Page URL (required) |
| `ref` | string | Referrer URL |
| `sid` | string | Session ID (required) |
| `scr` | string | Screen resolution |
| `tz` | string | Timezone |
| `ts` | number | Timestamp in ms |
| `utm_*` | string | UTM parameters |
| `evt` | string | Event name (for custom events) |
| `props` | object | Event properties (for custom events) |

**Response:**

```json
{ "status": "ok" }
```

---

### Statistics

All statistics endpoints support the `period` query parameter:

| Value | Description |
|-------|-------------|
| `1h` | Last hour |
| `24h` | Last 24 hours |
| `7d` | Last 7 days (default) |
| `30d` | Last 30 days |
| `90d` | Last 90 days |

#### GET /api/stats/realtime

Returns the count of active visitors in the last 5 minutes.

**Response:**

```json
{
  "active_visitors": 42,
  "timestamp": 1705689600000
}
```

#### GET /api/stats/overview

Returns a summary of all key metrics.

**Query Parameters:**
- `period` - Time period (default: `7d`)
- `compare` - Include comparison to previous period (`true`/`false`)

**Response:**

```json
{
  "period": "7d",
  "page_views": 12847,
  "unique_visitors": 3421,
  "pages_per_visitor": 3.76,
  "top_pages": [
    { "page": "/", "views": 2100 },
    { "page": "/blog", "views": 1400 }
  ],
  "top_referrers": [
    { "referrer": "google.com", "visits": 892 },
    { "referrer": "direct", "visits": 641 }
  ],
  "comparison": {
    "page_views_change": 12.5,
    "visitors_change": 8.3
  },
  "timestamp": 1705689600000
}
```

#### GET /api/stats/pages

Returns top pages by view count.

**Query Parameters:**
- `period` - Time period (default: `7d`)
- `limit` - Number of results (default: `20`, max: `100`)

**Response:**

```json
{
  "period": "7d",
  "pages": [
    { "page": "/", "views": 2100, "unique_visitors": 1800 },
    { "page": "/blog", "views": 1400, "unique_visitors": 1100 }
  ],
  "timestamp": 1705689600000
}
```

#### GET /api/stats/referrers

Returns top traffic sources.

**Query Parameters:**
- `period` - Time period (default: `7d`)
- `limit` - Number of results (default: `20`, max: `100`)

**Response:**

```json
{
  "period": "7d",
  "referrers": [
    { "referrer": "google.com", "visits": 892 },
    { "referrer": "twitter.com", "visits": 341 },
    { "referrer": "direct", "visits": 298 }
  ],
  "timestamp": 1705689600000
}
```

#### GET /api/stats/countries

Returns visitor count by country.

**Query Parameters:**
- `period` - Time period (default: `7d`)

**Response:**

```json
{
  "period": "7d",
  "countries": [
    { "country": "US", "visitors": 1200 },
    { "country": "GB", "visitors": 450 },
    { "country": "DE", "visitors": 320 }
  ],
  "timestamp": 1705689600000
}
```

#### GET /api/stats/hourly

Returns hourly breakdown for a specific date.

**Query Parameters:**
- `date` - Date in YYYY-MM-DD format (default: today)

**Response:**

```json
{
  "date": "2024-01-19",
  "hours": [
    { "hour": 0, "views": 45, "visitors": 32 },
    { "hour": 1, "views": 38, "visitors": 28 }
  ],
  "timestamp": 1705689600000
}
```

#### GET /api/stats/campaigns

Returns UTM campaign performance.

**Query Parameters:**
- `period` - Time period (default: `7d`)

**Response:**

```json
{
  "period": "7d",
  "campaigns": [
    {
      "source": "twitter",
      "medium": "social",
      "campaign": "launch",
      "visits": 234,
      "unique_visitors": 189
    }
  ],
  "timestamp": 1705689600000
}
```

---

### Export

#### GET /api/export

Export data in JSON or CSV format.

**Query Parameters:**
- `type` - Data type: `overview`, `pages`, `referrers`, `countries`
- `format` - Output format: `json`, `csv`
- `period` - Time period (default: `30d`)

**Example:**

```bash
# Export pages as CSV
curl "http://localhost:3000/api/export?type=pages&format=csv&period=30d"
```

**CSV Response:**

```csv
page,views,unique_visitors
/,2100,1800
/blog,1400,1100
```

---

### Health Check

#### GET /health

Returns server status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": 1705689600000,
  "uptime": 86400.123
}
```

## Error Responses

All errors return JSON with an `error` field:

```json
{ "error": "Unauthorized" }
```

**Status Codes:**
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not found
- `413` - Request too large
- `429` - Rate limited
- `500` - Internal server error

## Rate Limiting

- **Collection endpoint:** 200 requests per minute per IP
- **Other endpoints:** 100 requests per minute per IP

Rate limited responses include:

```json
{ "error": "Too many requests" }
```
