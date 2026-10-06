const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const [notifs] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    const [unread] = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE is_read = FALSE');
    res.json({
      notifications: notifs,
      unreadCount: unread[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notifikasi ditandai telah dibaca' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE');
    res.json({ message: 'Semua notifikasi ditandai telah dibaca' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
