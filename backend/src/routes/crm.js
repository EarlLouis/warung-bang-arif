const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAudit } = require('./auth');

// GET /api/crm/feedbacks (Internal dashboard)
router.get('/feedbacks', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = `
      SELECT cf.*, o.invoice_number, o.order_type, o.table_number
      FROM customer_feedbacks cf
      LEFT JOIN orders o ON cf.order_id = o.id
    `;
    const params = [];
    if (category) {
      sql += ' WHERE cf.category = ?';
      params.push(category);
    }
    sql += ' ORDER BY cf.created_at DESC';

    const [feedbacks] = await pool.query(sql, params);
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/public/feedback (Public endpoint for customer scanning QR code)
router.post('/public/feedback', async (req, res) => {
  try {
    const { orderId, customerName, phone, rating, category, comment } = req.body;

    if (!customerName || !rating || !category || !comment) {
      return res.status(400).json({ error: 'Nama, rating, kategori, dan komentar wajib diisi' });
    }

    const [result] = await pool.query(
      `INSERT INTO customer_feedbacks (order_id, customer_name, phone, rating, category, comment, status)
       VALUES (?, ?, ?, ?, ?, ?, 'BARU')`,
      [orderId || null, customerName, phone || '-', rating, category, comment]
    );

    // If category is "RASA", create immediate high-priority notification to Owner linked to Recipe Module!
    if (category === 'RASA') {
      const notifTitle = `Komplain Rasa dari ${customerName} (Rating: ${rating}★)`;
      const notifMsg = `Keluhan rasa: "${comment}". Notifikasi ini terhubung ke Modul Resep Baku untuk evaluasi takaran bumbu & SOP marinasi.`;
      
      await pool.query(
        `INSERT INTO notifications (type, title, message, severity, metadata_json)
         VALUES ('KOMPLAIN_RASA', ?, ?, 'WARNING', ?)`,
        [notifTitle, notifMsg, JSON.stringify({ feedbackId: result.insertId, category: 'RASA', rating })]
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('notification:new', {
          type: 'KOMPLAIN_RASA',
          title: notifTitle,
          message: notifMsg
        });
      }
    }

    res.status(201).json({
      message: 'Terima kasih atas ulasan & masukan Anda untuk Warung Bang Arif!',
      feedbackId: result.insertId
    });
  } catch (err) {
    console.error('Public feedback error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/crm/feedbacks/:id/response
router.patch('/feedbacks/:id/response', async (req, res) => {
  try {
    const { status, ownerResponse, userId } = req.body;
    await pool.query(
      'UPDATE customer_feedbacks SET status = ?, owner_response = ? WHERE id = ?',
      [status || 'REVIEWED', ownerResponse || '', req.params.id]
    );

    await logAudit(userId || 1, 'TANGGAPI_KOMPLAIN', 'CRM Pelanggan', `Menanggapi feedback #${req.params.id} status: ${status}`);

    res.json({ message: 'Tanggapan berhasil disimpan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
