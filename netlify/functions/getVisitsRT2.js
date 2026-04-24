'use strict';

const { connectToDatabase } = require('./_db');
const { ObjectId } = require('mongodb');

const RT2_APP_ID = 'rt2tennisclub';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

async function fetchVisitsFromCollection(db, collectionName, sinceDate, limit) {
  const match = {
    normalizedTimestamp: { $ne: null },
  };

  if (sinceDate) {
    match.normalizedTimestamp.$gte = sinceDate;
  }

  const normalizationStages = [
    {
      $addFields: {
        normalizedTimestamp: {
          $convert: {
            input: {
              $ifNull: [
                '$timestamp',
                {
                  $ifNull: ['$createdAt', { $ifNull: ['$time', '$visitedAt'] }],
                },
              ],
            },
            to: 'date',
            onError: null,
            onNull: null,
          },
        },
        normalizedPage: {
          $ifNull: [
            '$page',
            {
              $ifNull: [
                '$path',
                {
                  $ifNull: [
                    '$url',
                    { $ifNull: ['$route', { $ifNull: ['$screen', 'Unknown page'] }] },
                  ],
                },
              ],
            },
          ],
        },
        normalizedUserId: {
          $ifNull: ['$userId', { $ifNull: ['$user', { $ifNull: ['$uid', null] }] }],
        },
      },
    },
    { $match: match },
  ];

  const dedupStages = [
    {
      $group: {
        _id: {
          page: '$normalizedPage',
          minute: {
            $dateToString: {
              format: '%Y-%m-%dT%H:%M',
              date: '$normalizedTimestamp',
            },
          },
        },
        timestamp: { $min: '$normalizedTimestamp' },
        userId: { $first: '$normalizedUserId' },
      },
    },
  ];

  const facetResult = await db.collection(collectionName).aggregate([
    ...normalizationStages,
    ...dedupStages,
    {
      $facet: {
        rows: [
          { $project: { _id: 0, page: '$_id.page', timestamp: 1, userId: 1 } },
          { $sort: { timestamp: -1 } },
          { $limit: limit },
        ],
        countResult: [{ $count: 'total' }],
      },
    },
  ]).toArray();

  return {
    rows: facetResult[0].rows,
    totalDeduped: facetResult[0].countResult[0]?.total ?? 0,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  try {
    const params = event.queryStringParameters || {};
    const requestedLimit = parseInt(params.limit || '5000', 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 5000;
    let sinceDate = null;
    if (params.since) {
      sinceDate = new Date(parseInt(params.since, 10));
    } else if (params.today === 'true') {
      sinceDate = new Date();
      sinceDate.setHours(0, 0, 0, 0);
    }

    const client = await connectToDatabase();
    const db = client.db('TennisClubRT2_Test');

    let result = await fetchVisitsFromCollection(db, 'pageviews', sinceDate, limit);
    if (result.totalDeduped === 0) {
      const fallbackResult = await fetchVisitsFromCollection(db, 'useractivities', sinceDate, limit);
      if (fallbackResult.totalDeduped > 0) {
        result = fallbackResult;
      }
    }

    const rows = result.rows;
    const totalDeduped = result.totalDeduped;

    const rawUserIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
    const objectIds = rawUserIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    let usernameMap = new Map();
    if (objectIds.length > 0) {
      const userDocs = await db.collection('users')
        .find({ _id: { $in: objectIds } })
        .project({ _id: 1, username: 1 })
        .toArray();
      usernameMap = new Map(userDocs.map(u => [u._id.toString(), u.username]));
    }

    const injectedRows = rows.map(r => ({
      appId: RT2_APP_ID,
      page: r.page,
      timestamp: r.timestamp,
      userId: r.userId ? (usernameMap.get(r.userId) ?? r.userId) : null,
    }));
    const summary = totalDeduped > 0
      ? [{ _id: RT2_APP_ID, count: totalDeduped }]
      : [];

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ rows: injectedRows, summary, total: injectedRows.length }),
    };
  } catch (err) {
    console.error('getVisitsRT2 error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
