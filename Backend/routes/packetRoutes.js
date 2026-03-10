const express = require('express');
const router = express.Router();
const Packet = require('../models/Packet');
const { encrypt, decrypt } = require('../services/encryptionService');
const { startCapture, stopCapture, getCaptureStatus, getMemoryStore } = require('../services/packetService');
const { getIsConnected } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

// แคช username ตาม userId (ลดการคิวรีซ้ำ)
const usernameCache = new Map();
const resolveUsername = async (userId) => {
  if (!userId) return null;
  if (usernameCache.has(userId)) return usernameCache.get(userId);
  const user = await User.findById(userId);
  const name = user?.username || null;
  usernameCache.set(userId, name);
  return name;
};

// ใช้ authenticate กับทุกเส้นทาง
router.use(authenticate);

// GET /api/packets - ดึงแพ็กเก็ต (admin เห็นทั้งหมด, user เห็นเฉพาะของตัวเอง)
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    if (getIsConnected()) {
      const filter = isAdmin ? {} : { userId };
      if (req.query.protocol) filter.protocol = req.query.protocol.toUpperCase();
      if (req.query.isEncrypted !== undefined) filter.isEncrypted = req.query.isEncrypted === 'true';
      if (req.query.isSuspicious !== undefined) filter.isSuspicious = req.query.isSuspicious === 'true';
      if (req.query.sourceIP) filter.sourceIP = req.query.sourceIP;

      const countFilter = Object.fromEntries(
        Object.entries(filter).map(([k, v]) => {
          const MAP = { protocol: 'protocol', isEncrypted: 'is_encrypted', isSuspicious: 'is_suspicious', sourceIP: 'source_ip', userId: 'user_id' };
          return [MAP[k] || k, v];
        })
      );
      const total = await Packet.countDocuments(countFilter);
      let packets = await Packet.find({ filter, sort: { capturedAt: -1 }, skip, limit });

      // admin: แนบ ownerName ให้ทุก packet
      if (isAdmin) {
        packets = await Promise.all(packets.map(async (p) => ({
          ...p,
          ownerName: await resolveUsername(p.userId),
        })));
      }

      return res.json({
        packets,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }

    // โหมดหน่วยความจำ
    let data = isAdmin ? getMemoryStore() : getMemoryStore().filter(p => p.userId === userId);
    if (req.query.protocol) data = data.filter(p => p.protocol === req.query.protocol.toUpperCase());
    if (req.query.isEncrypted !== undefined) data = data.filter(p => p.isEncrypted === (req.query.isEncrypted === 'true'));
    if (req.query.isSuspicious !== undefined) data = data.filter(p => p.isSuspicious === (req.query.isSuspicious === 'true'));

    const total = data.length;
    let packets = data.slice(skip, skip + limit);

    if (isAdmin) {
      packets = await Promise.all(packets.map(async (p) => ({
        ...p,
        ownerName: await resolveUsername(p.userId),
      })));
    }

    res.json({
      packets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/packets/capture/status - สถานะการจับแพ็กเก็ต
router.get('/capture/status', (req, res) => {
  const userId = req.user.id;
  res.json({ isCapturing: getCaptureStatus(userId) });
});

// GET /api/packets/:id - ดึงแพ็กเก็ตตาม ID (admin เห็นทั้งหมด, user เฉพาะของตัวเอง)
router.get('/:id', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;
    let packet;
    if (getIsConnected()) {
      packet = await Packet.findById(req.params.id);
    } else {
      packet = getMemoryStore().find(p => p._id === req.params.id || p.packetId === req.params.id);
    }
    if (!packet) return res.status(404).json({ error: 'Packet not found' });
    // admin ดูได้ทุก packet, user ดูได้เฉพาะของตัวเอง
    if (!isAdmin && packet.userId !== userId) return res.status(403).json({ error: 'Access denied' });
    res.json(packet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packets/encrypt - เข้ารหัส payload
router.post('/encrypt', (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload) return res.status(400).json({ error: 'Payload is required' });
    const encrypted = encrypt(payload);
    res.json({ original: payload, encrypted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packets/decrypt - ถอดรหัส payload
router.post('/decrypt', (req, res) => {
  try {
    const { encryptedPayload } = req.body;
    if (!encryptedPayload) return res.status(400).json({ error: 'Encrypted payload is required' });
    const decrypted = decrypt(encryptedPayload);
    if (!decrypted) return res.status(400).json({ error: 'Failed to decrypt - invalid data' });
    res.json({ encrypted: encryptedPayload, decrypted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packets/capture/start - เริ่มจับแพ็กเก็ต (ต่อผู้ใช้)
router.post('/capture/start', (req, res) => {
  const io = req.app.get('io');
  const userId = req.user.id;
  const interval = parseInt(req.query.interval) || 1000;
  startCapture(io, userId, interval);
  res.json({ status: 'capturing', interval });
});

// POST /api/packets/capture/stop - หยุดจับแพ็กเก็ต (ต่อผู้ใช้)
router.post('/capture/stop', (req, res) => {
  const userId = req.user.id;
  stopCapture(userId);
  res.json({ status: 'stopped' });
});

module.exports = router;
