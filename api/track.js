'use strict';

const { connectToDatabase } = require('./_db');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  if (process.env.TRACKING_ENABLED !== 'true') {
    return res.status(202).json({ ok: true, disabled: true });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { event: eventType, appId, userId, page, timestamp } = payload;

    if (!eventType || !appId) {
      return res.status(400).json({ error: 'event and appId are required' });
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

    return res.status(202).json({ ok: true });
  } catch (err) {
    console.error('track error:', err);
    return res.status(202).json({ ok: false });
  }
};
