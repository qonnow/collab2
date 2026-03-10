const express = require('express');
const router = express.Router();
const Packet = require('../models/Packet');
const { getIsConnected } = require('../config/db');
const { getMemoryStore } = require('../services/packetService');
const { authenticate } = require('../middleware/auth');

// ใช้ authenticate กับทุกเส้นทาง
router.use(authenticate);

// ตัวช่วย: จัดกลุ่มตามฟิลด์ในหน่วยความจำ
const groupBy = (arr, key) => {
  const map = {};
  for (const item of arr) {
    const k = item[key];
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
};

// GET /api/stats/overview - สถิติภาพรวม (admin เห็นทั้งหมด, user เฉพาะของตัวเอง)
router.get('/overview', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = isAdmin ? null : req.user.id;
    if (getIsConnected()) {
      const result = await Packet.statsOverview(userId);
      return res.json(result);
    }

    // โหมดหน่วยความจำ
    const data = isAdmin ? getMemoryStore() : getMemoryStore().filter(p => p.userId === req.user.id);
    const totalPackets = data.length;
    const encryptedCount = data.filter(p => p.isEncrypted).length;
    const unencryptedCount = totalPackets - encryptedCount;
    const suspiciousCount = data.filter(p => p.isSuspicious).length;
    const avgSize = totalPackets > 0 ? data.reduce((s, p) => s + p.size, 0) / totalPackets : 0;

    res.json({
      totalPackets, encryptedCount, unencryptedCount, suspiciousCount,
      encryptionRate: totalPackets > 0 ? ((encryptedCount / totalPackets) * 100).toFixed(1) : 0,
      averageSize: Math.round(avgSize),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/protocols - สถิติแยกตามโปรโตคอล (admin เห็นทั้งหมด, user เฉพาะของตัวเอง)
router.get('/protocols', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = isAdmin ? null : req.user.id;
    if (getIsConnected()) {
      const result = await Packet.statsByProtocol(userId);
      return res.json(result);
    }

    const memData = isAdmin ? getMemoryStore() : getMemoryStore().filter(p => p.userId === req.user.id);
    const groups = groupBy(memData, 'protocol');
    const result = Object.entries(groups).map(([protocol, packets]) => ({
      protocol,
      count: packets.length,
      avgSize: Math.round(packets.reduce((s, p) => s + p.size, 0) / packets.length),
    })).sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/timeline - สถิติตามเวลา (admin เห็นทั้งหมด, user เฉพาะของตัวเอง)
router.get('/timeline', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = isAdmin ? null : req.user.id;
    const minutes = parseInt(req.query.minutes) || 30;
    const since = new Date(Date.now() - minutes * 60 * 1000);

    if (getIsConnected()) {
      const result = await Packet.statsTimeline(since, userId);
      return res.json(result);
    }

    // โหมดหน่วยความจำ
    const allData = isAdmin ? getMemoryStore() : getMemoryStore().filter(p => p.userId === req.user.id);
    const data = allData.filter(p => new Date(p.capturedAt) >= since);
    const timeGroups = {};
    for (const p of data) {
      const d = new Date(p.capturedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      if (!timeGroups[key]) timeGroups[key] = { time: key, total: 0, encrypted: 0, unencrypted: 0, suspicious: 0 };
      timeGroups[key].total++;
      if (p.isEncrypted) timeGroups[key].encrypted++; else timeGroups[key].unencrypted++;
      if (p.isSuspicious) timeGroups[key].suspicious++;
    }

    res.json(Object.values(timeGroups).sort((a, b) => a.time.localeCompare(b.time)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/threats - สถิติภัยคุกคาม (admin เห็นทั้งหมด, user เฉพาะของตัวเอง)
router.get('/threats', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = isAdmin ? null : req.user.id;
    if (getIsConnected()) {
      const result = await Packet.statsThreats(userId);
      return res.json(result);
    }

    const allData = isAdmin ? getMemoryStore() : getMemoryStore().filter(p => p.userId === req.user.id);
    const suspicious = allData.filter(p => p.isSuspicious);
    const levelGroups = groupBy(suspicious, 'threatLevel');
    const summary = Object.entries(levelGroups).map(([level, pkts]) => ({ level, count: pkts.length })).sort((a, b) => b.count - a.count);
    const recent = suspicious.slice(0, 10).map(t => ({
      _id: t._id, packetId: t.packetId, protocol: t.protocol, sourceIP: t.sourceIP,
      destinationIP: t.destinationIP, threatLevel: t.threatLevel, threatDescription: t.threatDescription, capturedAt: t.capturedAt,
    }));

    res.json({ summary, recent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/top-ips - IP ที่พบมากที่สุด (admin เห็นทั้งหมด, user เฉพาะของตัวเอง)
router.get('/top-ips', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = isAdmin ? null : req.user.id;
    if (getIsConnected()) {
      const result = await Packet.statsTopIPs(userId);
      return res.json(result);
    }

    const data = isAdmin ? getMemoryStore() : getMemoryStore().filter(p => p.userId === req.user.id);
    const srcMap = {}, dstMap = {};
    for (const p of data) {
      srcMap[p.sourceIP] = (srcMap[p.sourceIP] || 0) + 1;
      dstMap[p.destinationIP] = (dstMap[p.destinationIP] || 0) + 1;
    }
    const topSources = Object.entries(srcMap).map(([ip, count]) => ({ ip, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const topDestinations = Object.entries(dstMap).map(([ip, count]) => ({ ip, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    res.json({ topSources, topDestinations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
