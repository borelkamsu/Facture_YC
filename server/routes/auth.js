const express   = require('express');
const jwt       = require('jsonwebtoken');
const User      = require('../models/User');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'youmbi_secret_2025';
const JWT_EXPIRY = '8h';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis.' });
  }

  try {
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
