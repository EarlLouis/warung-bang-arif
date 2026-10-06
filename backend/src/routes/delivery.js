const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAudit, requireAuth, requireRole } = require('./auth');

const PLATFORMS = [
  { key: 'GOFOOD', name: 'GoFood', fee: 20 },
  { key: 'GRABFOOD', name: 'GrabFood', fee: 20 },
  { key: 'SHOPEEFOOD', name: 'ShopeeFood', fee: 20 }
];

router.get('/', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT order_type AS platform, COUNT(*) orders, COALESCE(SUM(total_amount),0) gross,
             COALESCE(SUM(platform_fee),0) fee, COALESCE(SUM(total_amount-platform_fee),0) net
      FROM orders WHERE status <> 'CANCELLED' AND order_type IN ('GOFOOD','GRABFOOD','SHOPEEFOOD')
      GROUP BY order_type`);
    const map = Object.fromEntries(rows.map(r => [r.platform, r]));
    const [connections] = await pool.query('SELECT platform, connected FROM delivery_platforms');
    const conn = Object.fromEntries(connections.map(r => [r.platform, !!r.connected]));
    res.json(PLATFORMS.map(p => ({ ...p, connected: !!conn[p.key], ...(map[p.key] || {}) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/orders', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.id,o.invoice_number,o.created_at,o.order_type,o.customer_name,o.total_amount,o.platform_fee,o.status
      FROM orders o WHERE o.order_type IN ('GOFOOD','GRABFOOD','SHOPEEFOOD')
      ORDER BY o.created_at DESC LIMIT 100`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/menu-sync', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const [menus] = await pool.query(`SELECT id,code,name,category,price,is_active FROM menus ORDER BY name`);
    res.json(menus);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/connect', requireAuth, requireRole('OWNER'), async (req, res) => {
  const { platform, userId } = req.body;
  if (!PLATFORMS.some(p => p.key === platform)) return res.status(400).json({ error: 'Platform tidak dikenal' });
  await pool.query('UPDATE delivery_platforms SET connected=1 WHERE platform=?',[platform]);
  await logAudit(req.user.id, 'HUBUNGKAN_PLATFORM', 'Delivery Integration', `Menghubungkan ${platform} (mode siap integrasi/API)`);
  res.json({ message: `${platform} ditandai siap integrasi. Pendaftaran merchant tetap dilakukan di aplikasi/portal resmi platform.` });
});

router.post('/sync-menu', requireAuth, requireRole('OWNER'), async (req, res) => {
  const { platform, userId } = req.body;
  await logAudit(req.user.id, 'SYNC_MENU_DELIVERY', 'Delivery Integration', `Sinkronisasi menu/harga ${platform || 'semua platform'} diminta.`);
  res.json({ message: 'Sinkronisasi menu/harga dicatat. Untuk sinkronisasi live diperlukan kredensial/API resmi merchant.' });
});

router.post('/sync-stock', requireAuth, requireRole('OWNER'), async (req, res) => {
  const { platform, userId } = req.body;
  const [low] = await pool.query(`SELECT code,name,current_stock,min_threshold FROM ingredients WHERE is_active=1 AND current_stock<=min_threshold ORDER BY name`);
  await logAudit(req.user.id, 'SYNC_STOK_DELIVERY', 'Delivery Integration', `Sinkronisasi status stok ${platform || 'semua platform'} diminta.`);
  res.json({ message: 'Status stok berhasil disiapkan untuk sinkronisasi.', lowStock: low });
});

module.exports = router;
