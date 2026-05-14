const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    const { email, password, walletAddress } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'Email da ton tai' });
    const code = 'REF' + Math.random().toString(36).substr(2,8).toUpperCase();
    user = new User({ email, password, walletAddress, affiliateCode: code });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { email: user.email, points: user.points, affiliateCode: code } });
  } catch (e) { res.status(500).json({ message: 'Loi server' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Sai email hoac mat khau' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Sai email hoac mat khau' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { email: user.email, points: user.points, level: user.level } });
  } catch (e) { res.status(500).json({ message: 'Loi server' }); }
});

module.exports = router;
