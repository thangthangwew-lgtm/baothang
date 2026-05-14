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
const ADMIN_EMAIL = 'thangthangwew@gmail.com'; // Email admin mặc định

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], tasks: [] }));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
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
  } catch (error) {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

// ============ AUTH ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, walletAddress } = req.body;
    const data = readData();
    
    if (data.users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Nếu email là admin thì tự động set role admin
    const role = email === ADMIN_EMAIL ? 'admin' : 'user';
    
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      walletAddress: walletAddress || '',
      points: 0,
      level: 1,
      role: role,
      affiliateCode: 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      completedTasks: [],
      createdAt: new Date()
    };
    
    data.users.push(newUser);
    writeData(data);
    
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        points: newUser.points,
        level: newUser.level,
        role: newUser.role,
        affiliateCode: newUser.affiliateCode
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
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
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        points: user.points,
        level: user.level,
        role: user.role,
        affiliateCode: user.affiliateCode
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ============ USER ============
app.get('/api/users/me', auth, (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
  const { password, ...userInfo } = user;
  res.json(userInfo);
});

// ============ TASKS ============
function initTasks() {
  const data = readData();
  if (data.tasks.length === 0) {
    data.tasks = [
      { id: '1', title: 'Follow Twitter @BaoThang', description: 'Follow tài khoản Twitter chính thức', points: 50, status: 'active', completions: [] },
      { id: '2', title: 'Tham gia Telegram Group', description: 'Tham gia group Telegram chính thức', points: 30, status: 'active', completions: [] },
      { id: '3', title: 'Đăng ký tài khoản Binance', description: 'Đăng ký qua link giới thiệu', points: 200, status: 'active', completions: [] },
      { id: '4', title: 'Like Fanpage Facebook', description: 'Like fanpage BaoThang.top', points: 20, status: 'active', completions: [] },
      { id: '5', title: 'Điểm danh hàng ngày', description: 'Điểm danh nhận điểm thưởng', points: 10, status: 'active', completions: [] }
    ];
    writeData(data);
  }
}
initTasks();

app.get('/api/tasks', auth, (req, res) => {
  const data = readData();
  const tasks = data.tasks.filter(t => t.status === 'active');
  res.json(tasks);
});

app.post('/api/tasks/complete/:taskId', auth, (req, res) => {
  const data = readData();
  const task = data.tasks.find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ' });
  if (task.completions.includes(req.user.userId)) return res.status(400).json({ message: 'Bạn đã hoàn thành nhiệm vụ này' });
  
  task.completions.push(req.user.userId);
  const user = data.users.find(u => u.id === req.user.userId);
  user.points += task.points;
  user.completedTasks.push({ taskId: task.id, pointsEarned: task.points, completedAt: new Date() });
  if (user.points >= user.level * 1000) user.level += 1;
  
  writeData(data);
  res.json({ message: 'Hoàn thành!', pointsEarned: task.points, totalPoints: user.points, level: user.level });
});

// ============ ADMIN ============
app.get('/api/admin/users', auth, (req, res) => {
  const data = readData();
  const admin = data.users.find(u => u.id === req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  
  const users = data.users.map(u => ({ id: u.id, email: u.email, points: u.points, level: u.level, role: u.role, createdAt: u.createdAt }));
  res.json(users);
});

app.post('/api/admin/tasks', auth, (req, res) => {
  const data = readData();
  const admin = data.users.find(u => u.id === req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  
  const { title, description, points } = req.body;
  const newTask = { id: Date.now().toString(), title, description, points: Number(points), status: 'active', completions: [] };
  data.tasks.push(newTask);
  writeData(data);
  res.json(newTask);
});

app.delete('/api/admin/tasks/:id', auth, (req, res) => {
  const data = readData();
  const admin = data.users.find(u => u.id === req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  
  data.tasks = data.tasks.filter(t => t.id !== req.params.id);
  writeData(data);
  res.json({ message: 'Đã xóa' });
});

app.put('/api/admin/users/:id', auth, (req, res) => {
  const data = readData();
  const admin = data.users.find(u => u.id === req.user.userId);
  if (admin.role !== 'admin') return res.status(403).json({ message: 'Không có quyền' });
  
  const user = data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
  
  if (req.body.role) user.role = req.body.role;
  writeData(data);
  res.json({ message: 'Đã cập nhật' });
});

// ============ AFFILIATE ============
app.get('/api/affiliate/offers', auth, (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === req.user.userId);
  const offers = [
    { id: 1, name: 'Shopee', description: 'Mua sắm online', commission: '5%', affiliateLink: `https://shopee.vn/?ref=${user.affiliateCode}` },
    { id: 2, name: 'Lazada', description: 'Siêu sale', commission: '3%', affiliateLink: `https://lazada.vn/?ref=${user.affiliateCode}` },
    { id: 3, name: 'Tiki', description: 'Giao nhanh', commission: '2%', affiliateLink: `https://tiki.vn/?ref=${user.affiliateCode}` }
  ];
  res.json({ success: true, data: offers });
});

// ============ SERVE FRONTEND ============
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại port ${PORT}`);
  console.log(`👑 Admin email: ${ADMIN_EMAIL}`);
});
