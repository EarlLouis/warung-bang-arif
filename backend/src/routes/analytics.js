const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('./auth');

// GET /api/analytics/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Periode untuk grafik Jam ramai & Menu terlaris: 7d | 30d | 1y | all
    const RANGE_DAYS = { '7d': 7, '30d': 30, '1y': 365 };
    const range = Object.prototype.hasOwnProperty.call(RANGE_DAYS, req.query.range) ? req.query.range : 'all';
    const days = RANGE_DAYS[range];
    const rangeSql = days ? `AND created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)` : '';
    const rangeSqlO = days ? `AND o.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)` : '';

    // 1. Overall stats
    const [todayStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as today_omzet,
        COUNT(id) as today_orders
      FROM orders
      WHERE DATE(created_at) = CURDATE() AND status != 'CANCELLED'
    `);

    const [monthStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as month_omzet,
        COUNT(id) as month_orders
      FROM orders
      WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) AND status != 'CANCELLED'
    `);

    // 2. Peak Hours Analysis (11:00 to 00:00)
    const [hourlyRows] = await pool.query(`
      SELECT 
        HOUR(created_at) as hour,
        COUNT(id) as order_count,
        COALESCE(SUM(total_amount), 0) as total_omzet
      FROM orders
      WHERE status != 'CANCELLED' ${rangeSql}
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `);

    // Map all hours 11 through 23
    const peakHours = [];
    for (let h = 11; h <= 23; h++) {
      const match = hourlyRows.find(r => r.hour === h);
      peakHours.push({
        hourLabel: `${h < 10 ? '0' : ''}${h}:00`,
        hour: h,
        orderCount: match ? match.order_count : 0,
        totalOmzet: match ? parseFloat(match.total_omzet) : 0
      });
    }

    // 3. Top selling menus
    const [topMenus] = await pool.query(`
      SELECT 
        m.id, m.name, m.code, m.category,
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty ELSE 0 END), 0) as total_qty_sold,
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.subtotal ELSE 0 END), 0) as total_revenue
      FROM menus m
      LEFT JOIN order_items oi ON m.id = oi.menu_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'CANCELLED' ${rangeSqlO}
      GROUP BY m.id
      ORDER BY total_qty_sold DESC
    `);

    // 4. Channel performance
    const [channelStats] = await pool.query(`
      SELECT 
        order_type,
        COUNT(id) as total_orders,
        COALESCE(SUM(total_amount), 0) as gross_amount,
        COALESCE(SUM(platform_fee), 0) as platform_fees,
        COALESCE(SUM(total_amount - platform_fee), 0) as net_amount
      FROM orders
      WHERE status != 'CANCELLED'
      GROUP BY order_type
    `);

    // 5. Low stock count
    const [lowStockCount] = await pool.query(`
      SELECT COUNT(*) as count FROM ingredients WHERE is_active = 1 AND current_stock <= min_threshold
    `);

    // 6. Recent Feedback count
    const [feedbackCount] = await pool.query(`
      SELECT COUNT(*) as count FROM customer_feedbacks WHERE status = 'BARU'
    `);

    res.json({
      todayOmzet: parseFloat(todayStats[0].today_omzet),
      todayOrders: todayStats[0].today_orders,
      monthOmzet: parseFloat(monthStats[0].month_omzet),
      monthOrders: monthStats[0].month_orders,
      range,
      peakHours,
      topMenus: topMenus.filter(m => Number(m.total_qty_sold) > 0).slice(0, 5),
      lowMenus: topMenus.slice(-3).reverse(),
      channelStats,
      lowStockCount: lowStockCount[0].count,
      unresolvedFeedbacks: feedbackCount[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/export/csv
router.get('/export/csv', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.invoice_number,
        o.created_at,
        o.order_type,
        o.customer_name,
        o.table_number,
        u.name as cashier_name,
        p.payment_method,
        o.total_items,
        o.subtotal,
        o.discount,
        o.platform_fee,
        o.total_amount,
        o.status
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN payments p ON o.id = p.order_id
      ORDER BY o.created_at DESC
    `);

    let csv = 'Invoice,Tanggal & Jam,Tipe Kanal,Pelanggan,Meja,Kasir,Metode Bayar,Qty,Subtotal,Diskon,Komisi Platform,Total Bayar,Status\n';
    rows.forEach(r => {
      csv += `"${r.invoice_number}","${r.created_at}","${r.order_type}","${r.customer_name}","${r.table_number}","${r.cashier_name || '-'}","${r.payment_method || '-'}","${r.total_items}","${r.subtotal}","${r.discount}","${r.platform_fee}","${r.total_amount}","${r.status}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('Laporan_Penjualan_Ayam_Bang_Arif.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// GET /api/analytics/export/pdf - printable PDF-ready report. Browser print can save as PDF.
router.get('/export/pdf', requireAuth, requireRole('OWNER'), async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT o.invoice_number,o.created_at,o.order_type,o.customer_name,o.total_amount,o.platform_fee,o.status FROM orders o ORDER BY o.created_at DESC LIMIT 200`);
    const omzet = rows.filter(r=>r.status!=='CANCELLED').reduce((a,r)=>a+Number(r.total_amount||0),0);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Laporan Penjualan Bang Arif</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{margin:0 0 6px}p{color:#555}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}th,td{border:1px solid #ddd;padding:7px;text-align:left}th{background:#f3f4f6}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Cetak / Simpan sebagai PDF</button><h1>Laporan Penjualan - Ayam Goreng & Bakar Madu Bang Arif</h1><p>Dicetak: ${new Date().toLocaleString('id-ID')} | Total omzet data: Rp ${omzet.toLocaleString('id-ID')}</p><table><thead><tr><th>Invoice</th><th>Tanggal</th><th>Channel</th><th>Pelanggan</th><th>Total</th><th>Komisi</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.invoice_number}</td><td>${new Date(r.created_at).toLocaleString('id-ID')}</td><td>${r.order_type}</td><td>${r.customer_name||'-'}</td><td>Rp ${Number(r.total_amount||0).toLocaleString('id-ID')}</td><td>Rp ${Number(r.platform_fee||0).toLocaleString('id-ID')}</td><td>${r.status}</td></tr>`).join('')}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`;
    res.type('html').send(html);
  } catch(err){res.status(500).json({error:err.message})}
});

module.exports = router;
