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
  const [conversions, setConversions] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', points: 0 });
  const [newOffer, setNewOffer] = useState({ name: '', description: '', commission: '', link: '' });
  const [adminTab, setAdminTab] = useState('tasks');
  
  // Airdrop account states
  const [myAccounts, setMyAccounts] = useState({ twitter: '', discord: '', wallet: '' });
  const [allAccounts, setAllAccounts] = useState([]);
  
  // Conversion approval
  const [pendingConversions, setPendingConversions] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
      fetchUser();
    }
  }, []);

  const fetchUser = async () => {
    try { 
      const res = await axios.get('/api/users/me'); 
      setUser(res.data); 
      if (res.data.accounts) setMyAccounts(res.data.accounts);
    } catch (e) { logout(); }
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

  const fetchAllAccounts = async () => {
    try { const res = await axios.get('/api/admin/accounts'); setAllAccounts(res.data); } catch (e) {}
  };

  const fetchAffiliateStats = async () => {
    try { const res = await axios.get('/api/admin/affiliate-stats'); setAffiliateStats(res.data); } catch (e) {}
  };

  const fetchConversions = async () => {
    try { const res = await axios.get('/api/admin/conversions'); setConversions(res.data); } catch (e) {}
  };

  const fetchPendingConversions = async () => {
    try { const res = await axios.get('/api/admin/pending-conversions'); setPendingConversions(res.data); } catch (e) {}
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

  // Save accounts
  const saveAccounts = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/user/accounts', myAccounts);
      showNotif('Đã lưu thông tin tài khoản!');
      fetchUser();
    } catch (e) { showNotif('Lỗi', 'error'); }
  };

  // Affiliate conversion
  const submitConversion = async (offerId) => {
    const orderCode = prompt('Nhập mã đơn hàng của bạn:');
    if (!orderCode) return;
    try {
      await axios.post('/api/affiliate/submit-conversion', { offerId, orderCode });
      showNotif('Đã gửi yêu cầu xác nhận hoa hồng! Admin sẽ kiểm tra.');
    } catch (e) { showNotif(e.response?.data?.message || 'Lỗi', 'error'); }
  };

  // Admin functions
  const addTask = async (e) => {
    e.preventDefault();
    try { await axios.post('/api/admin/tasks', newTask); showNotif('Đã thêm!'); setNewTask({ title: '', description: '', points: 0 }); fetchTasks(); } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const deleteTask = async (id) => {
    try { await axios.delete('/api/admin/tasks/' + id); showNotif('Đã xóa!'); fetchTasks(); } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const addOffer = async (e) => {
    e.preventDefault();
    try { await axios.post('/api/admin/offers', newOffer); showNotif('Đã thêm!'); setNewOffer({ name: '', description: '', commission: '', link: '' }); fetchOffers(); } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const deleteOffer = async (id) => {
    try { await axios.delete('/api/admin/offers/' + id); showNotif('Đã xóa!'); fetchOffers(); } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const approveConversion = async (id) => {
    try { await axios.put('/api/admin/conversions/' + id, { status: 'approved' }); showNotif('Đã duyệt!'); fetchPendingConversions(); fetchConversions(); fetchAffiliateStats(); } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const rejectConversion = async (id) => {
    try { await axios.put('/api/admin/conversions/' + id, { status: 'rejected' }); showNotif('Đã từ chối!'); fetchPendingConversions(); fetchConversions(); } catch (e) { showNotif('Lỗi', 'error'); }
  };

  const setAdmin = async (userId) => {
    try { await axios.put('/api/admin/users/' + userId, { role: 'admin' }); showNotif('Đã cấp admin!'); fetchUsers(); } catch (e) { showNotif('Lỗi', 'error'); }
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
          <button className={'nav-tab ' + (adminTab==='offers'?'active':'')} onClick={() => {setAdminTab('offers'); fetchOffers();}}>💰 Offers</button>
          <button className={'nav-tab ' + (adminTab==='conversions'?'active':'')} onClick={() => {setAdminTab('conversions'); fetchPendingConversions();}}>✅ Duyệt đơn</button>
          <button className={'nav-tab ' + (adminTab==='accounts'?'active':'')} onClick={() => {setAdminTab('accounts'); fetchAllAccounts();}}>👤 TK Airdrop</button>
          <button className={'nav-tab ' + (adminTab==='users'?'active':'')} onClick={() => {setAdminTab('users'); fetchUsers();}}>👥 Users</button>
          <button className={'nav-tab ' + (adminTab==='stats'?'active':'')} onClick={() => {setAdminTab('stats'); fetchAffiliateStats();}}>📊 Thống kê</button>
        </div>

        <div className="dashboard">
          {/* QUẢN LÝ NHIỆM VỤ */}
          {adminTab === 'tasks' && (
            <>
              <h2 style={{color:'white'}}>📋 Quản lý nhiệm vụ</h2>
              <div className="task-card" style={{marginBottom:30, textAlign:'left'}}>
                <h3>➕ Thêm nhiệm vụ</h3>
                <form onSubmit={addTask}>
                  <div className="form-group"><label>Tiêu đề</label><input type="text" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} required /></div>
                  <div className="form-group"><label>Mô tả</label><input type="text" value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} required /></div>
                  <div className="form-group"><label>Điểm</label><input type="number" value={newTask.points} onChange={(e) => setNewTask({...newTask, points: Number(e.target.value)})} required /></div>
                  <button type="submit" className="btn-complete">✅ Thêm</button>
                </form>
              </div>
              <div className="tasks-grid">
                {tasks.map(t => (
                  <div key={t.id} className="task-card">
                    <h3>{t.title}</h3><p>{t.description}</p>
                    <div className="task-reward">+{t.points} điểm</div>
                    <p>👤 {t.completions?.length || 0} lượt</p>
                    <button className="btn-complete" style={{background:'#ff4444'}} onClick={() => deleteTask(t.id)}>🗑️ Xóa</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* QUẢN LÝ OFFERS */}
          {adminTab === 'offers' && (
            <>
              <h2 style={{color:'white'}}>💰 Quản lý Affiliate Offers</h2>
              <div className="task-card" style={{marginBottom:30, textAlign:'left'}}>
                <h3>➕ Thêm Offer</h3>
                <form onSubmit={addOffer}>
                  <div className="form-group"><label>Tên</label><input type="text" value={newOffer.name} onChange={(e) => setNewOffer({...newOffer, name: e.target.value})} required /></div>
                  <div className="form-group"><label>Mô tả</label><input type="text" value={newOffer.description} onChange={(e) => setNewOffer({...newOffer, description: e.target.value})} required /></div>
                  <div className="form-group"><label>Hoa hồng (%)</label><input type="text" value={newOffer.commission} onChange={(e) => setNewOffer({...newOffer, commission: e.target.value})} required /></div>
                  <div className="form-group"><label>Link</label><input type="text" value={newOffer.link} onChange={(e) => setNewOffer({...newOffer, link: e.target.value})} required /></div>
                  <button type="submit" className="btn-complete">✅ Thêm</button>
                </form>
              </div>
              <div className="offers-grid">
                {offers.map(o => (
                  <div key={o.id} className="offer-card">
                    <h4>{o.name}</h4><p>{o.description}</p>
                    <p>Hoa hồng: {o.commission}</p>
                    <p>Click: {o.clicks || 0} | Đơn thành công: {o.conversions || 0}</p>
                    <button className="btn-complete" style={{background:'#ff4444'}} onClick={() => deleteOffer(o.id)}>🗑️ Xóa</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* DUYỆT ĐƠN AFFILIATE */}
          {adminTab === 'conversions' && (
            <>
              <h2 style={{color:'white'}}>✅ Duyệt đơn hàng Affiliate</h2>
              {pendingConversions.length === 0 && <p style={{color:'white'}}>Không có đơn chờ duyệt</p>}
              <div className="tasks-grid">
                {pendingConversions.map(c => (
                  <div key={c.id} className="task-card">
                    <h3>📦 {c.offerName}</h3>
                    <p><strong>User:</strong> {c.userEmail}</p>
                    <p><strong>Mã đơn:</strong> {c.orderCode}</p>
                    <p><strong>Hoa hồng:</strong> {c.commission}đ</p>
                    <p><strong>Ngày:</strong> {new Date(c.timestamp).toLocaleString()}</p>
                    <div style={{display:'flex', gap:10, marginTop:10}}>
                      <button className="btn-complete" style={{background:'#4CAF50', flex:1}} onClick={() => approveConversion(c.id)}>✅ Duyệt</button>
                      <button className="btn-complete" style={{background:'#ff4444', flex:1}} onClick={() => rejectConversion(c.id)}>❌ Từ chối</button>
                    </div>
                  </div>
                ))}
              </div>
              <h3 style={{color:'white', marginTop:30}}>📋 Lịch sử đơn đã duyệt</h3>
              <div className="tasks-grid">
                {conversions.filter(c => c.status === 'approved').map(c => (
                  <div key={c.id} className="task-card" style={{borderLeft:'4px solid #4CAF50'}}>
                    <p>📦 {c.offerName} - {c.userEmail}</p>
                    <p>💵 {c.commission}đ | {new Date(c.timestamp).toLocaleString()}</p>
                    <span style={{color:'green'}}>✅ Đã duyệt</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* QUẢN LÝ TÀI KHOẢN AIRDROP */}
          {adminTab === 'accounts' && (
            <>
              <h2 style={{color:'white'}}>👤 Tài khoản Airdrop của Users</h2>
              <div className="tasks-grid">
                {allAccounts.map(a => (
                  <div key={a.userId} className="task-card">
                    <h3>{a.email}</h3>
                    <p><strong>🐦 Twitter:</strong> {a.accounts?.twitter || 'Chưa có'}</p>
                    <p><strong>💬 Discord:</strong> {a.accounts?.discord || 'Chưa có'}</p>
                    <p><strong>👛 Ví Meta:</strong> {a.accounts?.wallet || 'Chưa có'}</p>
                    <p>Điểm: {a.points} | Cấp: {a.level}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* QUẢN LÝ USERS */}
          {adminTab === 'users' && (
            <>
              <h2 style={{color:'white'}}>👥 Users</h2>
              <div className="tasks-grid">
                {users.map(u => (
                  <div key={u.id} className="task-card">
                    <h3>{u.email}</h3>
                    <p>Cấp: {u.level} | Điểm: {u.points}</p>
                    <p>Vai trò: {u.role}</p>
                    <p>Hoa hồng: {u.affiliateEarnings || 0}đ</p>
                    {u.role !== 'admin' && <button className="btn-complete" onClick={() => setAdmin(u.id)}>👑 Cấp Admin</button>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* THỐNG KÊ */}
          {adminTab === 'stats' && (
            <>
              <h2 style={{color:'white'}}>📊 Thống kê</h2>
              <div className="tasks-grid">
                <div className="task-card"><h3>👥 Users</h3><h2 style={{color:'#667eea'}}>{affiliateStats.totalUsers || 0}</h2></div>
                <div className="task-card"><h3>✅ Nhiệm vụ</h3><h2 style={{color:'#4CAF50'}}>{affiliateStats.totalCompletions || 0}</h2></div>
                <div className="task-card"><h3>🖱️ Clicks</h3><h2 style={{color:'#FF9800'}}>{affiliateStats.totalClicks || 0}</h2></div>
                <div className="task-card"><h3>💰 Hoa hồng đã duyệt</h3><h2 style={{color:'#f44336'}}>{affiliateStats.totalCommission || 0}đ</h2></div>
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
        <button className={'nav-tab ' + (tab==='accounts'?'active':'')} onClick={() => setTab('accounts')}>👤 TK Airdrop</button>
      </div>
      
      <div className="dashboard">
        {tab==='tasks' && (
          <>
            <h2>Nhiệm vụ Airdrop</h2>
            <div className="tasks-grid">
              {tasks.map(t => (
                <div key={t.id} className="task-card">
                  <h3>{t.title}</h3><p>{t.description}</p>
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
            <p style={{color:'white'}}>Mã giới thiệu: <strong>{user.affiliateCode}</strong></p>
            <p style={{color:'#FFD700', fontSize:14}}>💡 Click share link → Người mua hàng → Gửi mã đơn → Admin duyệt → Nhận hoa hồng!</p>
            <div className="offers-grid">
              {offers.map(o => (
                <div key={o.id} className="offer-card">
                  <h4>{o.name}</h4><p>{o.description}</p>
                  <p><strong>Hoa hồng:</strong> {o.commission}</p>
                  <div style={{display:'flex', flexDirection:'column', gap:10}}>
                    <button className="btn-copy-link" onClick={() => copyLink(o.affiliateLink || o.link + '?ref=' + user.affiliateCode)}>📋 Copy Link</button>
                    <button className="btn-complete" style={{background:'#FF9800'}} onClick={() => submitConversion(o.id)}>📦 Gửi mã đơn hàng</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab==='accounts' && (
          <>
            <h2 style={{color:'white'}}>👤 Thông tin tài khoản Airdrop</h2>
            <p style={{color:'#ccc'}}>Cập nhật tài khoản để Admin giao nhiệm vụ phù hợp</p>
            <div className="task-card" style={{maxWidth:500, margin:'0 auto', textAlign:'left'}}>
              <form onSubmit={saveAccounts}>
                <div className="form-group">
                  <label>🐦 Tài khoản Twitter (X)</label>
                  <input type="text" value={myAccounts.twitter} onChange={(e) => setMyAccounts({...myAccounts, twitter: e.target.value})} placeholder="@username" />
                </div>
                <div className="form-group">
                  <label>💬 Tài khoản Discord</label>
                  <input type="text" value={myAccounts.discord} onChange={(e) => setMyAccounts({...myAccounts, discord: e.target.value})} placeholder="username#0000" />
                </div>
                <div className="form-group">
                  <label>👛 Ví MetaMask</label>
                  <input type="text" value={myAccounts.wallet} onChange={(e) => setMyAccounts({...myAccounts, wallet: e.target.value})} placeholder="0x..." />
                </div>
                <button type="submit" className="btn-complete">💾 Lưu thông tin</button>
              </form>
            </div>
          </>
        )}
      </div>
      {notif && <div className="toast">{notif.msg}</div>}
    </div>
  );
}

export default App;
