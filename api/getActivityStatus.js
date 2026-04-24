'use strict';

const { connectToDatabase } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  try {
    const [clientResult, registrationsResult] = await Promise.allSettled([
      connectToDatabase().then(client =>
        client.db('Bo2tSundi').collection('events')
          .findOne({}, { sort: { receivedAt: -1 }, projection: { receivedAt: 1, _id: 0 } })
      ),
      fetch('https://she-serves-tc.netlify.app/api/registrations').then(r => r.json()),
    ]);

    const timestamp = clientResult.status === 'fulfilled' ? (clientResult.value?.receivedAt ?? null) : null;
    const registrations = registrationsResult.status === 'fulfilled' ? registrationsResult.value : { columns: [], rows: [] };

    return res.status(200).json({ timestamp, registrations });
  } catch (err) {
    console.error('getActivityStatus error:', err);
    return res.status(200).json({ timestamp: null, registrations: { columns: [], rows: [] } });
  }
};
