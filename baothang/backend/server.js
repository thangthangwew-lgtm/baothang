const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============ KẾT NỐI MONGODB ============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://baothang68:Thang1998@baothang.xzakvnx.mongodb.net/baothang?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB error:', err));

// ============ ACCESSTRADE CONFIG ============
const ACCESSTRADE_API = 'https://api.accesstrade.vn/v1';
const ACCESSTRADE_API_KEY = process.env.ACCESSTRADE_API_KEY || '';

// ============ MODELS ============
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  subId: { type: String, unique: true }, // SubID cho Accesstrade
  affiliateEarnings: { type: Number, default: 0 },
  taskEarnings: { type: Number, default: 0 },
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

const conversionSchema = new mongoose.Schema({
  subId: String,
  userId: String,
  userEmail: String,
  offerId: String,
  offerName: String,
  orderCode: String,
  commission: Number,
  amount: Number,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
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

// ============ KHỞI TẠO ============
async function initData() {
  const taskCount = await Task.countDocuments();
  if (taskCount === 0) {
    await Task.insertMany([
      { title: 'Follow Twitter @BaoThang', description: 'Follow + Retweet', points: 50 },
      { title: 'Tham gia Discord', description: 'Tham gia server Discord', points: 30 },
      { title: 'Kết nối ví MetaMask', description: 'Kết nối ví ERC-20', points: 100 },
      { title: 'Like + Share Facebook', description: 'Like fanpage', points: 20 },
      { title: 'Điểm danh hàng ngày', description: 'Điểm danh nhận điểm', points: 10 }
    ]);
  }
}
initData();

// ============ AUTH ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email đã tồn tại' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = email === ADMIN_EMAIL ? 'admin' : 'user';
    // Tạo SubID duy nhất
    const subId = 'SUB' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();

    const user = await User.create({ email, password: hashedPassword, role, subId });
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, points: user.points, level: user.level, role: user.role, subId: user.subId, accounts: user.accounts }
    });
  } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
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
      user: { id: user._id, email: user.email, points: user.points, level: user.level, role: user.role, subId: user.subId, accounts: user.accounts, affiliateEarnings: user.affiliateEarnings, taskEarnings: user.taskEarnings }
    });
  } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
});

// ============ USER ============
app.get('/api/users/me', auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  if (!user) return res.status(404).json({ message: 'Không tìm thấy' });
  res.json(user);
});

app.put('/api/user/accounts', auth, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.userId, { accounts: req.body }, { new: true });
  res.json({ message: 'Đã lưu', accounts: user.accounts });
});

// Lấy thống kê cá nhân
app.get('/api/users/stats', auth, async (req, res) => {
  const user = await User.findById(req.user.userId);
  const conversions = await Conversion.find({ userId: req.user.userId, status: 'approved' });
  const totalAffiliate = conversions.reduce((sum, c) => sum + c.commission, 0);
  const conversionCount = conversions.length;

  res.json({
    points: user.points,
    level: user.level,
    taskEarnings: user.taskEarnings,
    affiliateEarnings: totalAffiliate,
    conversionCount,
    subId: user.subId
  });
});

// Lấy lịch sử đơn hàng của user
app.get('/api/users/conversions', auth, async (req, res) => {
  const conversions = await Conversion.find({ userId: req.user.userId }).sort({ timestamp: -1 }).limit(50);
  res.json(conversions);
});

// ============ TASKS ============
app.get('/api/tasks', auth, async (req, res) => {
  const tasks = await Task.find({ status: 'active' });
  res.json(tasks);
});

app.post('/api/tasks/complete/:taskId', auth, async (req, res) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Không tìm thấy' });
  if (task.completions.includes(req.user.userId)) return res.status(400).json({ message: 'Đã hoàn thành' });

  task.completions.push(req.user.userId);
  await task.save();

  const user = await User.findById(req.user.userId);
  user.points += task.points;
  user.taskEarnings += task.points;
  user.completedTasks.push({ taskId: task._id, pointsEarned: task.points, completedAt: new Date() });
  if (user.points >= user.level * 1000) user.level += 1;
  await user.save();

  res.json({ message: 'Hoàn thành!', pointsEarned: task.points, totalPoints: user.points, level: user.level });
});

// ============ ACCESSTRADE AFFILIATE ============

// Lấy offers từ Accesstrade API
app.get('/api/affiliate/offers', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    // Thử lấy từ Accesstrade API
    let offers = [];
    try {
      const response = await axios.get(`${ACCESSTRADE_API}/offers`, {
        headers: { 'Authorization': `Token ${ACCESSTRADE_API_KEY}` },
        params: { limit: 20 }
      });
      offers = response.data.data.map(o => ({
        id: o.id,
        name: o.name,
        description: o.description || o.name,
        commission: o.commission_rate + '%',
        link: o.affiliate_url || o.url,
        merchant: o.merchant?.name || '',
        image: o.image_url || ''
      }));
    } catch (apiError) {
      console.log('Accesstrade API error, using fallback');
      offers = [
        { id: '1', name: 'Shopee - Mua sắm', description: 'Hoa hồng hấp dẫn', commission: '5%', link: 'https://shopee.vn' },
        { id: '2', name: 'Lazada - Siêu sale', description: 'Giảm giá sốc', commission: '3%', link: 'https://lazada.vn' },
        { id: '3', name: 'Tiki - Giao nhanh', description: 'Miễn phí vận chuyển', commission: '2%', link: 'https://tiki.vn' }
      ];
    }

    // Gắn SubID vào link
    const data = offers.map(o => ({
      ...o,
      affiliateLink: o.link + (o.link.includes('?') ? '&' : '?') + 'subid=' + user.subId
    }));

    res.json({ success: true, data, subId: user.subId });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Webhook nhận conversion từ Accesstrade
app.post('/api/affiliate/webhook', async (req, res) => {
  try {
    const { subid, offer_id, offer_name, commission, amount, order_code, click_id } = req.body;

    if (!subid) return res.status(400).json({ message: 'Thiếu subid' });

    const user = await User.findOne({ subId: subid });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    await Conversion.create({
      subId: subid,
      userId: user._id.toString(),
      userEmail: user.email,
      offerId: offer_id || '',
      offerName: offer_name || 'Unknown',
      orderCode: order_code || click_id || 'N/A',
      commission: commission || 0,
      amount: amount || 0,
      status: 'approved'
    });

    // Cộng hoa hồng cho user
    user.affiliateEarnings += (commission || 0);
    await user.save();

    console.log(`✅ Conversion: ${user.email} +${commission}đ từ ${offer_name}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Lỗi' });
  }
});

// User tự submit đơn (thủ công, admin duyệt)
app.post('/api/affiliate/submit-conversion', auth, async (req, res) => {
  try {
    const { offerId, orderCode, amount } = req.body;
    const user = await User.findById(req.user.userId);

    const commissionRate = 5; // 5% mặc định
    const commission = (amount || 0) * commissionRate / 100;

    await Conversion.create({
      subId: user.subId,
      userId: user._id.toString(),
      userEmail: user.email,
      offerId,
      orderCode,
      commission,
      amount: amount || 0,
      status: 'pending'
    });

    res.json({ message: 'Đã gửi đơn! Admin sẽ duyệt.' });
  } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
});

// ============ ADMIN ============

// Kiểm tra admin
function isAdmin(userId) {
  return User.findById(userId).then(u => u?.role === 'admin');
}

// API quản lý Accesstrade
app.get('/api/admin/accesstrade/config', auth, async (req, res) => {
  if (!(await isAdmin(req.user.userId))) return res.status(403).json({ message: 'Không có quyền' });
  res.json({
    apiKey: ACCESSTRADE_API_KEY ? '****' + ACCESSTRADE_API_KEY.slice(-4) : 'Chưa cấu hình',
    webhookUrl: process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}/api/affiliate/webhook` : 'Chưa có'
  });
});

app.put('/api/admin/accesstrade/config', auth, async (req, res) => {
  if (!(await isAdmin(req.user.userId))) return res.status(403).json({ message: 'Không có quyền' });
  // Cập nhật API key (trong môi trường thực tế, lưu vào biến môi trường hoặc DB)
  process.env.ACCESSTRADE_API_KEY = req.body.apiKey;
  res.json({ message: 'Đã cập nhật API Key (tạm thời)' });
});

app.get('/api/admin/users', auth, async (req, res) => {
  if (!(await isAdmin(req.user.userId))) return res.status(403).json({ message: 'Không có quyền' });
  const users = await User.find({}).select('-password');
  res.json(users);
});

app.get('/api/admin/conversions', auth, async (req, res) => {
  if (!(await isAdmin(req.user.userId))) return res.status(403).json({ message: 'Không có quyền' });
  const conversions = await Conversion.find({}).sort({ timestamp: -1 }).limit(100);
  res.json(conversions);
});

app.put('/api/admin/conversions/:id', auth, async (req, res) => {
  if (!(await isAdmin(req.user.userId))) return res.status(403).json({ message: 'Không có quyền' });

  const conversion = await Conversion.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });

  if (req.body.status === 'approved' && conversion) {
    await User.findByIdAndUpdate(conversion.userId, { $inc: { affiliateEarnings: conversion.commission } });
  }

  res.json({ message: 'Đã cập nhật' });
});

app.get('/api/admin/stats', auth, async (req, res) => {
  if (!(await isAdmin(req.user.userId))) return res.status(403).json({ message: 'Không có quyền' });

  const totalUsers = await User.countDocuments();
  const totalTasks = await Task.countDocuments();
  const totalCompletions = (await Task.find({})).reduce((sum, t) => sum + t.completions.length, 0);
  const conversions = await Conversion.find({ status: 'approved' });
  const totalCommission = conversions.reduce((sum, c) => sum + c.commission, 0);

  res.json({
    totalUsers,
    totalTasks,
    totalCompletions,
    totalConversions: conversions.length,
    totalCommission
  });
});

app.post('/api/admin/tasks', auth, async (req, res) => {
  if (!(await isAdmin(req.user.userId))) return res.status(403).json({ message: 'Không có quyền' });
  const task = await Task.create(req.body);
  res.json(task);
});

app.delete('/api/admin/tasks/:id', auth, async (req, res) => {
  if (!(await isAdmin(req.user.userId))) return res.status(403).json({ message: 'Không có quyền' });
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xóa' });
});

// ============ FRONTEND ============
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// ============ START ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server port ${PORT}`));
