'use strict';

require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.text({ type: '*/*' }));

const { handler: track }        = require('./netlify/functions/track');
const { handler: getVisits }    = require('./netlify/functions/getVisits');
const { handler: getLogins }    = require('./netlify/functions/getLogins');
const { handler: getVisitsRT2 }       = require('./netlify/functions/getVisitsRT2');
const { handler: getLoginsRT2 }       = require('./netlify/functions/getLoginsRT2');
const { handler: getVisitsRC }        = require('./netlify/functions/getVisitsRC');
const { handler: getLoginsRC }        = require('./netlify/functions/getLoginsRC');
const { handler: getVisitsMarketplace }    = require('./netlify/functions/getVisitsMarketplace');
const { handler: getLoginsMarketplace }    = require('./netlify/functions/getLoginsMarketplace');
const { handler: getReservationsRT2 } = require('./netlify/functions/getReservationsRT2');
const { handler: getPaymentsRT2 }     = require('./netlify/functions/getPaymentsRT2');
const { handler: getNetlifyUsage }    = require('./netlify/functions/getNetlifyUsage');

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

app.all('/api/track',        (req, res) => handle(track,        req, res));
app.all('/api/getVisits',    (req, res) => handle(getVisits,    req, res));
app.all('/api/getLogins',    (req, res) => handle(getLogins,    req, res));
app.all('/api/getVisitsRT2',       (req, res) => handle(getVisitsRT2,       req, res));
app.all('/api/getLoginsRT2',       (req, res) => handle(getLoginsRT2,       req, res));
app.all('/api/getVisitsRC',        (req, res) => handle(getVisitsRC,        req, res));
app.all('/api/getLoginsRC',        (req, res) => handle(getLoginsRC,        req, res));
app.all('/api/getVisitsMarketplace',    (req, res) => handle(getVisitsMarketplace,    req, res));
app.all('/api/getLoginsMarketplace',    (req, res) => handle(getLoginsMarketplace,    req, res));
app.all('/api/getReservationsRT2', (req, res) => handle(getReservationsRT2, req, res));
app.all('/api/getPaymentsRT2',     (req, res) => handle(getPaymentsRT2,     req, res));
app.all('/api/getNetlifyUsage',    (req, res) => handle(getNetlifyUsage,    req, res));

const PORT = 9999;
app.listen(PORT, () => {
  console.log(`Functions server running at http://localhost:${PORT}`);
  console.log('  POST /api/track');
  console.log('  GET  /api/getVisits');
  console.log('  GET  /api/getLogins');
  console.log('  GET  /api/getVisitsRT2');
  console.log('  GET  /api/getLoginsRT2');
  console.log('  GET  /api/getVisitsRC');
  console.log('  GET  /api/getLoginsRC');
  console.log('  GET  /api/getVisitsMarketplace');
  console.log('  GET  /api/getLoginsMarketplace');
});
