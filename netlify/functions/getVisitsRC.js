'use strict';

const { connectToDatabase } = require('./_db');

const RC_APP_ID = 'rctennisacademy';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

async function fetchFromEvents(db, limit, sinceDate) {
  const filter = { event: 'page_view' };
  if (sinceDate) {
    filter.timestamp = { $gte: sinceDate };
  }

  const [rows, totalCount] = await Promise.all([
    db.collection('events')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .project({ _id: 0, page: 1, timestamp: 1 })
      .toArray(),
    db.collection('events').countDocuments(filter),
  ]);

  return { rows, totalCount };
}

async function fetchFromPageViews(db, limit, sinceDate) {
  const filter = {};
  if (sinceDate) {
    filter.timestamp = { $gte: sinceDate };
  }

  const [rows, totalCount] = await Promise.all([
    db.collection('sitevisits')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .project({ _id: 0, page: 1, timestamp: 1 })
      .toArray(),
    db.collection('sitevisits').countDocuments(filter),
  ]);

  return { rows, totalCount };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  try {
    const params = event.queryStringParameters || {};
    const requestedLimit = parseInt(params.limit || '5000', 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 5000;

    if (params.appId && params.appId !== RC_APP_ID) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ rows: [], summary: [], total: 0 }),
      };
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
      result = await fetchFromPageViews(db, limit, sinceDate);
    }

    const injectedRows = result.rows.map(row => ({ appId: RC_APP_ID, ...row }));
    const summary = result.totalCount > 0 ? [{ _id: RC_APP_ID, count: result.totalCount }] : [];

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ rows: injectedRows, summary, total: injectedRows.length }),
    };
  } catch (err) {
    console.error('getVisitsRC error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
