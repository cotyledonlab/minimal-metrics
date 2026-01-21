/**
 * Security middleware for Minimal Metrics
 *
 * Adds security headers to all responses.
 */

/**
 * Add security headers to response
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {() => void} next
 */
export function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking (allow same origin for dashboard embedding)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // XSS protection (legacy, but still useful for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  // Allow inline styles/scripts for the dashboard (vanilla JS app)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'self'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // Prevent caching of sensitive API responses
  const path = req.url?.split('?')[0] || '';
  if (path.startsWith('/api/stats') || path.startsWith('/api/export')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }

  next();
}

/**
 * Get allowed CORS origins from environment
 * @returns {string[]}
 */
export function getAllowedOrigins() {
  const origins = process.env.CORS_ORIGINS || '*';
  if (origins === '*') return ['*'];
  return origins.split(',').map(o => o.trim()).filter(Boolean);
}

/**
 * Set CORS headers based on request origin and allowed origins
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export function setCorsHeaders(req, res) {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req.headers.origin;

  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}
