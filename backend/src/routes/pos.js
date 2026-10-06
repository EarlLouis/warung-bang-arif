const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAudit } = require('./auth');

// GET /api/pos/menus
router.get('/menus', async (req, res) => {
  try {
    const [menus] = await pool.query(`
      SELECT m.*, 
             r.id as recipe_id, 
             r.version as recipe_version, 
             r.marination_time_minutes, 
             r.taste_profile
      FROM menus m
      LEFT JOIN recipes r ON m.id = r.menu_id AND r.is_active = TRUE
      ORDER BY m.is_favorite DESC, m.category ASC, m.id ASC
    `);

    // Get ingredients availability status for each menu
    for (let menu of menus) {
      if (menu.recipe_id) {
        const [recipeIngs] = await pool.query(`
          SELECT ri.amount_required, i.name as ingredient_name, i.current_stock, i.unit
          FROM recipe_ingredients ri
          JOIN ingredients i ON ri.ingredient_id = i.id
          WHERE ri.recipe_id = ?
        `, [menu.recipe_id]);

        let canMake = 9999;
        for (let ing of recipeIngs) {
          if (ing.amount_required > 0) {
            const possible = Math.floor(parseFloat(ing.current_stock) / parseFloat(ing.amount_required));
            if (possible < canMake) canMake = possible;
          }
        }
        menu.max_portion_available = canMake === 9999 ? 0 : canMake;
        menu.is_in_stock = canMake > 0;
      } else {
        menu.max_portion_available = 50;
        menu.is_in_stock = true;
      }
    }

    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pos/orders
router.post('/orders', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      orderType = 'DINE_IN',
      customerName = 'Pelanggan Walk-in',
      tableNumber = '-',
      userId = null,
      userShiftId = null,
      items = [],
      discount = 0,
      paymentMethod = 'CASH',
      amountPaid = 0,
      notes = ''
    } = req.body;

    if (!items || items.length === 0) {
      await connection.rollback();
      return status(400).json({ error: 'Keranjang pesanan tidak boleh kosong' });
    }

    // Generate invoice number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    // Calculate subtotal & platform fee if delivery
    let subtotal = 0;
    let totalItems = 0;
    for (const item of items) {
      subtotal += parseFloat(item.unitPrice) * parseInt(item.qty, 10);
      totalItems += parseInt(item.qty, 10);
    }

    let platformFee = 0;
    if (['GOFOOD', 'GRABFOOD', 'SHOPEEFOOD'].includes(orderType)) {
      platformFee = subtotal * 0.20; // 20% platform commission
    }

    const totalAmount = Math.max(0, subtotal - parseFloat(discount || 0));
    const paid = parseFloat(amountPaid || totalAmount);
    const changeAmount = Math.max(0, paid - totalAmount);

    // 1. Insert Order
    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        invoice_number, order_type, customer_name, table_number, 
        user_id, user_shift_id, total_items, subtotal, discount, 
        platform_fee, total_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?)`,
      [
        invoiceNumber, orderType, customerName, tableNumber,
        userId, userShiftId, totalItems, subtotal, discount,
        platformFee, totalAmount, notes
      ]
    );

    const orderId = orderResult.insertId;

    // 2. Insert Order Items & Auto-Deduct Stock based on Recipes
    const lowStockAlerts = [];

    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (
          order_id, menu_id, qty, unit_price, subtotal, 
          spicy_level, sweetness_level, notes, kds_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ANTRI')`,
        [
          orderId, item.menuId, item.qty, item.unitPrice, 
          item.unitPrice * item.qty, item.spicyLevel || 'Sedang', 
          item.sweetnessLevel || 'Sedang / Pas', item.notes || '',
        ]
      );

      // Fetch active recipe for this menu
      const [recipes] = await connection.query(
        'SELECT id FROM recipes WHERE menu_id = ? AND is_active = TRUE LIMIT 1',
        [item.menuId]
      );

      if (recipes.length > 0) {
        const recipeId = recipes[0].id;
        const [ingredients] = await connection.query(
          `SELECT ri.ingredient_id, ri.amount_required, i.name, i.current_stock, i.min_threshold, i.unit 
           FROM recipe_ingredients ri 
           JOIN ingredients i ON ri.ingredient_id = i.id 
           WHERE ri.recipe_id = ?`,
          [recipeId]
        );

        for (const ing of ingredients) {
          const deduction = parseFloat(ing.amount_required) * parseInt(item.qty, 10);
          const previousStock = parseFloat(ing.current_stock);
          const resultingStock = Math.max(0, previousStock - deduction);

          // Update stock
          await connection.query(
            'UPDATE ingredients SET current_stock = ? WHERE id = ?',
            [resultingStock, ing.ingredient_id]
          );

          // Insert stock mutation
          await connection.query(
            `INSERT INTO stock_mutations (
              ingredient_id, mutation_type, amount, previous_stock, 
              resulting_stock, notes, ref_id
            ) VALUES (?, 'OUT_POS', ?, ?, ?, ?, ?)`,
            [
              ing.ingredient_id, deduction, previousStock, 
              resultingStock, `Pengurangan pesanan POS: ${invoiceNumber} (${item.qty}x menu #${item.menuId})`, 
              invoiceNumber
            ]
          );

          // Check if below threshold
          if (resultingStock <= parseFloat(ing.min_threshold)) {
            lowStockAlerts.push({
              id: ing.ingredient_id,
              name: ing.name,
              stock: resultingStock,
              unit: ing.unit,
              threshold: ing.min_threshold
            });
          }
        }
      }
    }

    // 3. Insert Payment
    const transactionRef = paymentMethod === 'QRIS' 
      ? `QRIS-${Date.now()}` 
      : (paymentMethod === 'TRANSFER' ? `TF-${Date.now()}` : `CASH-${invoiceNumber}`);

    await connection.query(
      `INSERT INTO payments (
        order_id, payment_method, amount_paid, change_amount, 
        transaction_ref, status
      ) VALUES (?, ?, ?, ?, ?, 'PAID')`,
      [orderId, paymentMethod, paid, changeAmount, transactionRef]
    );

    // 4. Create Notifications for low stocks if any
    for (const alert of lowStockAlerts) {
      await connection.query(
        `INSERT INTO notifications (type, title, message, severity) 
         VALUES ('STOK_MENIPIS', 'Stok Menipis!', ?, 'WARNING')`,
        [`Bahan ${alert.name} tersisa ${alert.stock} ${alert.unit} (Di bawah batas aman ${alert.threshold} ${alert.unit}). Segera lakukan Restock PO!`]
      );
    }

    await connection.commit();

    // Fetch complete newly created order
    const [createdOrders] = await pool.query(
      `SELECT o.*, p.payment_method, p.amount_paid, p.change_amount, p.transaction_ref 
       FROM orders o 
       JOIN payments p ON o.id = p.order_id 
       WHERE o.id = ?`,
      [orderId]
    );

    const [orderItemsList] = await pool.query(
      `SELECT oi.*, m.name as menu_name, m.code as menu_code 
       FROM order_items oi 
       JOIN menus m ON oi.menu_id = m.id 
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const fullOrder = {
      ...createdOrders[0],
      items: orderItemsList
    };

    // Emit Socket.IO event if io is attached to app
    const io = req.app.get('io');
    if (io) {
      io.emit('order:created', fullOrder);
      if (lowStockAlerts.length > 0) {
        io.emit('inventory:low_stock', lowStockAlerts);
      }
    }

    if (userId) {
      await logAudit(userId, 'TRANSAKSI_POS', 'POS Kasir', `Memproses order #${invoiceNumber} total Rp ${totalAmount} (${paymentMethod})`);
    }

    res.status(201).json({
      message: 'Transaksi berhasil disimpan',
      order: fullOrder
    });
  } catch (err) {
    await connection.rollback();
    console.error('POS order creation error:', err);
    res.status(500).json({ error: 'Gagal memproses pesanan: ' + err.message });
  } finally {
    connection.release();
  }
});

// GET /api/pos/orders/:id/receipt
router.get('/orders/:id/receipt', async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.name as cashier_name, p.payment_method, p.amount_paid, p.change_amount, p.transaction_ref, p.created_at as paid_at
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN payments p ON o.id = p.order_id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const [items] = await pool.query(
      `SELECT oi.*, m.name as menu_name, m.code as menu_code
       FROM order_items oi
       JOIN menus m ON oi.menu_id = m.id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    res.json({
      warung: {
        name: 'Ayam Goreng & Bakar Madu Bang Arif',
        address: 'Jl. Rimat Bakti No.8, Sijono Barat, Batang, Jawa Tengah',
        phone: '0812-3456-7890',
        operatingHours: '11:00 - 00:00 WIB (2 Shift)'
      },
      order: orders[0],
      items
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
