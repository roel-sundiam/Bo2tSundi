'use strict';

const { connectToDatabase } = require('./_db');

const RC_APP_ID = 'rctennisacademy';

async function fetchFromEvents(db, limit, sinceDate) {
  const filter = { event: 'login' };
  if (sinceDate) {
    filter.timestamp = { $gte: sinceDate };
  }

  const [rows, totalCount] = await Promise.all([
    db.collection('events')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .project({ _id: 0, userId: 1, timestamp: 1 })
      .toArray(),
    db.collection('events').countDocuments(filter),
  ]);

  return { rows, totalCount };
}

async function fetchFromSessionInfos(db, limit, sinceDate) {
  const filter = {};
  if (sinceDate) {
    filter.timestamp = { $gte: sinceDate };
  }

  const [rows, totalCount] = await Promise.all([
    db.collection('loginevents')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .project({ _id: 0, username: 1, timestamp: 1 })
      .toArray(),
    db.collection('loginevents').countDocuments(filter),
  ]);

  return {
    rows: rows.map(row => ({ userId: row.username ?? 'unknown', timestamp: row.timestamp })),
    totalCount,
  };
}

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

    if (params.appId && params.appId !== RC_APP_ID) {
      return res.status(200).json({ rows: [], summary: [], total: 0 });
    }

    let sinceDate = null;
    if (params.since) {
      sinceDate = new Date(parseInt(params.since, 10));
    } else if (params.today === 'true') {
      sinceDate = new Date();
      sinceDate.setHours(0, 0, 0, 0);
    }

    const client = await connectToDatabase();
    const db = client.db('RCTennis');

    let result = await fetchFromEvents(db, limit, sinceDate);
    if (result.rows.length === 0) {
      result = await fetchFromSessionInfos(db, limit, sinceDate);
    }

    const injectedRows = result.rows.map(row => ({ appId: RC_APP_ID, ...row }));
    const summary = result.totalCount > 0 ? [{ _id: RC_APP_ID, count: result.totalCount }] : [];

    return res.status(200).json({ rows: injectedRows, summary, total: injectedRows.length });
  } catch (err) {
    console.error('getLoginsRC error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
