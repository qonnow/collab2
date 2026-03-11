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
      if (req.query.protocol)          filter.protocol = req.query.protocol.toUpperCase();
      if (req.query.isEncrypted !== undefined && req.query.isEncrypted !== '') filter.isEncrypted = req.query.isEncrypted === 'true';
      if (req.query.isSuspicious !== undefined && req.query.isSuspicious !== '') filter.isSuspicious = req.query.isSuspicious === 'true';
      if (req.query.sourceIP)          filter.sourceIP = req.query.sourceIP;
      if (req.query.threatLevel)       filter.threatLevel = req.query.threatLevel;
      if (req.query.encryptionMethod)  filter.encryptionMethod = req.query.encryptionMethod;
      if (req.query.ipSearch)          filter.ipSearch = req.query.ipSearch;
      if (req.query.sizeMin)           filter.sizeMin = parseInt(req.query.sizeMin);
      if (req.query.sizeMax)           filter.sizeMax = parseInt(req.query.sizeMax);
      if (req.query.dateFrom)          filter.dateFrom = req.query.dateFrom;
      if (req.query.dateTo)            filter.dateTo = req.query.dateTo;

      const sortBy = req.query.sortBy || 'capturedAt';
      const sortDir = req.query.sortDir === 'asc' ? 1 : -1;
      const total = await Packet.countDocuments(filter);
      let packets = await Packet.find({ filter, sort: { [sortBy]: sortDir }, skip, limit });

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
    if (req.query.isEncrypted !== undefined && req.query.isEncrypted !== '') data = data.filter(p => p.isEncrypted === (req.query.isEncrypted === 'true'));
    if (req.query.isSuspicious !== undefined && req.query.isSuspicious !== '') data = data.filter(p => p.isSuspicious === (req.query.isSuspicious === 'true'));
    if (req.query.threatLevel) data = data.filter(p => p.threatLevel === req.query.threatLevel);
    if (req.query.encryptionMethod) data = data.filter(p => p.encryptionMethod === req.query.encryptionMethod);
    if (req.query.sizeMin) data = data.filter(p => p.size >= parseInt(req.query.sizeMin));
    if (req.query.sizeMax) data = data.filter(p => p.size <= parseInt(req.query.sizeMax));
    if (req.query.dateFrom) { const d = new Date(req.query.dateFrom); data = data.filter(p => new Date(p.capturedAt) >= d); }
    if (req.query.dateTo)   { const d = new Date(req.query.dateTo);   data = data.filter(p => new Date(p.capturedAt) <= d); }

    // sort + relevance grouping
    const THREAT_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    const mSortBy  = req.query.sortBy  || 'capturedAt';
    const mSortDir = req.query.sortDir === 'asc' ? 1 : -1;
    // ฟังก์ชัน sort ทั่วไป — threatLevel ถูกแปลงเป็นตัวเลขก่อนเปรียบเทียบ
    const sortFn = (a, b) => {
      let av = a[mSortBy], bv = b[mSortBy];
      if (mSortBy === 'threatLevel') { av = THREAT_RANK[av] ?? 0; bv = THREAT_RANK[bv] ?? 0; }
      if (av < bv) return -mSortDir;
      if (av > bv) return  mSortDir;
      return 0;
    };
    if (req.query.ipSearch) {
      // Relevance sort: packet ที่ source IP ตรงกันจะขึ้นก่อน,
      // ส่วน packet ที่ตรงแค่ destination IP ตามมาหลัง
      const s = req.query.ipSearch.toLowerCase();
      const srcMatches = data.filter(p =>  (p.sourceIP      || '').toLowerCase().includes(s));
      const dstOnly    = data.filter(p => !(p.sourceIP      || '').toLowerCase().includes(s) &&
                                           (p.destinationIP || '').toLowerCase().includes(s));
      data = [...srcMatches.sort(sortFn), ...dstOnly.sort(sortFn)];
    } else {
      data.sort(sortFn);
    }

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

// GET /api/packets/export - ส่งออกข้อมูล CSV หรือ JSON (รองรับตัวกรองเดียวกับ GET /)
// จำกัดสูงสุด 5000 แถวเพื่อป้องกัน response ขนาดใหญ่เกินไป
router.get('/export', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;
    const format = (req.query.format || 'json').toLowerCase();
    const MAX = 5000;

    const buildFilter = (base) => {
      const f = { ...base };
      if (req.query.protocol)          f.protocol = req.query.protocol.toUpperCase();
      if (req.query.isEncrypted !== undefined && req.query.isEncrypted !== '') f.isEncrypted = req.query.isEncrypted === 'true';
      if (req.query.isSuspicious !== undefined && req.query.isSuspicious !== '') f.isSuspicious = req.query.isSuspicious === 'true';
      if (req.query.sourceIP)          f.sourceIP = req.query.sourceIP;
      if (req.query.threatLevel)       f.threatLevel = req.query.threatLevel;
      if (req.query.encryptionMethod)  f.encryptionMethod = req.query.encryptionMethod;
      if (req.query.ipSearch)          f.ipSearch = req.query.ipSearch;
      if (req.query.sizeMin)           f.sizeMin = parseInt(req.query.sizeMin);
      if (req.query.sizeMax)           f.sizeMax = parseInt(req.query.sizeMax);
      if (req.query.dateFrom)          f.dateFrom = req.query.dateFrom;
      if (req.query.dateTo)            f.dateTo = req.query.dateTo;
      return f;
    };

    let packets = [];
    if (getIsConnected()) {
      const filter = buildFilter(isAdmin ? {} : { userId });
      packets = await Packet.find({ filter, sort: { capturedAt: -1 }, skip: 0, limit: MAX });
      if (isAdmin) {
        packets = await Promise.all(packets.map(async (p) => ({ ...p, ownerName: await resolveUsername(p.userId) })));
      }
    } else {
      let data = isAdmin ? getMemoryStore() : getMemoryStore().filter(p => p.userId === userId);
      if (req.query.protocol) data = data.filter(p => p.protocol === req.query.protocol.toUpperCase());
      if (req.query.isEncrypted !== undefined && req.query.isEncrypted !== '') data = data.filter(p => p.isEncrypted === (req.query.isEncrypted === 'true'));
      if (req.query.isSuspicious !== undefined && req.query.isSuspicious !== '') data = data.filter(p => p.isSuspicious === (req.query.isSuspicious === 'true'));
      if (req.query.threatLevel) data = data.filter(p => p.threatLevel === req.query.threatLevel);
      if (req.query.encryptionMethod) data = data.filter(p => p.encryptionMethod === req.query.encryptionMethod);
      if (req.query.ipSearch) { const s = req.query.ipSearch.toLowerCase(); data = data.filter(p => (p.sourceIP || '').includes(s) || (p.destinationIP || '').includes(s)); }
      if (req.query.sizeMin) data = data.filter(p => p.size >= parseInt(req.query.sizeMin));
      if (req.query.sizeMax) data = data.filter(p => p.size <= parseInt(req.query.sizeMax));
      if (req.query.dateFrom) { const d = new Date(req.query.dateFrom); data = data.filter(p => new Date(p.capturedAt) >= d); }
      if (req.query.dateTo)   { const d = new Date(req.query.dateTo);   data = data.filter(p => new Date(p.capturedAt) <= d); }
      packets = data.slice(0, MAX);
    }

    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    if (format === 'csv') {
      const FIELDS = ['packetId', 'capturedAt', 'protocol', 'sourceIP', 'sourcePort', 'destinationIP', 'destinationPort', 'size', 'isEncrypted', 'encryptionMethod', 'cipherSuite', 'ttl', 'flags', 'isSuspicious', 'threatLevel', 'threatDescription'];
      // esc: escape ค่าที่มี comma, double-quote, หรือ newline ให้ถูกต้องตามมาตรฐาน CSV (RFC 4180)
      const esc = (v) => {
        if (v == null) return '';
        const s = Array.isArray(v) ? v.join(';') : String(v);
        return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [FIELDS.join(','), ...packets.map((p) => FIELDS.map((f) => esc(p[f])).join(','))].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="packets-${ts}.csv"`);
      return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="packets-${ts}.json"`);
    res.send(JSON.stringify(packets, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
