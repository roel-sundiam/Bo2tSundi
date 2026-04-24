'use strict';

const { connectToDatabase } = require('./_db');
const { ObjectId } = require('mongodb');

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

    const filter = { event: 'login', appId: 'tennismarketplace' };

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
            { $project: { _id: 0, appId: 1, userId: 1, timestamp: 1 } },
          ],
          summary: [
            { $group: { _id: '$appId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
        },
      },
    ]).toArray();

    const { rows, summary } = facetResult[0];

    const rawUserIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
    const objectIds = rawUserIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    let usersById = new Map();
    if (objectIds.length > 0) {
      const users = await client.db('TennisMarketPlace')
        .collection('users')
        .find({ _id: { $in: objectIds } })
        .project({ _id: 1, username: 1, firstName: 1, lastName: 1, email: 1 })
        .toArray();

      usersById = new Map(
        users.map(user => {
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          const displayName = user.username || fullName || user.email || user._id.toString();
          return [user._id.toString(), displayName];
        })
      );
    }

    const mappedRows = rows.map(row => ({
      ...row,
      userId: usersById.get(row.userId) || row.userId,
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ rows: mappedRows, summary, total: mappedRows.length }),
    };
  } catch (err) {
    console.error('getLoginsMarketplace error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
