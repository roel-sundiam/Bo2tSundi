'use strict';

const { connectToDatabase } = require('./_db');
const { ObjectId } = require('mongodb');

const RT2_APP_ID = 'rt2tennisclub';

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

    // sessioninfos with a userId = authenticated (logged-in) sessions
    const filter = { userId: { $exists: true } };

    if (params.since) {
      filter.startTime = { $gte: new Date(parseInt(params.since, 10)) };
    } else if (params.today === 'true') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.startTime = { $gte: start };
    }

    const client = await connectToDatabase();
    const db = client.db('TennisClubRT2_Test');

    const [rows, totalCount] = await Promise.all([
      db.collection('sessioninfos')
        .find(filter)
        .sort({ startTime: -1 })
        .limit(limit)
        .project({ _id: 0, userId: 1, startTime: 1 })
        .toArray(),

      db.collection('sessioninfos').countDocuments(filter),
    ]);

    const uniqueUserIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
    const userDocs = await db.collection('users')
      .find({ _id: { $in: uniqueUserIds.map(id => new ObjectId(id)) } })
      .project({ _id: 1, username: 1 })
      .toArray();
    const usernameMap = new Map(userDocs.map(u => [u._id.toString(), u.username]));

    const injectedRows = rows.map(r => ({
      appId: RT2_APP_ID,
      userId: usernameMap.get(r.userId) ?? r.userId,
      timestamp: r.startTime,
    }));
    const summary = totalCount > 0
      ? [{ _id: RT2_APP_ID, count: totalCount }]
      : [];

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ rows: injectedRows, summary, total: injectedRows.length }),
    };
  } catch (err) {
    console.error('getLoginsRT2 error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
