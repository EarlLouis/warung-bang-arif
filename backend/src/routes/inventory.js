const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAudit, requireAuth, requireRole } = require('./auth');

// GET /api/inventory/ingredients
router.get('/ingredients', async (req, res) => {
  try {
    const [ingredients] = await pool.query(`
      SELECT i.*, 
             (i.current_stock <= i.min_threshold) as is_low_stock,
             (i.current_stock * i.last_buy_price) as total_asset_value
      FROM ingredients i
      WHERE i.is_active = 1
      ORDER BY is_low_stock DESC, i.name ASC
    `);
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/ingredients - Create ingredient (OWNER only)
router.post('/ingredients', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const { code, name, category, unit, currentStock = 0, minThreshold = 10, lastBuyPrice = 0 } = req.body;
    const allowedCategories = [
      'Daging & Protein',
      'Bumbu & Rempah',
      'Minyak & Saus',
      'Bahan Pokok',
      'Kemasan & Bahan Bakar'
    ];

    if (!code?.trim() || !name?.trim() || !category || !unit?.trim()) {
      return res.status(400).json({ error: 'Kode, nama, kategori, dan satuan wajib diisi' });
    }
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Kategori bahan baku tidak valid' });
    }

    const stock = Number(currentStock);
    const threshold = Number(minThreshold);
    const price = Number(lastBuyPrice);
    if (![stock, threshold, price].every(Number.isFinite) || stock < 0 || threshold < 0 || price < 0) {
      return res.status(400).json({ error: 'Stok, batas minimum, dan harga beli harus berupa angka >= 0' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const [existingCodeRows] = await pool.query(
      'SELECT id, is_active FROM ingredients WHERE code = ?',
      [normalizedCode]
    );

    let ingredientId;
    if (existingCodeRows.length && Number(existingCodeRows[0].is_active) === 0) {
      ingredientId = existingCodeRows[0].id;
      await pool.query(
        `UPDATE ingredients
         SET name = ?, category = ?, unit = ?, current_stock = ?, min_threshold = ?, last_buy_price = ?, is_active = 1
         WHERE id = ?`,
        [name.trim(), category, unit.trim(), stock, threshold, price, ingredientId]
      );
      await logAudit(req.user.id, 'AKTIFKAN_BAHAN_BAKU', 'Inventori', `Mengaktifkan kembali bahan baku ${name.trim()} (${normalizedCode})`);
    } else {
      const [result] = await pool.query(
        `INSERT INTO ingredients (code, name, category, unit, current_stock, min_threshold, last_buy_price, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [normalizedCode, name.trim(), category, unit.trim(), stock, threshold, price]
      );
      ingredientId = result.insertId;
      await logAudit(req.user.id, 'TAMBAH_BAHAN_BAKU', 'Inventori', `Menambahkan bahan baku ${name.trim()} (${normalizedCode})`);
    }

    const [rows] = await pool.query(
      `SELECT i.*, (i.current_stock <= i.min_threshold) as is_low_stock,
              (i.current_stock * i.last_buy_price) as total_asset_value
       FROM ingredients i WHERE i.id = ?`,
      [ingredientId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Kode bahan baku sudah digunakan' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/ingredients/:id - Update ingredient (OWNER only)
router.put('/ingredients/:id', requireAuth, requireRole('OWNER'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID bahan baku tidak valid' });
    }

    const { code, name, category, unit, currentStock, minThreshold, lastBuyPrice } = req.body;
    const allowedCategories = [
      'Daging & Protein',
      'Bumbu & Rempah',
      'Minyak & Saus',
      'Bahan Pokok',
      'Kemasan & Bahan Bakar'
    ];

    if (!code?.trim() || !name?.trim() || !category || !unit?.trim()) {
      return res.status(400).json({ error: 'Kode, nama, kategori, dan satuan wajib diisi' });
    }
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Kategori bahan baku tidak valid' });
    }

    const stock = Number(currentStock);
    const threshold = Number(minThreshold);
    const price = Number(lastBuyPrice);
    if (![stock, threshold, price].every(Number.isFinite) || stock < 0 || threshold < 0 || price < 0) {
      return res.status(400).json({ error: 'Stok, batas minimum, dan harga beli harus berupa angka >= 0' });
    }

    const [existingRows] = await connection.query('SELECT * FROM ingredients WHERE id = ? AND is_active = 1', [id]);
    if (!existingRows.length) {
      return res.status(404).json({ error: 'Bahan baku tidak ditemukan' });
    }

    const existing = existingRows[0];
    await connection.beginTransaction();
    await connection.query(
      `UPDATE ingredients
       SET code = ?, name = ?, category = ?, unit = ?, current_stock = ?, min_threshold = ?, last_buy_price = ?
       WHERE id = ?`,
      [code.trim().toUpperCase(), name.trim(), category, unit.trim(), stock, threshold, price, id]
    );

    const stockDiff = stock - Number(existing.current_stock);
    if (Math.abs(stockDiff) > 0.000001) {
      await connection.query(
        `INSERT INTO stock_mutations
         (ingredient_id, mutation_type, amount, previous_stock, resulting_stock, notes, ref_id)
         VALUES (?, 'ADJUSTMENT_OPNAME', ?, ?, ?, ?, ?)`,
        [
          id,
          Math.abs(stockDiff),
          Number(existing.current_stock),
          stock,
          `Perubahan stok manual melalui CRUD oleh Owner (${stockDiff > 0 ? '+' : ''}${stockDiff})`,
          `CRUD-${id}-${Date.now()}`
        ]
      );
    }

    await connection.commit();
    await logAudit(req.user.id, 'UBAH_BAHAN_BAKU', 'Inventori', `Mengubah bahan baku ${existing.name} (${existing.code})` + (Math.abs(stockDiff) > 0.000001 ? `; stok ${existing.current_stock} -> ${stock}` : ''));

    const [rows] = await pool.query(
      `SELECT i.*, (i.current_stock <= i.min_threshold) as is_low_stock,
              (i.current_stock * i.last_buy_price) as total_asset_value
       FROM ingredients i WHERE i.id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Kode bahan baku sudah digunakan' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/inventory/ingredients/:id - Delete ingredient permanently (OWNER only)
// Penghapusan ini memang HARD DELETE sesuai permintaan Owner.
// Data relasi yang memiliki foreign key ke bahan baku ikut dihapus agar tidak
// terkena constraint FK. Audit log tidak ikut dihapus.
router.delete('/ingredients/:id', requireAuth, requireRole('OWNER'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID bahan baku tidak valid' });
    }

    const [rows] = await connection.query(
      'SELECT id, code, name FROM ingredients WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Bahan baku tidak ditemukan' });
    }

    const ingredient = rows[0];
    await connection.beginTransaction();

    // Hapus seluruh data turunan yang terkait langsung dengan ingredient.
    // FK pada database juga ON DELETE CASCADE, tetapi penghapusan eksplisit
    // membuat endpoint tetap aman pada database lama yang constraint-nya berbeda.
    await connection.query('DELETE FROM recipe_ingredients WHERE ingredient_id = ?', [id]);
    await connection.query('DELETE FROM stock_mutations WHERE ingredient_id = ?', [id]);
    await connection.query('DELETE FROM stock_opname_items WHERE ingredient_id = ?', [id]);
    await connection.query('DELETE FROM supplier_prices WHERE ingredient_id = ?', [id]);
    await connection.query('DELETE FROM purchase_order_items WHERE ingredient_id = ?', [id]);
    await connection.query('DELETE FROM ingredients WHERE id = ?', [id]);

    await connection.commit();

    await logAudit(
      req.user.id,
      'HAPUS_BAHAN_BAKU',
      'Inventori',
      `Menghapus permanen bahan baku ${ingredient.name} (${ingredient.code}) beserta data relasi inventori terkait.`
    );

    return res.json({
      message: 'Bahan baku berhasil dihapus permanen.',
      mode: 'DELETE'
    });
  } catch (err) {
    try { await connection.rollback(); } catch (_) {}
    console.error('[Inventory DELETE] Gagal menghapus bahan baku:', err);
    res.status(500).json({ error: 'Bahan baku gagal dihapus: ' + err.message });
  } finally {
    connection.release();
  }
});

// GET /api/inventory/mutations
router.get('/mutations', async (req, res) => {
  try {
    const { ingredientId, limit = 50 } = req.query;
    let sql = `
      SELECT sm.*, i.name as ingredient_name, i.unit, i.code as ingredient_code
      FROM stock_mutations sm
      JOIN ingredients i ON sm.ingredient_id = i.id
    `;
    const params = [];

    if (ingredientId) {
      sql += ' WHERE sm.ingredient_id = ?';
      params.push(ingredientId);
    }

    sql += ' ORDER BY sm.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [mutations] = await pool.query(sql, params);
    res.json(mutations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/opname (Stock Opname)
router.post('/opname', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { conductedBy, notes, items = [] } = req.body;

    const [opnameRes] = await connection.query(
      'INSERT INTO stock_opnames (opname_date, conducted_by, status, notes) VALUES (CURDATE(), ?, \'COMPLETED\', ?)',
      [conductedBy || 1, notes || 'Stok Opname Rutin']
    );

    const opnameId = opnameRes.insertId;

    for (const item of items) {
      const [ingRows] = await connection.query('SELECT current_stock, name FROM ingredients WHERE id = ?', [item.ingredientId]);
      if (ingRows.length > 0) {
        const systemStock = parseFloat(ingRows[0].current_stock);
        const physicalStock = parseFloat(item.physicalStock);
        const diff = physicalStock - systemStock;

        await connection.query(
          `INSERT INTO stock_opname_items (opname_id, ingredient_id, system_stock, physical_stock, difference, reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [opnameId, item.ingredientId, systemStock, physicalStock, diff, item.reason || 'Pencocokan fisik']
        );

        if (diff !== 0) {
          // Adjust stock to physical stock
          await connection.query(
            'UPDATE ingredients SET current_stock = ? WHERE id = ?',
            [physicalStock, item.ingredientId]
          );

          // Record mutation
          await connection.query(
            `INSERT INTO stock_mutations (ingredient_id, mutation_type, amount, previous_stock, resulting_stock, notes, ref_id)
             VALUES (?, 'ADJUSTMENT_OPNAME', ?, ?, ?, ?, ?)`,
            [
              item.ingredientId, Math.abs(diff), systemStock, physicalStock,
              `Penyesuaian Opname #${opnameId} (${diff > 0 ? '+' : ''}${diff}): ${item.reason || '-'}`,
              `OPNAME-${opnameId}`
            ]
          );
        }
      }
    }

    await connection.commit();
    await logAudit(conductedBy, 'STOK_OPNAME', 'Inventori', `Melakukan stok opname #${opnameId} untuk ${items.length} bahan baku`);

    res.status(201).json({ message: 'Stok Opname berhasil disimpan dan stok disesuaikan', opnameId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// GET /api/inventory/forecast (Daily requirement estimation based on sales)
router.get('/forecast', async (req, res) => {
  try {
    // Estimate daily ingredient usage based on average orders per day over the last 7 days
    const [usageRows] = await pool.query(`
      SELECT 
        i.id as ingredient_id,
        i.code,
        i.name,
        i.unit,
        i.current_stock,
        i.min_threshold,
        COALESCE(SUM(ri.amount_required * oi.qty) / 7, 0) as avg_daily_usage,
        CASE 
          WHEN COALESCE(SUM(ri.amount_required * oi.qty) / 7, 0) > 0 
          THEN ROUND(i.current_stock / (SUM(ri.amount_required * oi.qty) / 7), 1)
          ELSE 99.0
        END as days_stock_remaining
      FROM ingredients i
      LEFT JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
      LEFT JOIN recipes r ON ri.recipe_id = r.id AND r.is_active = TRUE
      LEFT JOIN order_items oi ON r.menu_id = oi.menu_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY i.id, i.code, i.name, i.unit, i.current_stock, i.min_threshold
      ORDER BY days_stock_remaining ASC, i.name ASC
    `);

    res.json(usageRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
