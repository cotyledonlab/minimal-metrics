# Minimal Metrics

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://hub.docker.com)

**Privacy-first web analytics in under 2KB. No cookies. No consent banners. 100% GDPR compliant.**

---

## Why Minimal Metrics?

> Google Analytics tracks your users across the web. We just count page views.

Modern analytics tools collect far more data than you need, require cookie consent banners, and send your visitors' data to third parties. Minimal Metrics takes a different approach:

- **Your data stays yours** - Self-hosted on your infrastructure
- **No consent banners needed** - We don't collect personal data, so GDPR doesn't require consent
- **Blazing fast** - Our 1.5KB script loads 30x faster than Google Analytics
- **Simple by design** - See what matters: page views, referrers, and trends

---

## Quick Demo

```
┌─────────────────────────────────────────────────────────────┐
│  MINIMAL METRICS                            [Light/Dark]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   12,847    │  │    3,421    │  │      42     │         │
│  │ Page Views  │  │  Visitors   │  │   Active    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  Top Pages              Top Referrers                       │
│  ─────────────────      ─────────────────                   │
│  /                2.1k  google.com      892                 │
│  /blog            1.4k  twitter.com     341                 │
│  /pricing          891  direct          298                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 30-Second Setup

### Using Docker (Recommended)

```bash
git clone https://github.com/yourusername/minimal-metrics.git
cd minimal-metrics
docker-compose up -d
```

Open `http://localhost:3000/dashboard` - you're done!

### Manual Installation

```bash
npm install
npm run init:db
npm run build:tracker
npm start
```

---

## Add to Your Website

Drop this one line into your site's `<head>`:

```html
<script async defer data-host="https://your-metrics-server.com" src="https://your-metrics-server.com/tracker.min.js"></script>
```

That's it. No configuration. No cookies. No consent banners.

---

## What We Track vs. What We Don't

| We Track | We Don't Track |
|----------|----------------|
| Page views | Individual users |
| Referrer sources | Personal data |
| Country (from headers) | IP addresses |
| Screen size | Device fingerprints |
| Custom events | Cross-site behavior |
| Session count | Demographics |

---

## How We Protect Privacy

### No Cookies, Ever
We use `sessionStorage` that's automatically cleared when the tab closes. Nothing persists.

### IP Hashing with Daily Salt
```
IP 192.168.1.1 → SHA256(IP + date + salt) → a7f3b2...
```
Even we can't reverse it. Tomorrow, the same IP produces a different hash.

### Respects Do Not Track
If a browser sends the DNT header, our script doesn't run. Period.

### Automatic Data Cleanup
Raw events are deleted after 24 hours. Only aggregated, anonymous statistics remain.

---

## Comparison

| Feature | Minimal Metrics | Google Analytics | Plausible | Umami |
|---------|----------------|------------------|-----------|-------|
| **Script Size** | 1.5KB | 45KB+ | 1KB | 2KB |
| **Self-hosted** | Yes | No | Yes ($) | Yes |
| **Cookies** | None | Multiple | None | None |
| **GDPR Consent Needed** | No | Yes | No | No |
| **Open Source** | MIT | No | AGPL | MIT |
| **Real-time Dashboard** | Yes | Yes | Yes | Yes |
| **UTM Tracking** | Yes | Yes | Yes | Yes |
| **Custom Events** | Yes | Yes | Yes | Yes |
| **Conversion Goals** | Basic | Advanced | Yes | Yes |
| **Price** | Free | Free* | $9+/mo | Free |

*Google Analytics is "free" but you pay with your users' data.

---

## What We Intentionally Don't Build

Minimal Metrics is opinionated. These aren't missing features—they're design decisions:

- **No demographics** - We don't know (or care) about age/gender
- **No cross-device tracking** - Each device is treated as anonymous
- **No session recordings** - We count visitors, we don't watch them
- **No fingerprinting** - No canvas, fonts, or WebGL detection
- **No user accounts** - Single-tenant, no shared infrastructure
- **No A/B testing** - Use a dedicated tool for experiments

---

## Configuration

Copy `.env.example` to `.env`:

```env
# Server
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_PATH=./data/metrics.db

# Security
AUTH_TOKEN=              # Optional: Set to require dashboard authentication
CORS_ORIGINS=*           # Comma-separated allowed origins, or * for all

# Rate Limiting
RATE_LIMIT_WINDOW=60000  # Time window in ms
RATE_LIMIT_MAX=100       # Max requests per window

# Data Retention (hours)
RAW_DATA_RETENTION=24           # Keep raw events for 24 hours
AGGREGATED_DATA_RETENTION=8760  # Keep aggregated data for 1 year
```

---

## API Reference

### Tracking Endpoint

```
POST /api/collect
```

Receives tracking data from the client script. Rate limited.

### Statistics Endpoints

All endpoints support `?period=1h|24h|7d|30d|90d`

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats/realtime` | Current active visitors (5-min window) |
| `GET /api/stats/overview` | Dashboard summary with top pages/referrers |
| `GET /api/stats/pages?limit=20` | Top pages by view count |
| `GET /api/stats/referrers?limit=20` | Top traffic sources |
| `GET /api/stats/countries` | Visitor count by country |
| `GET /api/stats/hourly?date=YYYY-MM-DD` | Hourly breakdown for a specific day |
| `GET /api/stats/campaigns` | UTM campaign performance |

### Export Endpoint

```
GET /api/export?type=pages&format=csv&period=30d
```

- **type**: `overview`, `pages`, `referrers`, `countries`
- **format**: `json`, `csv`
- **period**: `1h`, `24h`, `7d`, `30d`, `90d`

### Health Check

```
GET /health
```

Returns server status, timestamp, and uptime.

---

## Deployment

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  minimal-metrics:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - metrics_data:/app/data
    environment:
      - AUTH_TOKEN=your-secret-token
    restart: unless-stopped

volumes:
  metrics_data:
```

### Behind Nginx

```nginx
server {
    listen 80;
    server_name metrics.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Systemd Service

```ini
[Unit]
Description=Minimal Metrics
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/minimal-metrics
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## Custom Event Tracking

Track button clicks, form submissions, or any custom action:

```javascript
// Basic event
window.mm.track('signup_clicked');

// Event with properties
window.mm.track('purchase', {
  plan: 'pro',
  value: 29
});
```

Events appear in your dashboard and can be exported via the API.

---

## Development

```bash
# Development mode with auto-restart
npm run dev

# Build tracking script (required after tracker changes)
npm run build:tracker

# Initialize/reset database
npm run init:db

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint
```

---

## Architecture

```
minimal-metrics/
├── tracker/           # Client-side tracking script (<2KB)
│   ├── tracker.js     # Source code
│   └── build.js       # Minification with Terser
├── server/            # Node.js backend
│   ├── index.js       # HTTP server & routing
│   ├── api/           # REST endpoints
│   ├── db/            # SQLite operations
│   ├── middleware/    # Auth, security headers
│   └── utils/         # Rate limiting, validation
├── dashboard/         # Vanilla JS frontend
│   ├── index.html
│   ├── app.js
│   └── style.css
├── tests/             # Test suite
└── docs/              # Extended documentation
```

---

## Documentation

- [Installation Guide](docs/installation.md)
- [Configuration Reference](docs/configuration.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Privacy Architecture](docs/privacy.md)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Run tests: `npm test`
4. Commit changes: `git commit -am 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Submit a pull request

Please ensure all tests pass and add tests for new functionality.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- [Issue Tracker](https://github.com/yourusername/minimal-metrics/issues)
- [Discussions](https://github.com/yourusername/minimal-metrics/discussions)

---

**Built for developers who believe analytics shouldn't require a privacy policy.**
