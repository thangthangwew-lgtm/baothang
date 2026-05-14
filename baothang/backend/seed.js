const mongoose = require('mongoose');
const Task = require('./models/Task');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI);

const tasks = [
  { title:'Follow Twitter', description:'Follow Twitter @BaoThang', points:50, type:'social', status:'active' },
  { title:'Tham gia Telegram', description:'Tham gia group Telegram', points:30, type:'social', status:'active' },
  { title:'Dang ky Binance', description:'Dang ky qua link', points:200, type:'referral', status:'active' },
  { title:'Like Facebook', description:'Like fanpage BaoThang', points:20, type:'social', status:'active' },
  { title:'Diem danh', description:'Diem danh hang ngay', points:10, type:'daily', status:'active' }
];

Task.deleteMany({}).then(() => Task.insertMany(tasks)).then(() => {
  console.log('Done!');
  process.exit();
});
