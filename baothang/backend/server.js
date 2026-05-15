const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============ KẾT NỐI MONGODB ATLAS ============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://baothang68:Thang1998@baothang.xzakvnx.mongodb.net/baothang?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB error:', err));

// ============ MODELS ============
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  affiliateCode: { type: String, unique: true },
  affiliateEarnings: { type: Number, default: 0 },
  accounts: {
    twitter: { type: String, default: '' },
    discord: { type: String, default: '' },
    wallet: { type: String, default: '' }
  },
  completedTasks: [{ taskId: String, pointsEarned: Number, completedAt: Date }],
  createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  points: Number,
  status: { type: String, default: 'active' },
  completions: [String]
});

const offerSchema = new mongoose.Schema({
  name: String,
  description: String,
  commission: String,
  link: String,
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 }
});

const conversionSchema = new mongoose.Schema({
  offerId: String,
  offerName: String,
  userId: String,
  userEmail: String,
  orderCode: String,
  commission: Number,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Offer = mongoose.model('Offer', offerSchema);
const Conversion = mongoose.model('Conversion', conversionSchema);

// ============ MIDDLEWARE ============
const JWT_SECRET = process.env.JWT_SECRET || 'baothang-secret-key-2024';
const ADMIN_EMAIL = 'thangthangwew@gmail.com';

function auth(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Không có token' });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) { res.status(401).json({ message: 'Token không hợp lệ' }); }
}

// ============ KHỞI TẠO DỮ LIỆU MẪU ============
async function initData() {
  const taskCount = await Task.countDocuments();
  if (taskCount === 0) {
    await Task.insertMany([
      { title: 'Follow Twitter @BaoThang', description: 'Follow + Retweet bài pin', points: 50, completions: [] },
      { title: 'Tham gia Discord', description: 'Tham gia server Discord chính thức', points: 30, completions: [] },
      { title: 'Kết nối ví MetaMask', description: 'Kết nối ví ERC-20 của bạn', points: 100, completions: [] },
      { title: 'Like + Share Facebook', description: 'Like fanpage BaoThang.top', points: 20, completions: [] },
      { title: 'Điểm danh hàng ngày', description: 'Điểm danh nhận điểm thưởng', points: 10, completions: [] }
    ]);
  }

  const offerCount = await Offer.countDocuments();
  if (offerCount === 0) {
    await Offer.insertMany([
      { name: 'Shopee - Mua sắm', description: 'Ưu đãi đặc biệt', commission: '5%', link: 'https://shopee.vn' },
      { name: 'Lazada - Siêu sale', description: 'Giảm giá đến 50%', commission: '3%', link: 'https://lazada.vn' },
      { name: 'Tiki - Giao nhanh', description: 'Miễn phí giao hàng', commission: '2%', link: 'https://tiki.vn' }
    ]);
  }
}
initData().catch(err => console.log('Init error:', err));

// ============ AUTH ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email đã tồn tại' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = email === ADMIN_EMAIL ? 'admin' : 'user';
    const affiliateCode = 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    const user = await User.create({ email, password: hashedPassword, role, affiliateCode });
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        points: user.points,
        level: user.level,
        role: user.role,
        affiliateCode: user.affiliateCode,
        accounts: user.accounts
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        points: user.points,
        level: user.level,
        role: user.role,
        affiliateCode: user.affiliateCode,
        accounts: user.accounts,
        affiliateEarnings: user.affiliateEarnings
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ============ USER ============
app.get('/api/users/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.put('/api/user/accounts', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { accounts: req.body },
      { new: true }
    );
    res.json({ message: 'Đã lưu', accounts: user.accounts });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ============ TASKS ============
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ status: 'active' });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.post('/api/tasks/complete/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy' });
    if (task.completions.includes(req.user.userId))
      return res.status(400).json({ message: 'Đã hoàn thành' });

    task.completions.push(req.user.userId);
    await task.save();

    const user = await User.findById(req.user.userId);
    user.points += task.points;
    user.completedTasks.push({
      taskId: task._id,
      pointsEarned: task.points,
      completedAt: new Date()
    });
    if (user.points >= user.level * 1000) user.level += 1;
    await user.save();

    res.json({
      message: 'Hoàn thành!',
      pointsEarned: task.points,
      totalPoints: user.points,
      level: user.level
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ============ AFFILIATE ============
app.get('/api/affiliate/offers', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const offers = await Offer.find({});
    const data = offers.map(o => ({
      ...o.toObject(),
      affiliateLink: o.link + '?ref=' + user.affiliateCode
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.post('/api/affiliate/click/:offerId', auth, async (req, res) => {
  await Offer.findByIdAndUpdate(req.params.offerId, { $inc: { clicks: 1 } });
  res.json({ success: true });
});

app.post('/api/affiliate/submit-conversion', auth, async (req, res) => {
  try {
    const { offerId, orderCode } = req.body;
    const user = await User.findById(req.user.userId);
    const offer = await Offer.findById(offerId);
    if (!user || !offer) return res.status(404).json({ message: 'Không tìm thấy' });

    const commissionValue = parseInt(offer.commission) || 5;
    await Conversion.create({
      offerId,
      offerName: offer.name,
      userId: user._id.toString(),
      userEmail: user.email,
      orderCode,
      commission: commissionValue * 1000
    });

    res.json({ message: 'Đã gửi! Admin sẽ duyệt.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ============ ADMIN ============
app.get('/api/admin/users', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  const users = await User.find({}).select('-password');
  res.json(users);
});

app.get('/api/admin/accounts', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  const users = await User.find({}).select('email points level accounts');
  res.json(users);
});

app.post('/api/admin/tasks', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  const task = await Task.create(req.body);
  res.json(task);
});

app.delete('/api/admin/tasks/:id', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xóa' });
});

app.post('/api/admin/offers', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  const offer = await Offer.create(req.body);
  res.json(offer);
});

app.delete('/api/admin/offers/:id', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  await Offer.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xóa' });
});

app.get('/api/admin/conversions', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  const conversions = await Conversion.find({}).sort({ timestamp: -1 });
  res.json(conversions);
});

app.get('/api/admin/pending-conversions', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  const conversions = await Conversion.find({ status: 'pending' }).sort({ timestamp: -1 });
  res.json(conversions);
});

app.put('/api/admin/conversions/:id', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });

  const conversion = await Conversion.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  if (req.body.status === 'approved' && conversion) {
    await User.findByIdAndUpdate(conversion.userId, {
      $inc: { affiliateEarnings: conversion.commission }
    });
    await Offer.findByIdAndUpdate(conversion.offerId, {
      $inc: { conversions: 1 }
    });
  }

  res.json({ message: 'Đã cập nhật' });
});

app.put('/api/admin/users/:id', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  await User.findByIdAndUpdate(req.params.id, req.body);
  res.json({ message: 'Đã cập nhật' });
});

app.get('/api/admin/affiliate-stats', auth, async (req, res) => {
  const admin = await User.findById(req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });

  const totalUsers = await User.countDocuments();
  const totalCompletions = (await Task.find({})).reduce((sum, t) => sum + t.completions.length, 0);
  const totalClicks = (await Offer.find({})).reduce((sum, o) => sum + o.clicks, 0);
  const totalCommission = (await Conversion.find({ status: 'approved' })).reduce((sum, c) => sum + c.commission, 0);

  res.json({ totalUsers, totalCompletions, totalClicks, totalCommission });
});

// ============ FRONTEND ============
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// ============ START ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server chạy tại port ${PORT}`));
