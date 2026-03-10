import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PacketList from './pages/PacketList';
import EncryptionTool from './pages/EncryptionTool';
import ThreatMonitor from './pages/ThreatMonitor';
import ProfileSettings from './pages/ProfileSettings';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import Register from './pages/Register';
import { loginUser, registerUser, getCurrentUser } from './services/api';
import socket, { connectSocket, disconnectSocket } from './services/socket';

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isCapturing, setIsCapturing] = useState(false);
  const [user, setUser] = useState(null);
  const [authPage, setAuthPage] = useState('login'); // หน้า login หรือ register
  const [authLoading, setAuthLoading] = useState(true);

  // ตรวจสอบ Token ที่บันทึกไว้เมื่อโหลดหน้า
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getCurrentUser()
        .then((res) => {
          setUser(res.data);
          connectSocket();
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onCaptureStatus = (data) => setIsCapturing(data.isCapturing);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('capture:status', onCaptureStatus);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('capture:status', onCaptureStatus);
    };
  }, []);

  const handleLogin = async (username, password) => {
    const res = await loginUser(username, password);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    connectSocket();
  };

  const handleRegister = async (username, email, password) => {
    const res = await registerUser(username, email, password);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    connectSocket();
  };

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem('token');
    setUser(null);
    setAuthPage('login');
  };

  // สถานะกำลังโหลดการยืนยันตัวตน
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050a18]">
        <div className="text-center animate-fade-in">
          <svg className="animate-spin h-8 w-8 text-[#3b82f6] mx-auto mb-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-sm text-[#4a5e80]">Loading...</p>
        </div>
      </div>
    );
  }

  // ยังไม่ได้เข้าสู่ระบบ — แสดงหน้าล็อกอิน/สมัครสมาชิก
  if (!user) {
    if (authPage === 'register') {
      return <Register onRegister={handleRegister} onSwitchToLogin={() => setAuthPage('login')} />;
    }
    return <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthPage('register')} />;
  }

  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-[#050a18]">
        <Sidebar isConnected={isConnected} isCapturing={isCapturing} user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-6 py-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Dashboard isCapturing={isCapturing} setIsCapturing={setIsCapturing} user={user} />} />
              <Route path="/packets" element={<PacketList user={user} />} />
              <Route path="/encryption" element={<EncryptionTool />} />
              <Route path="/threats" element={<ThreatMonitor />} />
              <Route path="/profile" element={<ProfileSettings user={user} onUpdate={(u) => setUser((prev) => ({ ...prev, ...u }))} />} />
              {user?.role === 'admin' && (
                <Route path="/admin" element={<AdminPanel />} />
              )}
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
