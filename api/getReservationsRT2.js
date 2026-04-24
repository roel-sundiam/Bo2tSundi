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

    const rows = await db.collection('reservations')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .project({ _id: 0, userId: 1, date: 1, timeSlot: 1, endTimeSlot: 1, players: 1, status: 1, paymentStatus: 1, totalFee: 1 })
      .toArray();

    const uniqueUserIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
    const userDocs = await db.collection('users')
      .find({ _id: { $in: uniqueUserIds.map(id => new ObjectId(id)) } })
      .project({ _id: 1, username: 1 })
      .toArray();
    const usernameMap = new Map(userDocs.map(u => [u._id.toString(), u.username]));

    const mapped = rows.map(r => ({
      bookedBy: usernameMap.get(r.userId) ?? r.userId ?? 'Unknown',
      date: r.date,
      timeSlot: r.timeSlot,
      endTimeSlot: r.endTimeSlot,
      players: (r.players ?? []).map(p =>
        typeof p === 'string' ? p : (p.name ?? p.fullName ?? p.username ?? String(p))
      ),
      status: r.status,
      paymentStatus: r.paymentStatus,
      totalFee: r.totalFee,
    }));

    return res.status(200).json({ rows: mapped });
  } catch (err) {
    console.error('getReservationsRT2 error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
