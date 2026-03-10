const jwt = require('jsonwebtoken');
const { startCapture, stopCapture, getCaptureStatus } = require('../services/packetService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const setupSocket = (io) => {
  // ตรวจสอบ token ก่อนเชื่อมต่อ
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`Client connected: ${socket.id} (user: ${userId})`);

    // เข้าร่วมห้องส่วนตัวของผู้ใช้
    socket.join(`user:${userId}`);

    // ส่งสถานะการจับแพ็กเก็ตของผู้ใช้นี้
    socket.emit('capture:status', { isCapturing: getCaptureStatus(userId) });

    // จัดการเริ่มจับแพ็กเก็ต (ต่อผู้ใช้)
    socket.on('capture:start', (data) => {
      const interval = data?.interval || 1000;
      startCapture(io, userId, interval);
      io.to(`user:${userId}`).emit('capture:status', { isCapturing: true });
      console.log(`Capture started by user ${userId}`);
    });

    // จัดการหยุดจับแพ็กเก็ต (ต่อผู้ใช้)
    socket.on('capture:stop', () => {
      stopCapture(userId);
      io.to(`user:${userId}`).emit('capture:status', { isCapturing: false });
      console.log(`Capture stopped by user ${userId}`);
    });

    // จัดการการตัดการเชื่อมต่อ
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id} (user: ${userId})`);
    });
  });
};

module.exports = setupSocket;
