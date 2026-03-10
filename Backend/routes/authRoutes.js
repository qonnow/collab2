const express = require('express');
const bcrypt = require('bcryptjs');
const { getIsConnected } = require('../config/db');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// หน่วยความจำในเครื่อง
const memoryUsers = [];
const memoryAuditLogs = [];

const findMemoryUser = (field, value) => memoryUsers.find((u) => u[field] === value);

/** ตัวช่วย: บันทึกเหตุการณ์ตรวจสอบ */
const logAudit = async (userId, action, details, ip) => {
  try {
    if (getIsConnected()) {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({ userId, action, details, ipAddress: ip });
    } else {
      memoryAuditLogs.push({ userId, action, details, ipAddress: ip, createdAt: new Date() });
    }
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

/**
 * POST /api/auth/register - สมัครสมาชิก
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required.' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (getIsConnected()) {
      const User = require('../models/User');

      const existingUser = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
      if (existingUser) {
        return res.status(409).json({ error: 'Username or email already exists.' });
      }

      const user = await User.create({ username, email, password: hashedPassword });

      const token = generateToken(user);
      await logAudit(user._id, 'REGISTER', `User ${username} registered`, req.ip);
      return res.status(201).json({
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      });
    } else {
      // โหมดหน่วยความจำ
      if (findMemoryUser('username', username) || findMemoryUser('email', email.toLowerCase())) {
        return res.status(409).json({ error: 'Username or email already exists.' });
      }

      const user = {
        id: `user-${Date.now()}`,
        _id: `user-${Date.now()}`,
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: memoryUsers.length === 0 ? 'admin' : 'user', // ผู้ใช้คนแรกเป็นแอดมิน
        isActive: true,
        createdAt: new Date(),
      };
      memoryUsers.push(user);

      const token = generateToken(user);
      await logAudit(user.id, 'REGISTER', `User ${username} registered`, req.ip);
      return res.status(201).json({
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
      });
    }
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

/**
 * POST /api/auth/login - เข้าสู่ระบบ
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    let user;

    if (getIsConnected()) {
      const User = require('../models/User');
      user = await User.findOne({ username });
    } else {
      user = findMemoryUser('username', username);
    }

    if (!user) {
      await logAudit(null, 'LOGIN_FAILED', `Failed login for ${username}`, req.ip);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await logAudit(user._id || user.id, 'LOGIN_FAILED', `Wrong password for ${username}`, req.ip);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // อัพเดตเวลาเข้าสู่ระบบล่าสุด
    if (getIsConnected()) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    } else {
      user.lastLogin = new Date();
    }

    const token = generateToken(user);
    await logAudit(user._id || user.id, 'LOGIN_SUCCESS', `User ${username} logged in`, req.ip);
    return res.json({
      token,
      user: { id: user._id || user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

/**
 * GET /api/auth/me - ดึงข้อมูลผู้ใช้ปัจจุบัน
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    if (getIsConnected()) {
      const User = require('../models/User');
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      const { password, ...safeUser } = user;
      return res.json(safeUser);
    } else {
      const user = memoryUsers.find((u) => u.id === req.user.id || u._id === req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      const { password, ...safeUser } = user;
      return res.json(safeUser);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PUT /api/auth/profile - อัพเดตโปรไฟล์ตัวเอง
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { email, password, currentPassword } = req.body;
    const updates = {};

    // ตรวจสอบอีเมลถ้ามีการส่งค่า
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
      }
      updates.email = email.toLowerCase().trim();
    }

    // ตรวจสอบการเปลี่ยนรหัสผ่านถ้ามีการร้องขอ
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }

      // ยืนยันรหัสผ่านปัจจุบัน
      let existingUser;
      if (getIsConnected()) {
        const User = require('../models/User');
        existingUser = await User.findById(req.user.id);
      } else {
        existingUser = memoryUsers.find((u) => u.id === req.user.id || u._id === req.user.id);
      }
      if (!existingUser) return res.status(404).json({ error: 'User not found.' });

      const valid = await bcrypt.compare(currentPassword, existingUser.password);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

      const salt = await bcrypt.genSalt(12);
      updates.password = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    if (getIsConnected()) {
      const User = require('../models/User');
      const updated = await User.findByIdAndUpdate(req.user.id, updates);
      if (!updated) return res.status(404).json({ error: 'User not found.' });
      const { password: _, ...safeUser } = updated;
      await logAudit(req.user.id, 'PROFILE_UPDATE', 'Profile updated', req.ip);
      return res.json(safeUser);
    } else {
      const user = memoryUsers.find((u) => u.id === req.user.id || u._id === req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      Object.assign(user, updates);
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    }
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
