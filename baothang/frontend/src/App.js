import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

axios.defaults.baseURL = 'http://localhost:3000';

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
    try { const res = await axios.get('/api/affiliate/offers'); setOffers(res.data.data || [res.data]); } catch (e) {}
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
      showNotif('Thanh cong!');
      fetchTasks();
    } catch (e) { showNotif(e.response?.data?.message || 'Loi', 'error'); }
    setLoading(false);
  };

  const completeTask = async (id) => {
    try {
      const res = await axios.post('/api/tasks/complete/' + id, { proof: 'done' });
      showNotif('+' + res.data.points + ' diem!');
      fetchUser();
      fetchTasks();
    } catch (e) { showNotif(e.response?.data?.message || 'Loi', 'error'); }
  };

  const copyLink = (text) => { navigator.clipboard.writeText(text); showNotif('Da copy!'); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  const showNotif = (msg, type='success') => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  if (!user) {
    return (
      <div className="App">
        <header className="App-header"><h1>BaoThang.top</h1></header>
        <div className="auth-container">
          <div className="auth-card">
            <h2>{isLogin ? 'Dang Nhap' : 'Dang Ky'}</h2>
            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Mat khau</label>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Dang xu ly...' : (isLogin ? 'Dang Nhap' : 'Dang Ky')}</button>
            </form>
            <p className="toggle-auth" onClick={()=>setIsLogin(!isLogin)}>{isLogin ? 'Chua co tk? Dang ky' : 'Da co tk? Dang nhap'}</p>
          </div>
        </div>
        {notif && <div className="toast">{notif.msg}</div>}
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>BaoThang.top</h1>
        <div className="user-info">
          <span>Cap {user.level}</span>
          <span>{user.points} diem</span>
          <span>{user.email}</span>
          <button onClick={logout} className="btn btn-outline-light btn-sm">Thoat</button>
        </div>
      </header>
      <div className="nav-tabs">
        <button className={'nav-tab ' + (tab==='tasks'?'active':'')} onClick={()=>{setTab('tasks');fetchTasks();}}>Nhiem vu</button>
        <button className={'nav-tab ' + (tab==='affiliate'?'active':'')} onClick={()=>{setTab('affiliate');fetchOffers();}}>Affiliate</button>
      </div>
      <div className="dashboard">
        {tab==='tasks' && (
          <>
            <h2>Nhiem vu Airdrop</h2>
            <div className="tasks-grid">
              {tasks.map(t=>(
                <div key={t._id} className="task-card">
                  <h3>{t.title}</h3>
                  <p>{t.description}</p>
                  <div className="task-reward">+{t.points} diem</div>
                  <button className="btn-complete" onClick={()=>completeTask(t._id)}>Hoan thanh</button>
                </div>
              ))}
            </div>
          </>
        )}
        {tab==='affiliate' && (
          <>
            <h2>Affiliate Marketing</h2>
            <div className="offers-grid">
              {offers.map(o=>(
                <div key={o.id} className="offer-card">
                  <h4>{o.name}</h4>
                  <p>Hoa hong: {o.commission}</p>
                  <button className="btn-copy-link" onClick={()=>copyLink(o.affiliateLink)}>Copy Link</button>
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
