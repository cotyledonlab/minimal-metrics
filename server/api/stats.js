import {
  getActiveVisitors,
  getPageViews,
  getTopPages,
  getTopReferrers,
  getCountryStats,
  getHourlyStats,
  getCampaignStats,
  getPageViewsWithComparison
} from '../db/queries.js';
import { setCorsHeaders } from '../middleware/security.js';

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

function sendJson(req, res, data, status = 200) {
  setCorsHeaders(req, res);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60'
  });
  res.end(JSON.stringify(data));
}

export function handleStats(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const endpoint = url.pathname.split('/').pop();
  const period = url.searchParams.get('period') || '7d';
  const compare = url.searchParams.get('compare') === 'true';
  const { startTime, endTime } = parseTimeRange(period);

  try {
    switch (endpoint) {
      case 'realtime': {
        const activeVisitors = getActiveVisitors();
        sendJson(req, res, {
          active_visitors: activeVisitors.count || 0,
          timestamp: Date.now()
        });
        break;
      }

      case 'overview': {
        let pageViews, comparison = null;

        if (compare) {
          const comparisonData = getPageViewsWithComparison(startTime, endTime);
          pageViews = comparisonData.current;
          comparison = {
            page_views_change: comparisonData.change.total,
            visitors_change: comparisonData.change.unique_visitors
          };
        } else {
          pageViews = getPageViews(startTime, endTime);
        }

        const topPages = getTopPages(startTime, endTime, 5);
        const topReferrers = getTopReferrers(startTime, endTime, 5);

        const response = {
          period,
          page_views: pageViews.total || 0,
          unique_visitors: pageViews.unique_visitors || 0,
          pages_per_visitor: pageViews.unique_visitors > 0
            ? Math.round((pageViews.total / pageViews.unique_visitors) * 100) / 100
            : 0,
          top_pages: topPages,
          top_referrers: topReferrers,
          timestamp: Date.now()
        };

        if (comparison) {
          response.comparison = comparison;
        }

        sendJson(req, res, response);
        break;
      }

      case 'pages': {
        const limit = parseInt(url.searchParams.get('limit') ?? '') || 20;
        const pages = getTopPages(startTime, endTime, Math.min(limit, 100));
        sendJson(req, res, {
          period,
          pages,
          timestamp: Date.now()
        });
        break;
      }

      case 'referrers': {
        const refLimit = parseInt(url.searchParams.get('limit') ?? '') || 20;
        const referrers = getTopReferrers(startTime, endTime, Math.min(refLimit, 100));
        sendJson(req, res, {
          period,
          referrers,
          timestamp: Date.now()
        });
        break;
      }

      case 'countries': {
        const countries = getCountryStats(startTime, endTime);
        sendJson(req, res, {
          period,
          countries,
          timestamp: Date.now()
        });
        break;
      }

      case 'hourly': {
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

        sendJson(req, res, {
          date,
          hours,
          timestamp: Date.now()
        });
        break;
      }

      case 'campaigns': {
        const campLimit = parseInt(url.searchParams.get('limit') ?? '') || 50;
        const campaigns = getCampaignStats(startTime, endTime, Math.min(campLimit, 100));
        sendJson(req, res, {
          period,
          campaigns,
          timestamp: Date.now()
        });
        break;
      }

      default:
        setCorsHeaders(req, res);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  } catch (error) {
    console.error('Stats API error:', error);
    setCorsHeaders(req, res);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
