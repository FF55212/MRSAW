const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../database/db'); 

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = '4h'; 

router.post('/', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, msg: 'Missing username or password' });
  }

  db.get(`SELECT id, username, password FROM users WHERE username = ?`, [username], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, msg: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ success: false, msg: 'Invalid username or password' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, msg: 'Error verifying password' });
      }

      if (!isMatch) {
        return res.status(401).json({ success: false, msg: 'Invalid username or password' });
      }

      const payload = { id: user.id, username: user.username };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

      res.json({ success: true, msg: 'Logged in successfully', auth: token });
    });
  });
});

module.exports = router;
