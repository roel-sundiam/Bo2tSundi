'use strict';

require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.text({ type: '*/*' }));

const { handler: track }     = require('./netlify/functions/track');
const { handler: getVisits } = require('./netlify/functions/getVisits');
const { handler: getLogins } = require('./netlify/functions/getLogins');

function toEvent(req) {
  return {
    httpMethod:            req.method,
    body:                  req.body || null,
    queryStringParameters: req.query || {},
    headers:               req.headers,
    path:                  req.path,
  };
}

async function handle(fn, req, res) {
  try {
    const result = await fn(toEvent(req), {});
    res.status(result.statusCode);
    if (result.headers) {
      Object.entries(result.headers).forEach(([k, v]) => res.set(k, v));
    }
    res.send(result.body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

app.all('/api/track',     (req, res) => handle(track,     req, res));
app.all('/api/getVisits', (req, res) => handle(getVisits, req, res));
app.all('/api/getLogins', (req, res) => handle(getLogins, req, res));

const PORT = 9999;
app.listen(PORT, () => {
  console.log(`Functions server running at http://localhost:${PORT}`);
  console.log('  POST /api/track');
  console.log('  GET  /api/getVisits');
  console.log('  GET  /api/getLogins');
});
