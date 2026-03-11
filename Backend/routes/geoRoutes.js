const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { lookupGeo } = require('../services/geoService');

router.use(authenticate);

/**
 * GET /api/geo/lookup?ips=1.1.1.1,8.8.8.8
 * Batch IP → geo lookup; คืนค่า object { ip: geoResult }
 */
router.get('/lookup', (req, res) => {
  const raw = req.query.ips || '';
  // จำกัด 100 IP ต่อ request เพื่อป้องกัน abuse
  const ips = [...new Set(raw.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 100);

  const result = {};
  for (const ip of ips) {
    result[ip] = lookupGeo(ip); // null ถ้าไม่พบ
  }
  res.json(result);
});

module.exports = router;
