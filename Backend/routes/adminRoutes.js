const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getIsConnected } = require('../config/db');

const router = express.Router();

// เส้นทางแอดมินทั้งหมดต้องยืนยันตัวตน + สิทธิ์แอดมิน
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/users - แสดงรายชื่อผู้ใช้ทั้งหมด
 */
router.get('/users', async (req, res) => {
  try {
    if (!getIsConnected()) {
      return res.json([]);
    }
    const { getSupabase } = require('../config/db');
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, username, email, role, is_active, last_login, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const users = (data || []).map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      role: r.role,
      isActive: r.is_active,
      lastLogin: r.last_login,
      createdAt: r.created_at,
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/users/:id/role - เปลี่ยน Role ผู้ใช้
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "admin" or "user".' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role.' });
    }
    if (!getIsConnected()) {
      return res.status(503).json({ error: 'Database not available.' });
    }
    const User = require('../models/User');
    const updated = await User.findByIdAndUpdate(req.params.id, { role });
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json({ id: updated.id, username: updated.username, role: updated.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/logs - ดึงบันทึกการตรวจสอบ (แบ่งหน้า)
 */
router.get('/logs', async (req, res) => {
  try {
    if (!getIsConnected()) {
      return res.json({ logs: [], total: 0 });
    }
    const AuditLog = require('../models/AuditLog');
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({ skip, limit }),
      AuditLog.count(),
    ]);
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
