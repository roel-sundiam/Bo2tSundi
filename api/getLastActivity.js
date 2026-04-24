'use strict';

const { connectToDatabase } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  try {
    const client = await connectToDatabase();
    const latest = await client.db('Bo2tSundi').collection('events')
      .findOne({}, { sort: { receivedAt: -1 }, projection: { receivedAt: 1, _id: 0 } });
    return res.status(200).json({ timestamp: latest?.receivedAt ?? null });
  } catch (err) {
    console.error('getLastActivity error:', err);
    return res.status(200).json({ timestamp: null });
  }
};
