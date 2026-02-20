import { getTopPages, getTopReferrers, getCountryStats, getPageViews } from '../db/queries.js';

function parseTimeRange(period = '30d') {
  const now = Date.now();
  const periods = {
    '7d': 7 * 86400000,
    '30d': 30 * 86400000,
    '90d': 90 * 86400000
  };

  const duration = periods[period] || periods['30d'];
  return {
    startTime: now - duration,
    endTime: now
  };
}

function formatCsv(data, headers) {
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      return typeof value === 'string' && value.includes(',')
        ? `"${value}"`
        : value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export function handleExport(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const format = url.searchParams.get('format') || 'json';
  const type = url.searchParams.get('type') || 'overview';
  const period = url.searchParams.get('period') || '30d';
  const { startTime, endTime } = parseTimeRange(period);

  try {
    let data = {};
    const filename = `minimal-metrics-${type}-${period}`;

    switch (type) {
      case 'overview':
        const pageViews = getPageViews(startTime, endTime);
        const topPages = getTopPages(startTime, endTime, 50);
        const topReferrers = getTopReferrers(startTime, endTime, 50);
        const countries = getCountryStats(startTime, endTime);

        data = {
          summary: {
            period,
            start_date: new Date(startTime).toISOString(),
            end_date: new Date(endTime).toISOString(),
            total_page_views: pageViews.total || 0,
            unique_visitors: pageViews.unique_visitors || 0
          },
          top_pages: topPages,
          top_referrers: topReferrers,
          countries: countries
        };
        break;

      case 'pages':
        data = getTopPages(startTime, endTime, 1000);
        break;

      case 'referrers':
        data = getTopReferrers(startTime, endTime, 1000);
        break;

      case 'countries':
        data = getCountryStats(startTime, endTime);
        break;

      default:
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid export type' }));
        return;
    }

    if (format === 'csv') {
      let csvData = '';
      let headers = [];

      if (type === 'overview') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'CSV format not available for overview export' }));
        return;
      }

      if (type === 'pages') {
        headers = ['page_url', 'views', 'unique_visitors'];
      } else if (type === 'referrers') {
        headers = ['referrer', 'visits', 'unique_visitors'];
      } else if (type === 'countries') {
        headers = ['country', 'visits', 'unique_visitors'];
      }

      csvData = formatCsv(data, headers);

      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(csvData);

    } else {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('Export error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Export failed' }));
  }
}
