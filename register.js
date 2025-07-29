const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../../database/db');

const SALT_ROUNDS = 10;
const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;

router.post('/', (req, res) => {
  const { username, email, password, key } = req.body;

  if (!username || !email || !password || !key) {
    return res.status(400).json({ success: false, msg: 'Missing username, email, password, or key' });
  }

  if (!usernameRegex.test(username)) {
    return res.status(400).json({ success: false, msg: 'Invalid username format. Use 3-20 characters: letters, numbers, _ or - only.' });
  }

  db.get(`SELECT redeemed, type FROM keys WHERE key = ?`, [key], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, msg: 'Database error' });
    }
    if (!row) return res.status(400).json({ success: false, msg: 'Invalid key' });
    if (row.redeemed) return res.status(400).json({ success: false, msg: 'Key already redeemed' });

    let expireAt = null;
    const now = new Date();

    switch (row.type) {
      case 'daily':
        expireAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        expireAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        expireAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'lifetime':
        expireAt = null;
        break;
      default:
        return res.status(400).json({ success: false, msg: 'Unknown key type' });
    }

    const expireAtStr = expireAt ? expireAt.toISOString() : null;

    bcrypt.hash(password, SALT_ROUNDS, (err, hashedPassword) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, msg: 'Failed to hash password' });
      }

      db.run(
        `INSERT INTO users (username, email, password, expire_at) VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, expireAtStr],
        function (err) {
          if (err) {
            console.error(err);
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ success: false, msg: 'Username or email already registered' });
            }
            return res.status(500).json({ success: false, msg: 'Failed to register user' });
          }

          db.run(
            `UPDATE keys SET redeemed = 1, redeemed_at = CURRENT_TIMESTAMP, redeemed_by = ? WHERE key = ?`,
            [username, key],
            function (err) {
              if (err) {
                console.error(err);
                return res.status(500).json({ success: false, msg: 'User registered but failed to redeem key' });
              }
              res.json({ success: true, msg: 'User registered successfully' });
            }
          );
        }
      );
    });
  });
});

module.exports = router;
