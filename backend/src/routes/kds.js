const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/kds/orders
router.get('/orders', async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT o.*, 
             TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) as elapsed_minutes
      FROM orders o
      WHERE o.status IN ('RECEIVED', 'COOKING', 'READY')
      ORDER BY o.created_at ASC
    `);

    for (let order of orders) {
      const [items] = await pool.query(`
        SELECT oi.*, m.name as menu_name, m.code as menu_code,
               r.id as recipe_id, r.marination_time_minutes, r.taste_profile, r.sop_notes
        FROM order_items oi
        JOIN menus m ON oi.menu_id = m.id
        LEFT JOIN recipes r ON m.id = r.menu_id AND r.is_active = TRUE
        WHERE oi.order_id = ?
      `, [order.id]);

      // Checklists for recipes if any
      for (let item of items) {
        if (item.recipe_id) {
          const [checks] = await pool.query(
            'SELECT * FROM sop_checklists WHERE recipe_id = ? ORDER BY step_number ASC',
            [item.recipe_id]
          );
          item.sop_checklists = checks;
        } else {
          item.sop_checklists = [];
        }
      }

      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/kds/orders/:id/status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, itemId, sopChecked } = req.body;
    const orderId = req.params.id;

    if (itemId) {
      // Update specific item status
      await pool.query(
        'UPDATE order_items SET kds_status = ?, sop_checked = COALESCE(?, sop_checked) WHERE id = ?',
        [status, sopChecked !== undefined ? sopChecked : null, itemId]
      );
    }

    // Check if order overall status should be updated
    if (status === 'MEMASAK') {
      await pool.query("UPDATE orders SET status = 'COOKING' WHERE id = ?", [orderId]);
    } else if (status === 'SIAP_SAJI') {
      await pool.query("UPDATE orders SET status = 'READY' WHERE id = ?", [orderId]);
      
      // Create notification to Cashier and Owner
      const [ord] = await pool.query('SELECT invoice_number, table_number, order_type FROM orders WHERE id = ?', [orderId]);
      if (ord.length > 0) {
        const title = `Pesanan Siap: ${ord[0].invoice_number}`;
        const message = `Makanan untuk ${ord[0].table_number !== '-' ? ord[0].table_number : ord[0].order_type} telah matang & siap disajikan.`;
        await pool.query(
          "INSERT INTO notifications (type, title, message, severity) VALUES ('KDS_SIAP', ?, ?, 'INFO')",
          [title, message]
        );
      }
    } else if (status === 'SELESAI') {
      await pool.query("UPDATE orders SET status = 'COMPLETED' WHERE id = ?", [orderId]);
      await pool.query("UPDATE order_items SET kds_status = 'SELESAI' WHERE order_id = ?", [orderId]);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('kds:order_updated', { orderId, status, itemId });
    }

    res.json({ message: 'Status KDS berhasil diperbarui', orderId, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
