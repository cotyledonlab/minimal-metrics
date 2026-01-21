# Privacy Architecture

This document explains how Minimal Metrics protects user privacy while still providing useful analytics.

## Core Principles

1. **No Personal Data Collection** - We never collect names, emails, or other PII
2. **No Cross-Site Tracking** - Each site is isolated, no user graphs
3. **No Persistent Identifiers** - Session-only tracking, nothing persists
4. **Minimal Data** - Collect only what's needed for basic analytics

## What We Collect

| Data Point | Purpose | Privacy Consideration |
|------------|---------|----------------------|
| Page URL | Track which pages are visited | Anonymized in aggregates |
| Referrer | Identify traffic sources | Domain only, not full URL |
| Session ID | Count unique visitors | Hashed, session-only |
| Screen Size | Device category stats | Bucketed, not exact |
| Timezone | Geographic approximation | Continent-level only |
| Country | Geographic stats | From proxy headers |
| Timestamp | Time-based analytics | Required for any analytics |

## What We Don't Collect

- IP addresses (hashed and discarded)
- User agents (no browser fingerprinting)
- Device IDs
- Cookies
- localStorage data
- Canvas fingerprints
- WebGL fingerprints
- Font lists
- Installed plugins
- Personal identifiers of any kind

## Session Hashing Algorithm

When a page view is recorded, we create a session hash:

```
session_hash = SHA256(session_id + IP_address + date_string + daily_salt)
```

### Properties

1. **One-way** - Cannot be reversed to get original IP
2. **Daily rotation** - Same user gets different hash each day
3. **Cross-site isolation** - Different sites can't correlate users
4. **No persistence** - Session ID only exists in sessionStorage

### Example

```javascript
// Day 1
Session: "abc123" + IP: "192.168.1.1" + Date: "2024-01-19" + Salt: "xyz789"
Hash: "a7f3b2c1d4e5f6..." // Stored in database

// Day 2 (same user, same IP)
Session: "abc123" + IP: "192.168.1.1" + Date: "2024-01-20" + Salt: "new456"
Hash: "b8c4d3e2f1a0..." // Completely different hash
```

## Data Lifecycle

### Raw Events (24 hours)

```
[Page View] → [Queue] → [SQLite events table]
                              ↓
                    [Hourly Aggregation]
                              ↓
                    [Delete raw events]
```

Raw events contain:
- Timestamp
- Page URL
- Referrer
- Session hash
- Country code
- Screen size
- Timezone

After 24 hours (configurable), raw events are:
1. Aggregated into hourly statistics
2. Permanently deleted

### Aggregated Statistics (1 year)

Aggregated data contains only:
- Time period (hour/day)
- Page URL
- Referrer domain
- Country code
- View count
- Unique visitor count

**No session hashes are stored in aggregated data.**

### Cleanup Schedule

| Data Type | Default Retention | Configurable |
|-----------|-------------------|--------------|
| Raw events | 24 hours | Yes (RAW_DATA_RETENTION) |
| Hourly stats | 30 days | No (rolled into daily) |
| Daily stats | 1 year | Yes (AGGREGATED_DATA_RETENTION) |
| Active visitors | 5 minutes | No (real-time window) |

## Do Not Track (DNT)

The tracker script respects the DNT header:

```javascript
if (navigator.doNotTrack === "1") {
  // Exit immediately, no tracking
  return;
}
```

This is checked **before** any data collection or network requests.

## GDPR Compliance

Minimal Metrics is designed to be GDPR-compliant **without requiring consent** because:

1. **No personal data** - We don't collect data that identifies individuals
2. **No profiling** - We don't build user profiles or make automated decisions
3. **Legitimate interest** - Basic analytics serve a legitimate business purpose
4. **Proportionality** - We collect minimal data for the stated purpose

### Legal Basis

Under GDPR Article 6(1)(f), processing is lawful when:
- It serves a legitimate interest (understanding site traffic)
- It doesn't override user rights (no personal data collected)
- It's proportionate (minimal data, short retention)

**Consult a legal professional for your specific situation.**

## Geographic Data

Country codes come from HTTP headers set by:
- Cloudflare (`CF-IPCountry`)
- AWS CloudFront (`CloudFront-Viewer-Country`)
- Other CDN/proxy headers

We **do not**:
- Perform IP geolocation lookups
- Store IP addresses
- Track city-level location

## Comparison with Other Analytics

| Privacy Feature | Minimal Metrics | Google Analytics | Plausible |
|-----------------|----------------|------------------|-----------|
| Cookies | None | Multiple | None |
| IP Storage | Hashed + deleted | Stored | Hashed |
| User Profiles | No | Yes | No |
| Cross-site tracking | No | Yes | No |
| Data sharing | No | With Google | No |
| Consent required | No | Yes | No |
| Data location | Your server | Google Cloud | EU/Your server |

## Security Measures

### Transport Security

- All data sent via HTTPS (when properly configured)
- Beacon API with XHR fallback
- No sensitive data in URL parameters

### Storage Security

- SQLite database with restricted permissions
- No sensitive data stored
- Automatic data cleanup

### Access Control

- Optional authentication for dashboard/API
- Rate limiting on all endpoints
- CORS restrictions configurable

## Auditing Your Installation

### Verify No Cookies

```javascript
// In browser console on a tracked page
document.cookie // Should not contain any minimal-metrics cookies
```

### Verify Session Storage Only

```javascript
// In browser console
sessionStorage.getItem('mm_session') // Session ID (tab-only)
localStorage.getItem('mm_session')    // Should be null
```

### Verify Data Collected

```bash
# Check what's in the database
sqlite3 data/metrics.db "SELECT * FROM events LIMIT 5;"

# Verify no IP addresses
sqlite3 data/metrics.db "SELECT DISTINCT session_hash FROM events LIMIT 5;"
# Should show hashes like "a7f3b2c1...", not IPs
```

## Questions?

If you have privacy concerns or questions about data handling, please open an issue on GitHub.
