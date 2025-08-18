const requests = new Map();

export function createRateLimiter(windowMs = 60000, maxRequests = 100) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.headers['x-real-ip'] || 
               req.socket?.remoteAddress || 
               'unknown';
    
    const now = Date.now();
    const key = `${ip}:${req.path}`;
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const timestamps = requests.get(key).filter(t => t > now - windowMs);
    
    if (timestamps.length >= maxRequests) {
      res.writeHead(429, { 
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(windowMs / 1000)
      });
      res.end(JSON.stringify({ 
        error: 'Too many requests', 
        retryAfter: Math.ceil(windowMs / 1000) 
      }));
      return;
    }
    
    timestamps.push(now);
    requests.set(key, timestamps);
    
    if (requests.size > 1000) {
      const oldestAllowed = now - windowMs;
      for (const [k, v] of requests.entries()) {
        const filtered = v.filter(t => t > oldestAllowed);
        if (filtered.length === 0) {
          requests.delete(k);
        } else {
          requests.set(k, filtered);
        }
      }
    }
    
    next();
  };
}