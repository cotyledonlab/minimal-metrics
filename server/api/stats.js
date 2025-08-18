import { 
  getActiveVisitors, 
  getPageViews, 
  getTopPages, 
  getTopReferrers, 
  getCountryStats,
  getHourlyStats 
} from '../db/queries.js';

function parseTimeRange(period = '7d') {
  const now = Date.now();
  const periods = {
    '1h': 3600000,
    '24h': 86400000,
    '7d': 7 * 86400000,
    '30d': 30 * 86400000,
    '90d': 90 * 86400000
  };
  
  const duration = periods[period] || periods['7d'];
  return {
    startTime: now - duration,
    endTime: now
  };
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60'
  });
  res.end(JSON.stringify(data));
}

export function handleStats(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const endpoint = url.pathname.split('/').pop();
  const period = url.searchParams.get('period') || '7d';
  const { startTime, endTime } = parseTimeRange(period);
  
  try {
    switch (endpoint) {
      case 'realtime':
        const activeVisitors = getActiveVisitors();
        sendJson(res, {
          active_visitors: activeVisitors.count || 0,
          timestamp: Date.now()
        });
        break;
        
      case 'overview':
        const pageViews = getPageViews(startTime, endTime);
        const topPages = getTopPages(startTime, endTime, 5);
        const topReferrers = getTopReferrers(startTime, endTime, 5);
        
        sendJson(res, {
          period,
          page_views: pageViews.total || 0,
          unique_visitors: pageViews.unique_visitors || 0,
          top_pages: topPages,
          top_referrers: topReferrers,
          timestamp: Date.now()
        });
        break;
        
      case 'pages':
        const limit = parseInt(url.searchParams.get('limit')) || 20;
        const pages = getTopPages(startTime, endTime, limit);
        sendJson(res, {
          period,
          pages,
          timestamp: Date.now()
        });
        break;
        
      case 'referrers':
        const refLimit = parseInt(url.searchParams.get('limit')) || 20;
        const referrers = getTopReferrers(startTime, endTime, refLimit);
        sendJson(res, {
          period,
          referrers,
          timestamp: Date.now()
        });
        break;
        
      case 'countries':
        const countries = getCountryStats(startTime, endTime);
        sendJson(res, {
          period,
          countries,
          timestamp: Date.now()
        });
        break;
        
      case 'hourly':
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const hourlyData = getHourlyStats(date);
        
        const hours = Array.from({ length: 24 }, (_, i) => {
          const hour = i.toString().padStart(2, '0');
          const data = hourlyData.find(h => h.hour === hour);
          return {
            hour,
            page_views: data?.page_views || 0,
            unique_visitors: data?.unique_visitors || 0
          };
        });
        
        sendJson(res, {
          date,
          hours,
          timestamp: Date.now()
        });
        break;
        
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  } catch (error) {
    console.error('Stats API error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}