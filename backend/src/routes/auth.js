const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'bangarif_secret_jwt_2026';

// Authentication middleware for protected API actions.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);

  if (!token) {
    return res.status(401).json({ error: 'Token autentikasi diperlukan' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = String(req.user?.role || '').toUpperCase();
    if (!roles.map(r => String(r).toUpperCase()).includes(userRole)) {
      return res.status(403).json({ error: 'Akses ditolak. Fitur ini hanya dapat digunakan oleh Owner.' });
    }
    next();
  };
}

// Helper to log audit
async function logAudit(userId, action, moduleName, details) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [userId, action, moduleName, details]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Check active shift for user
    const [shiftRows] = await pool.query(
      `SELECT us.*, s.name as shift_name, s.start_time, s.end_time 
       FROM user_shifts us 
       JOIN shifts s ON us.shift_id = s.id 
       WHERE us.user_id = ? AND us.status = 'OPEN' 
       ORDER BY us.id DESC LIMIT 1`,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAudit(user.id, 'LOGIN', 'Autentikasi', `User ${user.name} (${user.role}) berhasil login.`);

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      activeShift: shiftRows.length > 0 ? shiftRows[0] : null
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server: ' + err.message });
  }
});

// GET /api/auth/shifts
router.get('/shifts', async (req, res) => {
  try {
    const [shifts] = await pool.query('SELECT * FROM shifts ORDER BY id ASC');
    res.json(shifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/shifts/open
router.post('/shifts/open', async (req, res) => {
  try {
    const { userId, shiftId, startingCash, notes } = req.body;
    
    // Close existing open shifts for safety
    await pool.query(
      "UPDATE user_shifts SET status = 'CLOSED', closed_at = NOW() WHERE user_id = ? AND status = 'OPEN'",
      [userId]
    );

    const [result] = await pool.query(
      `INSERT INTO user_shifts (user_id, shift_id, shift_date, starting_cash, status, notes) 
       VALUES (?, ?, CURDATE(), ?, 'OPEN', ?)`,
      [userId, shiftId, startingCash || 0, notes || 'Buka shift kasir baru']
    );

    await logAudit(userId, 'BUKA_SHIFT', 'Shift Kasir', `Membuka shift ID ${shiftId} dengan modal awal Rp ${startingCash}`);

    const [newShift] = await pool.query(
      `SELECT us.*, s.name as shift_name, s.start_time, s.end_time 
       FROM user_shifts us 
       JOIN shifts s ON us.shift_id = s.id 
       WHERE us.id = ?`,
      [result.insertId]
    );

    res.json({ message: 'Shift berhasil dibuka', shift: newShift[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/shifts/close
router.post('/shifts/close', async (req, res) => {
  try {
    const { userShiftId, endingCash, notes } = req.body;
    
    // Calculate expected cash: starting cash + total cash payments in this shift
    const [shiftInfo] = await pool.query('SELECT * FROM user_shifts WHERE id = ?', [userShiftId]);
    if (shiftInfo.length === 0) {
      return res.status(404).json({ error: 'Data shift tidak ditemukan' });
    }

    const shift = shiftInfo[0];
    const [cashOrders] = await pool.query(
      `SELECT COALESCE(SUM(p.amount_paid - p.change_amount), 0) as total_cash_sales 
       FROM orders o 
       JOIN payments p ON o.id = p.order_id 
       WHERE o.user_shift_id = ? AND p.payment_method = 'CASH' AND p.status = 'PAID'`,
      [userShiftId]
    );

    const totalCashSales = parseFloat(cashOrders[0].total_cash_sales || 0);
    const expectedCash = parseFloat(shift.starting_cash) + totalCashSales;
    const diff = parseFloat(endingCash || 0) - expectedCash;

    await pool.query(
      `UPDATE user_shifts 
       SET ending_cash = ?, expected_cash = ?, cash_difference = ?, status = 'CLOSED', closed_at = NOW(), notes = ? 
       WHERE id = ?`,
      [endingCash, expectedCash, diff, notes || 'Tutup shift dan rekonsiliasi kas', userShiftId]
    );

    await logAudit(shift.user_id, 'TUTUP_SHIFT', 'Shift Kasir', `Menutup shift #${userShiftId}. Fisik: Rp ${endingCash}, Harapan: Rp ${expectedCash}, Selisih: Rp ${diff}`);

    res.json({
      message: 'Shift berhasil ditutup dan direkonsiliasi',
      reconciliation: {
        startingCash: shift.starting_cash,
        totalCashSales,
        expectedCash,
        endingCash,
        cashDifference: diff
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, role, phone, created_at FROM users ORDER BY id ASC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/audit-logs
router.get('/audit-logs', async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT al.*, u.name as user_name, u.role as user_role 
       FROM audit_logs al 
       LEFT JOIN users u ON al.user_id = u.id 
       ORDER BY al.created_at DESC LIMIT 100`
    );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, logAudit, requireAuth, requireRole };
