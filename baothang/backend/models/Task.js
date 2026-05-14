const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  points: { type: Number, required: true },
  type: { type: String, enum: ['airdrop', 'social', 'referral', 'daily'], default: 'airdrop' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  completions: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, completedAt: { type: Date, default: Date.now }, proof: String }],
  dailyLimit: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);
