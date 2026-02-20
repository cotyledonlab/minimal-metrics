/**
 * Authentication middleware for Minimal Metrics
 *
 * When AUTH_TOKEN is set, requires authentication for dashboard and stats API.
 * When not set, allows public access (backward compatible).
 */

/**
 * Parse cookies from request header
 * @param {string|undefined} cookieHeader
 * @returns {Record<string, string>}
 */
function parseCookies(cookieHeader) {
  const cookies = /** @type {Record<string, string>} */ ({});
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });

  return cookies;
}

/**
 * Check if request is authenticated
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function isAuthenticated(req) {
  const token = process.env.AUTH_TOKEN;

  // No token configured = public access
  if (!token) return true;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7);
    if (bearerToken === token) return true;
  }

  // Check cookie
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.mm_token === token) return true;

  return false;
}

/**
 * Authentication middleware
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {() => void} next
 */
export function requireAuth(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }

  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

/**
 * Handle login request
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export function handleLogin(req, res) {
  const token = process.env.AUTH_TOKEN;

  // No auth configured
  if (!token) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'No authentication required' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
    // Limit body size
    if (body.length > 1024) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request too large' }));
      req.destroy();
    }
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body);

      if (data.token === token) {
        // Set secure cookie (adjust for production)
        const isSecure = req.headers['x-forwarded-proto'] === 'https';
        const cookieOptions = [
          `mm_token=${token}`,
          'Path=/',
          'HttpOnly',
          'SameSite=Strict',
          `Max-Age=${60 * 60 * 24 * 7}` // 7 days
        ];

        if (isSecure) {
          cookieOptions.push('Secure');
        }

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieOptions.join('; ')
        });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token' }));
      }
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
}

/**
 * Handle logout request
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export function handleLogout(req, res) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Set-Cookie': 'mm_token=; Path=/; HttpOnly; Max-Age=0'
  });
  res.end(JSON.stringify({ success: true }));
}

/**
 * Check if authentication is enabled
 * @returns {boolean}
 */
export function isAuthEnabled() {
  return !!process.env.AUTH_TOKEN;
}
