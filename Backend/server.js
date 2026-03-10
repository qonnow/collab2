const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/db');
const packetRoutes = require('./routes/packetRoutes');
const statsRoutes = require('./routes/statsRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const setupSocket = require('./sockets/packetSocket');

const app = express();
const server = http.createServer(app);

// ตั้งค่า CORS origin
const corsOrigin = process.env.CORS_ORIGIN
  || (process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:5173');

// ตั้งค่า Socket.io
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// มิดเดิลแวร์
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: corsOrigin,
}));
app.use(morgan('dev'));
app.use(express.json());

// ตัวจำกัดอัตราการร้องขอ
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// ทำให้ io เข้าถึงได้จาก routes
app.set('io', io);

// เส้นทาง API
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/packets', apiLimiter, packetRoutes);
app.use('/api/stats', apiLimiter, statsRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ตั้งค่า Socket.io
setupSocket(io);

// เชื่อมต่อฐานข้อมูลและเริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket ready on port ${PORT}`);
  });
});

module.exports = { app, server, io };
