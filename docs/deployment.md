# Deployment Guide

This guide covers production deployment options for Minimal Metrics.

## Docker Deployment (Recommended)

### Basic Docker Compose

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
      - AUTH_TOKEN=${AUTH_TOKEN}
      - CORS_ORIGINS=${CORS_ORIGINS}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  metrics_data:
```

### Production Docker Compose

```yaml
version: '3.8'
services:
  minimal-metrics:
    image: yourusername/minimal-metrics:latest
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - /var/lib/minimal-metrics:/app/data
    environment:
      - AUTH_TOKEN=${AUTH_TOKEN}
      - CORS_ORIGINS=https://yoursite.com
      - NODE_ENV=production
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## VPS/Bare Metal Deployment

### 1. System Setup

```bash
# Install Node.js 24 LTS
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create application user
sudo useradd -r -s /bin/false minimal-metrics

# Create application directory
sudo mkdir -p /opt/minimal-metrics
sudo chown minimal-metrics:minimal-metrics /opt/minimal-metrics
```

### 2. Application Setup

```bash
# Clone and install
cd /opt/minimal-metrics
sudo -u minimal-metrics git clone https://github.com/yourusername/minimal-metrics.git .
sudo -u minimal-metrics npm install --production

# Configure
sudo -u minimal-metrics cp .env.example .env
sudo nano .env  # Edit configuration

# Initialize
sudo -u minimal-metrics npm run init:db
sudo -u minimal-metrics npm run build:tracker
```

### 3. Systemd Service

Create `/etc/systemd/system/minimal-metrics.service`:

```ini
[Unit]
Description=Minimal Metrics Analytics
After=network.target

[Service]
Type=simple
User=minimal-metrics
Group=minimal-metrics
WorkingDirectory=/opt/minimal-metrics
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=minimal-metrics

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/minimal-metrics/data

# Environment
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable minimal-metrics
sudo systemctl start minimal-metrics

# Check status
sudo systemctl status minimal-metrics
sudo journalctl -u minimal-metrics -f
```

## Reverse Proxy Setup

### Nginx

```nginx
upstream minimal_metrics {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name metrics.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name metrics.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/metrics.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/metrics.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Tracker script (cache heavily)
    location = /tracker.min.js {
        proxy_pass http://minimal_metrics;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://minimal_metrics;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Dashboard and other routes
    location / {
        proxy_pass http://minimal_metrics;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy

```caddyfile
metrics.yourdomain.com {
    reverse_proxy localhost:3000

    header /tracker.min.js Cache-Control "public, max-age=86400"
}
```

## SSL/TLS with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d metrics.yourdomain.com

# Auto-renewal is configured automatically
```

## Database Backups

### Automated Backup Script

Create `/opt/minimal-metrics/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/minimal-metrics"
DB_PATH="/opt/minimal-metrics/data/metrics.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# SQLite online backup
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/metrics_$DATE.db'"

# Compress
gzip "$BACKUP_DIR/metrics_$DATE.db"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
```

### Cron Job

```bash
# Edit crontab
sudo crontab -e

# Add daily backup at 3 AM
0 3 * * * /opt/minimal-metrics/backup.sh
```

## Monitoring

### Health Check Endpoint

Use the `/health` endpoint for monitoring:

```bash
# Simple check
curl -f http://localhost:3000/health || echo "Service down!"

# With monitoring tools (e.g., Uptime Kuma)
# URL: http://localhost:3000/health
# Expected: {"status":"ok"...}
```

### Log Monitoring

```bash
# View recent logs
sudo journalctl -u minimal-metrics -n 100

# Follow logs
sudo journalctl -u minimal-metrics -f

# Filter errors
sudo journalctl -u minimal-metrics | grep -i error
```

## Scaling Considerations

Minimal Metrics is designed for single-server deployment. For high-traffic sites:

1. **Database**: SQLite handles thousands of writes per second in WAL mode
2. **Memory**: Event batching (5-second flush) reduces database load
3. **Caching**: Dashboard polling every 30 seconds, not real-time WebSocket
4. **Rate Limiting**: Built-in protection against abuse

For extremely high traffic (millions of page views/day):
- Consider PostgreSQL migration
- Add Redis for rate limiting state
- Use a CDN for the tracker script
