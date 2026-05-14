const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'baothang-secret-key-2024';
const ADMIN_EMAIL = 'thangthangwew@gmail.com';

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], tasks: [], offers: [], clicks: [], conversions: [] }));
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  if (!data.offers) data.offers = [];
  if (!data.clicks) data.clicks = [];
  if (!data.conversions) data.conversions = [];
  return data;
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function auth(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Không có token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) { res.status(401).json({ message: 'Token không hợp lệ' }); }
}

// ============ AUTH ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = readData();
    if (data.users.find(u => u.email === email)) return res.status(400).json({ message: 'Email đã tồn tại' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = email === ADMIN_EMAIL ? 'admin' : 'user';
    const newUser = {
      id: Date.now().toString(), email, password: hashedPassword,
      points: 0, level: 1, role, affiliateCode: 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      completedTasks: [], affiliateEarnings: 0,
      accounts: { twitter: '', discord: '', wallet: '' },
      createdAt: new Date()
    };
    data.users.push(newUser);
    writeData(data);
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, points: newUser.points, level: newUser.level, role: newUser.role, affiliateCode: newUser.affiliateCode, accounts: newUser.accounts } });
  } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = readData();
    const user = data.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, points: user.points, level: user.level, role: user.role, affiliateCode: user.affiliateCode, accounts: user.accounts, affiliateEarnings: user.affiliateEarnings } });
  } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
});

// ============ USER ============
app.get('/api/users/me', auth, (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
  const { password, ...userInfo } = user;
  res.json(userInfo);
});

// ============ USER ACCOUNTS ============
app.put('/api/user/accounts', auth, (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
  user.accounts = req.body;
  writeData(data);
  res.json({ message: 'Đã lưu', accounts: user.accounts });
});

// ============ TASKS ============
function initData() {
  const data = readData();
  if (data.tasks.length === 0) {
    data.tasks = [
      { id: '1', title: 'Follow Twitter @BaoThang', description: 'Follow + Retweet', points: 50, status: 'active', completions: [] },
      { id: '2', title: 'Tham gia Discord', description: 'Tham gia server Discord', points: 30, status: 'active', completions: [] },
      { id: '3', title: 'Kết nối ví MetaMask', description: 'Kết nối ví ERC-20', points: 100, status: 'active', completions: [] },
      { id: '4', title: 'Like + Share Facebook', description: 'Like fanpage', points: 20, status: 'active', completions: [] },
      { id: '5', title: 'Điểm danh hàng ngày', description: 'Điểm danh', points: 10, status: 'active', completions: [] }
    ];
  }
  if (data.offers.length === 0) {
    data.offers = [
      { id: '1', name: 'Shopee', description: 'Mua sắm online', commission: '5%', link: 'https://shopee.vn', clicks: 0, conversions: 0 },
      { id: '2', name: 'Lazada', description: 'Siêu sale', commission: '3%', link: 'https://lazada.vn', clicks: 0, conversions: 0 },
      { id: '3', name: 'Tiki', description: 'Giao nhanh', commission: '2%', link: 'https://tiki.vn', clicks: 0, conversions: 0 }
    ];
  }
  writeData(data);
}
initData();

app.get('/api/tasks', auth, (req, res) => {
  res.json(readData().tasks.filter(t => t.status === 'active'));
});

app.post('/api/tasks/complete/:taskId', auth, (req, res) => {
  const data = readData();
  const task = data.tasks.find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Không tìm thấy' });
  if (task.completions.includes(req.user.userId)) return res.status(400).json({ message: 'Đã hoàn thành' });
  task.completions.push(req.user.userId);
  const user = data.users.find(u => u.id === req.user.userId);
  user.points += task.points;
  user.completedTasks.push({ taskId: task.id, pointsEarned: task.points, completedAt: new Date() });
  if (user.points >= user.level * 1000) user.level += 1;
  writeData(data);
  res.json({ message: 'Hoàn thành!', pointsEarned: task.points, totalPoints: user.points, level: user.level });
});

// ============ AFFILIATE ============
app.get('/api/affiliate/offers', auth, (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === req.user.userId);
  const offers = data.offers.map(o => ({ ...o, affiliateLink: o.link + '?ref=' + user.affiliateCode }));
  res.json({ success: true, data: offers });
});

app.post('/api/affiliate/click/:offerId', auth, (req, res) => {
  const data = readData();
  const offer = data.offers.find(o => o.id === req.params.offerId);
  if (offer) { offer.clicks = (offer.clicks || 0) + 1; data.clicks.push({ offerId: req.params.offerId, userId: req.user.userId, timestamp: new Date() }); writeData(data); }
  res.json({ success: true });
});

// ============ SUBMIT CONVERSION (USER GỬI MÃ ĐƠN) ============
app.post('/api/affiliate/submit-conversion', auth, (req, res) => {
  const data = readData();
  const { offerId, orderCode } = req.body;
  const user = data.users.find(u => u.id === req.user.userId);
  const offer = data.offers.find(o => o.id === offerId);
  if (!user || !offer) return res.status(404).json({ message: 'Không tìm thấy' });
  
  const commissionValue = parseInt(offer.commission) || 5;
  const conversion = {
    id: Date.now().toString(),
    offerId, offerName: offer.name,
    userId: user.id, userEmail: user.email,
    orderCode, commission: commissionValue * 1000,
    status: 'pending', // pending → approved/rejected
    timestamp: new Date()
  };
  data.conversions.push(conversion);
  writeData(data);
  res.json({ message: 'Đã gửi yêu cầu! Admin sẽ kiểm tra và duyệt.', conversion });
});

// ============ ADMIN ============
app.get('/api/admin/users', auth, (req, res) => {
  const data = readData();
  if (data.users.find(u => u.id === req.user.userId)?.role !== 'admin') return res
