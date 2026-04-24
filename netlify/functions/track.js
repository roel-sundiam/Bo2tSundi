'use strict';

const { connectToDatabase } = require('./_db');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  // Tracking temporarily disabled
  if (process.env.TRACKING_ENABLED !== 'true') {
    return { statusCode: 202, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, disabled: true }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { event: eventType, appId, userId, page, timestamp } = payload;

    if (!eventType || !appId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'event and appId are required' }),
      };
    }

    const doc = {
      event: eventType,
      appId,
      userId: userId || null,
      page: page || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      receivedAt: new Date(),
    };

    const client = await connectToDatabase();
    await client.db('Bo2tSundi').collection('events').insertOne(doc);

    return {
      statusCode: 202,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('track error:', err);
    return {
      statusCode: 202,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false }),
    };
  }
};
