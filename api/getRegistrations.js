'use strict';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const response = await fetch('https://she-serves-tc.netlify.app/api/registrations');
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('getRegistrations error:', err);
    return res.status(200).json({ columns: [], rows: [] });
  }
};
