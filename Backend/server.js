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
const geoRoutes = require('./routes/geoRoutes');
// reportRoutes — สร้างรายงาน PDF สรุปผล Network Packet (ใช้ pdfkit)
const reportRoutes = require('./routes/reportRoutes');
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

// apiLimiter ต้องสร้างแยกกันสำหรับแต่ละ route group
// เพราะ express-rate-limit นับ counter รวมกัน ทำให้หมดโควต้าเร็ว
const makeApiLimiter = (max = 1000) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// ทำให้ io เข้าถึงได้จาก routes
app.set('io', io);

// เส้นทาง API
app.use('/api/auth',    authLimiter,       authRoutes);
app.use('/api/packets', makeApiLimiter(),   packetRoutes);
app.use('/api/stats',   makeApiLimiter(),   statsRoutes);
app.use('/api/admin',   makeApiLimiter(),   adminRoutes);
app.use('/api/geo',     makeApiLimiter(),   geoRoutes);
// /api/reports ใช้ rate limiter แยกต่างหากเพื่อไม่ให้กระทบ endpoint อื่น
app.use('/api/reports', makeApiLimiter(),   reportRoutes);

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
