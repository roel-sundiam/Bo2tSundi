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
    const limit = Math.min(parseInt(params.limit || '200', 10), 500);

    const filter = { event: 'login' };
    if (params.appId) filter.appId = params.appId;

    if (params.today === 'true') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.timestamp = { $gte: start };
    }

    const client = await connectToDatabase();
    const db = client.db('analytics');

    const [rows, summary] = await Promise.all([
      db.collection('events')
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .project({ _id: 0, appId: 1, userId: 1, timestamp: 1 })
        .toArray(),

      db.collection('events').aggregate([
        { $match: filter },
        { $group: { _id: '$appId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),
    ]);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ rows, summary, total: rows.length }),
    };
  } catch (err) {
    console.error('getLogins error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
