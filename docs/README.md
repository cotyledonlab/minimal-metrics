# Minimal Metrics Documentation

Welcome to the Minimal Metrics documentation. This guide covers everything you need to deploy, configure, and extend your privacy-first analytics dashboard.

## Quick Links

- [Installation Guide](installation.md) - Get up and running in minutes
- [Configuration Reference](configuration.md) - All environment variables explained
- [API Documentation](api.md) - REST API endpoints and usage
- [Deployment Guide](deployment.md) - Production deployment options
- [Privacy Architecture](privacy.md) - How we protect user privacy

## Overview

Minimal Metrics is a self-hosted, privacy-first web analytics solution. It provides essential metrics (page views, referrers, geographic data) without tracking individual users or requiring cookie consent.

### Key Principles

1. **Privacy by Default** - No cookies, no personal data, no consent banners needed
2. **Self-Hosted** - Your data stays on your infrastructure
3. **Minimal Footprint** - Sub-2KB tracking script, SQLite database
4. **Simple API** - RESTful endpoints for all data access

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Website   │────►│   Server    │────►│   SQLite    │
│  (tracker)  │     │  (Node.js)  │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │Dashboard │  │   API    │
              │  (SPA)   │  │ Clients  │
              └──────────┘  └──────────┘
```

## Getting Help

- [GitHub Issues](https://github.com/yourusername/minimal-metrics/issues) - Bug reports and feature requests
- [GitHub Discussions](https://github.com/yourusername/minimal-metrics/discussions) - Questions and community support
