import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

axios.defaults.baseURL = 'https://baothang.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [offers, setOffers] = useState([]);
  const [tab, setTab] = useState('tasks');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Admin states
  const [users, setUsers] = useState([]);
  const [affiliateStats, setAffiliateStats] = useState({});
  const [newTask, setNewTask] = useState({ title: '', description: '', points: 0 });
  const [newOffer, setNewOffer] = useState({ name: '', description: '', commission: '', link: '' });
  const [adminTab, setAdminTab] = useState('tasks');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
      fetchUser();
    }
  }, []);

  const fetchUser = async () => {
    try { const res = await axios.get('/api/users/me'); setUser(res.data); } catch (e) { logout(); }
  };
  const fetchTasks = async () => {
    try { const res = await axios.get('/api/tasks'); setTasks(res.data); } catch (e) {}
  };
  const fetchOffers = async () => {
    try { const res = await axios.get('/api/affiliate/offers'); setOffers(res.data.data || []); } catch (e) {}
  };
  const fetchUsers = async () => {
    try { const res = await axios.get('/api/admin/users'); setUsers(res.data); } catch (e) {}
  };
  const fetchAffiliateStats = async () => {
    try { const res = await axios.get('/api/admin/affiliate-stats'); setAffiliateStats(res.data); } catch (e) {}
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(url, { email, password });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.token;
      setUser(res.data.user);
      showNotif('Thành công!');
      fetchTasks();
    } catch (e) { showNotif(e.response?.data?.message || 'Lỗi', 'error'); }
    setLoading(false);
  };

  const completeTask = async (id) => {
    try {
      const res = await axios.post('/api/tasks/complete/' + id, { proof: 'done' });
      showNotif('+' + res.data.pointsEarned + ' điểm!');
      fetchUser();
      fetchTasks();
    } catch (e) { showNotif(e.response?.data?.message || 'Lỗi', 'error'); }
  };

  // Admin functions
  const addTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/tasks', newTask);
      showNotif('Đã thêm nhiệm vụ!');
      setNewTask({ title: '', description: '', points: 0 });
      fetchTasks();
    } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const deleteTask = async (id) => {
    try { await axios.delete('/api/admin/tasks/' + id); showNotif('Đã xóa!'); fetchTasks(); } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const addOffer = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/offers', newOffer);
      showNotif('Đã thêm offer!');
      setNewOffer({ name: '', description: '', commission: '', link: '' });
      fetchOffers();
    } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const deleteOffer = async (id) => {
    try { await axios.delete('/api/admin/offers/' + id); showNotif('Đã xóa!'); fetchOffers(); } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const setAdmin = async (userId) => {
    try { await axios.put('/api/admin/users/' + userId, { role: 'admin' }); showNotif('Đã cấp quyền admin!'); fetchUsers(); } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const copyLink = (text) => { navigator.clipboard.writeText(text); showNotif('Đã copy!'); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  const showNotif = (msg, type='success') => { setNotif({msg,type}); setTimeout(() => setNotif(null), 3000); };

  // ========== ĐĂNG NHẬP ==========
  if (!user) {
    return (
      <div className="App">
        <header className="App-header"><h1>🚀 BaoThang.top</h1></header>
        <div className="auth-container">
          <div className="auth-card">
            <h2>{isLogin ? 'Đăng Nhập' : 'Đăng Ký'}</h2>
            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Mật khẩu</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng Nhập' : 'Đăng Ký')}
              </button>
            </form>
            <p className="toggle-auth" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
            </p>
          </div>
        </div>
        {notif && <div className="toast">{notif.msg}</div>}
      </div>
    );
  }

  // ========== TRANG ADMIN ==========
  if (user.role === 'admin') {
    return (
      <div className="App">
        <header className="App-header">
          <h1>🔧 Admin Panel</h1>
          <div className="user-info">
            <span className="level-badge">👑 {user.email}</span>
            <button onClick={logout} className="btn btn-outline-light btn-sm">Thoát</button>
          </div>
        </header>

        <div className="nav-tabs">
          <button className={'nav-tab ' + (adminTab==='tasks'?'active':'')} onClick={() => {setAdminTab('tasks'); fetchTasks();}}>📋 Nhiệm vụ</button>
          <button className={'nav-tab ' + (adminTab==='offers'?'active':'')} onClick={() => {setAdminTab('offers'); fetchOffers();}}>💰 Affiliate</button>
          <button className={'nav-tab ' + (adminTab==='users'?'active':'')} onClick={() => {setAdminTab('users'); fetchUsers();}}>👥 Users</button>
          <button className={'nav-tab ' + (adminTab==='stats'?'active':'')} onClick={() => {setAdminTab('stats'); fetchAffiliateStats();}}>📊 Thống kê</button>
        </div>

        <div className="dashboard">
          {/* QUẢN LÝ NHIỆM VỤ */}
          {adminTab === 'tasks' && (
            <>
              <h2 style={{color:'white'}}>📋 Quản lý nhiệm vụ</h2>
              <div className="task-card" style={{marginBottom:30, textAlign:'left'}}>
                <h3>➕ Thêm nhiệm vụ mới</h3>
                <form onSubmit={addTask}>
                  <div className="form-group">
                    <label>Tiêu đề</label>
                    <input type="text" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Mô tả</label>
                    <input type="text" value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Điểm thưởng</label>
                    <input type="number" value={newTask.points} onChange={(e) => setNewTask({...newTask, points: Number(e.target.value)})} required />
                  </div>
                  <button type="submit" className="btn-complete">✅ Thêm nhiệm vụ</button>
                </form>
              </div>
              <div className="tasks-grid">
                {tasks.map(t => (
                  <div key={t.id} className="task-card">
                    <h3>{t.title}</h3>
                    <p>{t.description}</p>
                    <div className="task-reward">+{t.points} điểm</div>
                    <p>👤 {t.completions?.length || 0} lượt</p>
                    <button className="btn-complete" style={{background:'#ff4444'}} onClick={() => deleteTask(t.id)}>🗑️ Xóa</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* QUẢN LÝ AFFILIATE OFFERS */}
          {adminTab === 'offers' && (
            <>
              <h2 style={{color:'white'}}>💰 Quản lý Affiliate Offers</h2>
              <div className="task-card" style={{marginBottom:30, textAlign:'left'}}>
                <h3>➕ Thêm Offer mới</h3>
                <form onSubmit={addOffer}>
                  <div className="form-group">
                    <label>Tên offer</label>
                    <input type="text" value={newOffer.name} onChange={(e) => setNewOffer({...newOffer, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Mô tả</label>
                    <input type="text" value={newOffer.description} onChange={(e) => setNewOffer({...newOffer, description: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Hoa hồng (%)</label>
                    <input type="text" value={newOffer.commission} onChange={(e) => setNewOffer({...newOffer, commission: e.target.value})} required placeholder="5%" />
                  </div>
                  <div className="form-group">
                    <label>Link gốc</label>
                    <input type="text" value={newOffer.link} onChange={(e) => setNewOffer({...newOffer, link: e.target.value})} required placeholder="https://shopee.vn/..." />
                  </div>
                  <button type="submit" className="btn-complete">✅ Thêm Offer</button>
                </form>
              </div>
              <div className="offers-grid">
                {offers.map(o => (
                  <div key={o.id} className="offer-card">
                    <h4>{o.name}</h4>
                    <p>{o.description}</p>
                    <p><strong>Hoa hồng:</strong> {o.commission}</p>
                    <p><strong>Link:</strong> {o.link?.substring(0,30)}...</p>
                    <p>👥 {o.clicks || 0} clicks | 💰 {o.conversions || 0} chuyển đổi</p>
                    <button className="btn-complete" style={{background:'#ff4444', marginTop:10}} onClick={() => deleteOffer(o.id)}>🗑️ Xóa</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* QUẢN LÝ USERS */}
          {adminTab === 'users' && (
            <>
              <h2 style={{color:'white'}}>👥 Quản lý người dùng</h2>
              <div className="tasks-grid">
                {users.map(u => (
                  <div key={u.id} className="task-card">
                    <h3>{u.email}</h3>
                    <p>Cấp: {u.level} | Điểm: {u.points}</p>
                    <p>Vai trò: <strong>{u.role}</strong></p>
                    <p>Affiliate Code: <strong>{u.affiliateCode}</strong></p>
                    <p>Hoa hồng kiếm được: <strong>{u.affiliateEarnings || 0}đ</strong></p>
                    {u.role !== 'admin' && (
                      <button className="btn-complete" onClick={() => setAdmin(u.id)}>👑 Cấp Admin</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* THỐNG KÊ */}
          {adminTab === 'stats' && (
            <>
              <h2 style={{color:'white'}}>📊 Thống kê hệ thống</h2>
              <div className="tasks-grid">
                <div className="task-card">
                  <h3>👥 Tổng Users</h3>
                  <h2 style={{color:'#667eea', fontSize:40}}>{affiliateStats.totalUsers || 0}</h2>
                </div>
                <div className="task-card">
                  <h3>✅ Tổng nhiệm vụ hoàn thành</h3>
                  <h2 style={{color:'#4CAF50', fontSize:40}}>{affiliateStats.totalCompletions || 0}</h2>
                </div>
                <div className="task-card">
                  <h3>🖱️ Tổng clicks</h3>
                  <h2 style={{color:'#FF9800', fontSize:40}}>{affiliateStats.totalClicks || 0}</h2>
                </div>
                <div className="task-card">
                  <h3>💰 Tổng hoa hồng</h3>
                  <h2 style={{color:'#f44336', fontSize:40}}>{affiliateStats.totalCommission || 0}đ</h2>
                </div>
              </div>
            </>
          )}
        </div>
        {notif && <div className="toast">{notif.msg}</div>}
      </div>
    );
  }

  // ========== TRANG USER ==========
  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 BaoThang.top</h1>
        <div className="user-info">
          <span>Cấp {user.level}</span>
          <span>{user.points} điểm</span>
          <span>{user.email}</span>
          <button onClick={logout} className="btn btn-outline-light btn-sm">Thoát</button>
        </div>
      </header>
      
      <div className="nav-tabs">
        <button className={'nav-tab ' + (tab==='tasks'?'active':'')} onClick={() => {setTab('tasks'); fetchTasks();}}>📋 Nhiệm vụ</button>
        <button className={'nav-tab ' + (tab==='affiliate'?'active':'')} onClick={() => {setTab('affiliate'); fetchOffers();}}>💰 Affiliate</button>
      </div>
      
      <div className="dashboard">
        {tab==='tasks' && (
          <>
            <h2>Nhiệm vụ Airdrop</h2>
            <div className="tasks-grid">
              {tasks.map(t => (
                <div key={t.id} className="task-card">
                  <h3>{t.title}</h3>
                  <p>{t.description}</p>
                  <div className="task-reward">+{t.points} điểm</div>
                  <button className="btn-complete" onClick={() => completeTask(t.id)}>Hoàn thành</button>
                </div>
              ))}
            </div>
          </>
        )}
        {tab==='affiliate' && (
          <>
            <h2>Affiliate Marketing</h2>
            <p style={{color:'white'}}>Mã giới thiệu của bạn: <strong>{user.affiliateCode}</strong></p>
            <div className="offers-grid">
              {offers.map(o => (
                <div key={o.id} className="offer-card">
                  <h4>{o.name}</h4>
                  <p>{o.description}</p>
                  <p><strong>Hoa hồng:</strong> {o.commission}</p>
                  <p style={{fontSize:12, color:'#666'}}>Click: {o.clicks || 0} | Chuyển đổi: {o.conversions || 0}</p>
                  <button className="btn-copy-link" onClick={() => copyLink(o.affiliateLink || o.link + '?ref=' + user.affiliateCode)}>📋 Copy Link</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {notif && <div className="toast">{notif.msg}</div>}
    </div>
  );
}

export default App;
