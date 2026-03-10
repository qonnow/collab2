import { io } from 'socket.io-client';

// ถ้าไม่ระบุ VITE_SOCKET_URL ให้ใช้ origin เดียวกับเว็บ (ผ่าน nginx proxy)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

// เชื่อมต่อ socket พร้อม token ของผู้ใช้
export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (token && !socket.connected) {
    socket.auth = { token };
    socket.connect();
  }
};

// ตัดการเชื่อมต่อ socket เมื่อออกจากระบบ
export const disconnectSocket = () => {
  socket.disconnect();
};

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('connect_error', (err) => {
  console.log('Socket auth error:', err.message);
});

// ลอง auto-connect ถ้ามี token อยู่แล้ว (เช่นรีเฟรชหน้า)
const existingToken = localStorage.getItem('token');
if (existingToken) {
  socket.auth = { token: existingToken };
  socket.connect();
}

export default socket;
