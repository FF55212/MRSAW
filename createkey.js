const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../../database/db');
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Middleware to verify admin API key
function checkAdminKey(req, res, next) {
  const adminKey = req.header('x-auth-token');
  if (!adminKey || adminKey !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, msg: 'Unauthorized: Invalid admin API key' });
  }
  next();
}

// Generate a secure formatted key like XXXX-XXXX-XXXX-XXXX
function generateSecureKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusing chars
  const segmentLength = 4;
  const segments = 4;
  let key = '';

  for (let i = 0; i < segments; i++) {
    if (i > 0) key += '-';
    for (let j = 0; j < segmentLength; j++) {
      const randIndex = crypto.randomInt(0, chars.length);
      key += chars[randIndex];
    }
  }
  return key;
}

// Attempt to insert a unique key, retrying if needed
function generateAndSaveKey(type, res, attempt = 0) {
  if (attempt > 5) {
    return res.status(500).json({ success: false, msg: 'Failed to generate unique key after multiple attempts' });
  }

  const key = generateSecureKey();
  const sql = `INSERT INTO keys (key, type) VALUES (?, ?)`;

  db.run(sql, [key, type], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        // Collision: try again
        return generateAndSaveKey(type, res, attempt + 1);
      }
      console.error(err);
      return res.status(500).json({ success: false, msg: 'Failed to save key' });
    }

    res.json({ success: true, key, type });
  });
}

// Endpoint: /api/createkey
router.post('/', checkAdminKey, (req, res) => {
  const { type } = req.body;
  const allowedTypes = ['daily', 'weekly', 'monthly', 'lifetime'];

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ success: false, msg: 'Invalid key type' });
  }

  generateAndSaveKey(type, res);
});

module.exports = router;
