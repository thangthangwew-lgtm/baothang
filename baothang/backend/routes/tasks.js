const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');

router.get('/', auth, async (req, res) => {
  const tasks = await Task.find({ status: 'active' });
  res.json(tasks);
});

router.post('/complete/:id', auth, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Khong tim thay task' });
  const done = task.completions.find(c => c.userId.toString() === req.user.userId);
  if (done) return res.status(400).json({ message: 'Da hoan thanh' });
  task.completions.push({ userId: req.user.userId, completedAt: new Date() });
  await task.save();
  const user = await User.findById(req.user.userId);
  user.points += task.points;
  if (user.points >= user.level * 1000) user.level += 1;
  await user.save();
  res.json({ message: 'Hoan thanh!', points: task.points, totalPoints: user.points, level: user.level });
});

module.exports = router;
