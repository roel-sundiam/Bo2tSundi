'use strict';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  const token  = process.env.NETLIFY_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!token || !siteId) {
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'NETLIFY_TOKEN or NETLIFY_SITE_ID not configured' }),
    };
  }

  try {
    const now  = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);

    const fromTs = from.getTime();
    const toTs   = now.getTime();

    const url = `https://api.netlify.com/api/v1/sites/${siteId}/analytics/reports/functions-usage/data` +
      `?from=${fromTs}&to=${toTs}&resolution=hour`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Netlify API error:', res.status, text);
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `Netlify API returned ${res.status}`, detail: text }),
      };
    }

    const data = await res.json();

    const invocations = (data.data ?? []).reduce((sum, point) => sum + (point[1] ?? 0), 0);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ invocations, date: from.toISOString().split('T')[0] }),
    };
  } catch (err) {
    console.error('getNetlifyUsage error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
