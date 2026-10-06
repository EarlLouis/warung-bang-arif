const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAudit, requireAuth, requireRole } = require('./auth');

// GET /api/po/suppliers
router.get('/suppliers', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const [suppliers] = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
    for (let s of suppliers) {
      const [prices] = await pool.query(`
        SELECT sp.*, i.name as ingredient_name, i.unit, i.code as ingredient_code
        FROM supplier_prices sp
        JOIN ingredients i ON sp.ingredient_id = i.id
        WHERE sp.supplier_id = ?
      `, [s.id]);
      s.catalog = prices;
    }
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/po/price-comparison
router.get('/price-comparison', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const [ingredients] = await pool.query('SELECT id, code, name, unit, last_buy_price FROM ingredients WHERE is_active = 1 ORDER BY name ASC');
    const comparisons = [];

    for (let ing of ingredients) {
      const [supplierPrices] = await pool.query(`
        SELECT sp.price, sp.last_updated, s.id as supplier_id, s.name as supplier_name, s.phone
        FROM supplier_prices sp
        JOIN suppliers s ON sp.supplier_id = s.id
        WHERE sp.ingredient_id = ?
        ORDER BY sp.price ASC
      `, [ing.id]);

      comparisons.push({
        ...ing,
        bestPrice: supplierPrices.length > 0 ? supplierPrices[0].price : ing.last_buy_price,
        bestSupplier: supplierPrices.length > 0 ? supplierPrices[0].supplier_name : '-',
        suppliers: supplierPrices
      });
    }

    res.json(comparisons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/po
router.get('/', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT po.*, s.name as supplier_name, s.phone as supplier_phone, u.name as approver_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.approved_by = u.id
      ORDER BY po.created_at DESC
    `);

    for (let po of orders) {
      const [items] = await pool.query(`
        SELECT poi.*, i.name as ingredient_name, i.unit
        FROM purchase_order_items poi
        JOIN ingredients i ON poi.ingredient_id = i.id
        WHERE poi.po_id = ?
      `, [po.id]);
      po.items = items;
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/po (Create PO)
router.post('/', requireAuth, requireRole('OWNER'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { supplierId, items = [], notes = '', userId } = req.body;

    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    let totalCost = 0;
    for (let it of items) {
      totalCost += parseFloat(it.unitPrice) * parseFloat(it.qty);
    }

    const [poRes] = await connection.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, total_cost, status, order_date, notes)
       VALUES (?, ?, ?, 'PENDING_APPROVAL', CURDATE(), ?)`,
      [poNumber, supplierId, totalCost, notes]
    );

    const poId = poRes.insertId;

    for (let it of items) {
      await connection.query(
        `INSERT INTO purchase_order_items (po_id, ingredient_id, qty, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [poId, it.ingredientId, it.qty, it.unitPrice, it.unitPrice * it.qty]
      );
    }

    await connection.commit();
    await logAudit(userId || null, 'BUAT_PO', 'Purchase Order', `Membuat ${poNumber} senilai Rp ${totalCost}`);

    res.status(201).json({ message: 'Purchase order berhasil diajukan', poId, poNumber });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// PATCH /api/po/:id/approve (Owner approval)
router.patch('/:id/approve', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const { userId } = req.body;
    await pool.query(
      "UPDATE purchase_orders SET status = 'APPROVED', approved_by = ? WHERE id = ?",
      [userId || 1, req.params.id]
    );
    await logAudit(userId || 1, 'APPROVE_PO', 'Purchase Order', `Menyetujui PO #${req.params.id}`);
    res.json({ message: 'PO telah disetujui dan siap dikirim ke supplier' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/po/:id/receive (Goods arrival - Update stock & record expense)
router.patch('/:id/receive', requireAuth, requireRole('OWNER'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const poId = req.params.id;
    const { userId } = req.body;

    const [poRows] = await connection.query(
      'SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?',
      [poId]
    );

    if (poRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'PO tidak ditemukan' });
    }

    const po = poRows[0];
    const [items] = await connection.query('SELECT * FROM purchase_order_items WHERE po_id = ?', [poId]);

    // 1. Update stock and stock mutation
    for (const it of items) {
      const [ing] = await connection.query('SELECT current_stock, name FROM ingredients WHERE id = ?', [it.ingredient_id]);
      const prevStock = parseFloat(ing[0].current_stock);
      const newStock = prevStock + parseFloat(it.qty);

      await connection.query(
        'UPDATE ingredients SET current_stock = ?, last_buy_price = ? WHERE id = ?',
        [newStock, it.unit_price, it.ingredient_id]
      );

      await connection.query(
        `INSERT INTO stock_mutations (ingredient_id, mutation_type, amount, previous_stock, resulting_stock, notes, ref_id)
         VALUES (?, 'IN_PO', ?, ?, ?, ?, ?)`,
        [
          it.ingredient_id, it.qty, prevStock, newStock,
          `Penerimaan barang PO ${po.po_number} dari ${po.supplier_name}`,
          po.po_number
        ]
      );
    }

    // 2. Mark PO as RECEIVED
    await connection.query(
      "UPDATE purchase_orders SET status = 'RECEIVED', received_date = CURDATE() WHERE id = ?",
      [poId]
    );

    // 3. Record in Expenses (Finance module automatic linkage)
    await connection.query(
      `INSERT INTO expenses (expense_date, category, amount, description, user_id)
       VALUES (CURDATE(), 'Bahan Baku', ?, ?, ?)`,
      [po.total_cost, `Pembayaran ${po.po_number} ke ${po.supplier_name}`, userId || 1]
    );

    // 4. Create Notification
    await connection.query(
      `INSERT INTO notifications (type, title, message, severity)
       VALUES ('PO_MASUK', 'Barang PO Tiba!', ?, 'INFO')`,
      [`Barang dari PO ${po.po_number} telah diterima. Stok bahan diperbarui dan tercatat di pengeluaran.`]
    );

    await connection.commit();
    await logAudit(userId || 1, 'TERIMA_BARANG_PO', 'Purchase Order', `Konfirmasi barang tiba untuk PO ${po.po_number}`);

    res.json({ message: 'Barang berhasil diterima, stok bertambah, dan biaya tercatat di keuangan' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
