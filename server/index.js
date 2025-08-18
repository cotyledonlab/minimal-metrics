import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { handleCollect } from './api/collect.js';
import { handleStats } from './api/stats.js';
import { handleExport } from './api/export.js';
import { createRateLimiter } from './utils/rateLimit.js';
import { aggregateHourlyStats, cleanupOldData } from './db/queries.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const collectRateLimit = createRateLimiter(60000, 200);
const apiRateLimit = createRateLimiter(60000, 100);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, filePath) {
  try {
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = readFileSync(filePath);
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    });
    res.end(content);
  } catch (error) {
    console.error('Static file error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}

function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  
  console.log(`${new Date().toISOString()} ${req.method} ${path}`);
  
  if (path === '/api/collect') {
    collectRateLimit(req, res, () => handleCollect(req, res));
  } else if (path.startsWith('/api/stats/')) {
    apiRateLimit(req, res, () => handleStats(req, res));
  } else if (path === '/api/export') {
    apiRateLimit(req, res, () => handleExport(req, res));
  } else if (path === '/tracker.min.js') {
    const trackerPath = join(__dirname, '../tracker/tracker.min.js');
    serveStatic(req, res, trackerPath);
  } else if (path === '/' || path === '/dashboard') {
    const dashboardPath = join(__dirname, '../dashboard/index.html');
    serveStatic(req, res, dashboardPath);
  } else if (path.startsWith('/dashboard/')) {
    const filePath = join(__dirname, '../dashboard', path.replace('/dashboard/', ''));
    serveStatic(req, res, filePath);
  } else if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: Date.now(),
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

const server = createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`🚀 Minimal Metrics server running on http://${HOST}:${PORT}`);
  console.log(`📊 Dashboard: http://${HOST}:${PORT}/dashboard`);
  console.log(`🔗 Tracker: http://${HOST}:${PORT}/tracker.min.js`);
});

setInterval(() => {
  try {
    aggregateHourlyStats();
  } catch (error) {
    console.error('Hourly aggregation failed:', error);
  }
}, 3600000);

setInterval(() => {
  try {
    cleanupOldData();
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}, 86400000);

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});