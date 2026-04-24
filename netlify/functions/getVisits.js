'use strict';

const { connectToDatabase } = require('./_db');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  try {
    const params = event.queryStringParameters || {};
    const requestedLimit = parseInt(params.limit || '5000', 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 5000;

    const filter = { event: 'page_view', appId: { $nin: ['tennis-app', 'rt2tennisclub'] } };
    if (params.appId) {
      filter.appId = params.appId === 'tennis-app' ? '__removed_app__' : params.appId;
    }

    if (params.since) {
      filter.timestamp = { $gte: new Date(parseInt(params.since, 10)) };
    } else if (params.today === 'true') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.timestamp = { $gte: start };
    }

    const client = await connectToDatabase();
    const db = client.db('Bo2tSundi');

    const facetResult = await db.collection('events').aggregate([
      { $match: filter },
      {
        $facet: {
          rows: [
            { $sort: { timestamp: -1 } },
            { $limit: limit },
            { $project: { _id: 0, appId: 1, page: 1, timestamp: 1 } },
          ],
          summary: [
            { $group: { _id: '$appId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
        },
      },
    ]).toArray();

    const { rows, summary } = facetResult[0];

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ rows, summary, total: rows.length }),
    };
  } catch (err) {
    console.error('getVisits error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
