const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  res.json(user);
});

router.get('/leaderboard', async (req, res) => {
  const users = await User.find().select('email points level').sort({ points: -1 }).limit(100);
  res.json(users);
});

module.exports = router;
