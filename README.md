# Minimal Metrics

A privacy-first, lightweight analytics dashboard as an alternative to Google Analytics. Built with simplicity, speed, and user privacy as core principles.

## Features

- 🚀 **Ultra-lightweight tracking script** (< 2KB minified)
- 🔒 **Privacy-first** - No cookies, no personal data collection, no cross-site tracking
- ⚡ **Real-time dashboard** with essential metrics
- 📊 **Core analytics** - Page views, referrers, popular pages, basic geographic data
- 🌍 **Self-hostable** - Deploy on your own infrastructure
- 🐳 **Docker support** for easy deployment
- 📤 **Export functionality** (CSV/JSON)
- 🎨 **Clean, responsive design** with dark/light mode

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/minimal-metrics.git
cd minimal-metrics
```

2. Start with Docker Compose:
```bash
docker-compose up -d
```

3. Access the dashboard at `http://localhost:3000/dashboard`

### Manual Installation

1. **Prerequisites**: Node.js 18+ and npm

2. **Install dependencies**:
```bash
npm install
```

3. **Initialize database**:
```bash
npm run init:db
```

4. **Build tracking script**:
```bash
npm run build:tracker
```

5. **Start the server**:
```bash
npm start
```

## Adding Tracking to Your Website

Add this snippet to your website's `<head>` section:

```html
<!-- Minimal Metrics -->
<script async defer data-host="https://your-domain.com" src="https://your-domain.com/tracker.min.js"></script>
```

Replace `https://your-domain.com` with your Minimal Metrics server URL.

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_PATH=./data/metrics.db

# Security
CORS_ORIGIN=*
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Data Retention (hours)
RAW_DATA_RETENTION=24
AGGREGATED_DATA_RETENTION=8760
```

## API Endpoints

### Collection
- `POST /api/collect` - Receive tracking data

### Statistics
- `GET /api/stats/realtime` - Current active visitors
- `GET /api/stats/overview?period=7d` - Dashboard overview
- `GET /api/stats/pages?period=7d&limit=20` - Top pages
- `GET /api/stats/referrers?period=7d&limit=20` - Top referrers
- `GET /api/stats/countries?period=7d` - Geographic data
- `GET /api/stats/hourly?date=2024-01-01` - Hourly breakdown

### Export
- `GET /api/export?type=overview&format=json&period=30d` - Export data

#### Supported Parameters:
- **period**: `1h`, `24h`, `7d`, `30d`, `90d`
- **format**: `json`, `csv`
- **type**: `overview`, `pages`, `referrers`, `countries`

## Privacy Features

- **No cookies or localStorage** - Uses session-based tracking only
- **IP address hashing** - IPs are SHA-256 hashed and salted
- **No personal data** - Only aggregated metrics are stored
- **GDPR compliant** - No personal data collection
- **Respects DNT header** - Honors Do Not Track requests
- **Data retention limits** - Configurable data cleanup

## Data Storage

- **SQLite database** for lightweight, file-based storage
- **Automatic aggregation** - Raw events aggregated hourly
- **Configurable retention** - Cleanup old data automatically
- **WAL mode** for better concurrent access

## Development

```bash
# Development mode with auto-restart
npm run dev

# Build tracking script
npm run build:tracker

# Initialize/reset database
npm run init:db

# Run tests
npm test
```

## Deployment

### Docker Deployment

1. **Build and deploy**:
```bash
docker build -f docker/Dockerfile -t minimal-metrics .
docker run -d -p 3000:3000 -v metrics_data:/app/data minimal-metrics
```

2. **Using Docker Compose**:
```bash
docker-compose up -d
```

### VPS Deployment

1. **Install on Ubuntu/Debian**:
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone https://github.com/yourusername/minimal-metrics.git
cd minimal-metrics
npm install --production
npm run init:db
npm run build:tracker

# Setup systemd service
sudo cp minimal-metrics.service /etc/systemd/system/
sudo systemctl enable minimal-metrics
sudo systemctl start minimal-metrics
```

2. **Nginx reverse proxy**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Performance

- **Sub-2KB tracking script** - Minimal impact on page load
- **Efficient batching** - Events batched every 5 seconds
- **SQLite optimization** - WAL mode, proper indexing
- **Memory caching** - In-memory stats for real-time data
- **Rate limiting** - Protection against abuse

## Comparison with Google Analytics

| Feature | Minimal Metrics | Google Analytics |
|---------|----------------|------------------|
| Privacy | ✅ No tracking | ❌ Extensive tracking |
| Size | ✅ <2KB | ❌ ~45KB+ |
| Self-hosted | ✅ Yes | ❌ No |
| GDPR Ready | ✅ Yes | ⚠️ Requires consent |
| Real-time | ✅ Yes | ✅ Yes |
| Page views | ✅ Yes | ✅ Yes |
| Referrers | ✅ Yes | ✅ Yes |
| Countries | ✅ Yes | ✅ Yes |
| Demographics | ❌ No | ✅ Yes |
| Conversion tracking | ❌ Basic | ✅ Advanced |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/yourusername/minimal-metrics/wiki)
- 🐛 [Issue Tracker](https://github.com/yourusername/minimal-metrics/issues)
- 💬 [Discussions](https://github.com/yourusername/minimal-metrics/discussions)

---

Built with ❤️ for developers who value privacy and simplicity.