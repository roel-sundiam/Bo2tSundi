'use strict';

require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());
app.use(express.text({ type: '*/*' }));

const track                = require('./api/track');
const getVisits            = require('./api/getVisits');
const getLogins            = require('./api/getLogins');
const getVisitsRT2         = require('./api/getVisitsRT2');
const getLoginsRT2         = require('./api/getLoginsRT2');
const getVisitsRC          = require('./api/getVisitsRC');
const getLoginsRC          = require('./api/getLoginsRC');
const getVisitsMarketplace = require('./api/getVisitsMarketplace');
const getLoginsMarketplace = require('./api/getLoginsMarketplace');
const getReservationsRT2   = require('./api/getReservationsRT2');
const getPaymentsRT2       = require('./api/getPaymentsRT2');

app.all('/api/track',                 track);
app.all('/api/getVisits',             getVisits);
app.all('/api/getLogins',             getLogins);
app.all('/api/getVisitsRT2',          getVisitsRT2);
app.all('/api/getLoginsRT2',          getLoginsRT2);
app.all('/api/getVisitsRC',           getVisitsRC);
app.all('/api/getLoginsRC',           getLoginsRC);
app.all('/api/getVisitsMarketplace',  getVisitsMarketplace);
app.all('/api/getLoginsMarketplace',  getLoginsMarketplace);
app.all('/api/getReservationsRT2',    getReservationsRT2);
app.all('/api/getPaymentsRT2',        getPaymentsRT2);

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
  console.log('  GET  /api/getReservationsRT2');
  console.log('  GET  /api/getPaymentsRT2');
});
