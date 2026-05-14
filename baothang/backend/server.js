const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const affiliateRoutes = require('./routes/affiliate');
const userRoutes = require('./routes/users');

const app = express();

// Bảo mật cơ bản
app.use(helmet());
app.use(cors());
app.use(express.json());

// Giới hạn request
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/users', userRoutes);

// Phục vụ file tĩnh từ frontend
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Tất cả request khác trả về index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/baothang')
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.log('❌ Database error:', err));

// Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại port ${PORT}`);
});
