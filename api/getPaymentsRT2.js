'use strict';

const { connectToDatabase } = require('./_db');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('TennisClubRT2_Test');

    const rows = await db.collection('payments')
      .find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(10)
      .project({ _id: 0, userId: 1, amount: 1, currency: 1, paymentMethod: 1, description: 1, status: 1, paymentDate: 1, referenceNumber: 1 })
      .toArray();

    const uniqueUserIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
    const userDocs = await db.collection('users')
      .find({ _id: { $in: uniqueUserIds.map(id => new ObjectId(id)) } })
      .project({ _id: 1, username: 1 })
      .toArray();
    const usernameMap = new Map(userDocs.map(u => [u._id.toString(), u.username]));

    const mapped = rows.map(r => ({
      paidBy: usernameMap.get(r.userId) ?? r.userId ?? 'Unknown',
      amount: r.amount,
      currency: r.currency ?? 'PHP',
      paymentMethod: r.paymentMethod,
      description: r.description,
      status: r.status,
      paymentDate: r.paymentDate,
      referenceNumber: r.referenceNumber,
    }));

    return res.status(200).json({ rows: mapped });
  } catch (err) {
    console.error('getPaymentsRT2 error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
