'use strict';

const { connectToDatabase } = require('./_db');
const { ObjectId } = require('mongodb');

const RT2_APP_ID = 'rt2tennisclub';

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

    return res.status(200).json({ rows: injectedRows, summary, total: injectedRows.length });
  } catch (err) {
    console.error('getLoginsRT2 error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
