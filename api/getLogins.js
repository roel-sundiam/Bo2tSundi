'use strict';

const { connectToDatabase } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const params = req.query;
    const requestedLimit = parseInt(params.limit || '5000', 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 5000;

    const filter = { event: 'login', appId: { $ne: 'tennis-app' } };
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
    return res.status(200).json({ rows, summary, total: rows.length });
  } catch (err) {
    console.error('getLogins error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
