# Installation Guide

This guide covers all installation methods for Minimal Metrics.

## Prerequisites

- **Node.js 24+** (for manual installation)
- **Docker** (for containerized deployment)
- **Git** (to clone the repository)

## Docker Installation (Recommended)

Docker is the easiest way to get started.

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/minimal-metrics.git
cd minimal-metrics
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings (optional)
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
```

### 4. Verify Installation

Open `http://localhost:3000/dashboard` in your browser.

## Manual Installation

For more control over the installation process.

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/minimal-metrics.git
cd minimal-metrics
npm install
```

### 2. Initialize Database

```bash
npm run init:db
```

This creates the SQLite database at `./data/metrics.db` (or your configured path).

### 3. Build Tracking Script

```bash
npm run build:tracker
```

This minifies the tracker and generates `tracker/tracker.min.js`.

### 4. Start the Server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

## Adding Tracking to Your Website

Once your server is running, add this snippet to your website's `<head>`:

```html
<script async defer
  data-host="https://your-metrics-domain.com"
  src="https://your-metrics-domain.com/tracker.min.js">
</script>
```

Replace the URLs with your actual Minimal Metrics server address.

## Verifying the Installation

### Check Server Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1705689600000,
  "uptime": 123.456
}
```

### Check Tracker Script

```bash
curl http://localhost:3000/tracker.min.js | head -c 100
```

Should return minified JavaScript.

### Test Data Collection

Open your website with the tracker installed and check the dashboard for incoming page views.

## Troubleshooting

### Database Initialization Fails

Ensure the data directory is writable:

```bash
mkdir -p ./data
chmod 755 ./data
```

### Tracker Not Loading

Check browser console for errors. Common issues:
- CORS misconfiguration
- Wrong `data-host` URL
- Server not running

### No Data Appearing

- Verify the tracker is loading (Network tab)
- Check if DNT (Do Not Track) is enabled in your browser
- Ensure your site isn't served from `localhost` (session tracking requires stable origin)

## Next Steps

- [Configure your installation](configuration.md)
- [Set up production deployment](deployment.md)
- [Explore the API](api.md)
