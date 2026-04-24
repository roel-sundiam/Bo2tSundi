'use strict';

const { connectToDatabase } = require('./_db');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('TennisClubRT2_Test');

    const targetCollections = ['pageviews', 'useractivities', 'sessioninfos'];

    const samples = {};
    for (const name of targetCollections) {
      samples[name] = await db.collection(name).find({}).limit(3).toArray();
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ samples }, null, 2),
    };
  } catch (err) {
    console.error('debugRT2 error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
