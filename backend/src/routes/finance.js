const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAudit } = require('./auth');

// GET /api/finance/pl-summary (Profit & Loss / Laba Rugi)
router.get('/pl-summary', async (req, res) => {
  try {
    const { period = 'daily' } = req.query; // daily, weekly, monthly

    let dateCondition = 'DATE(o.created_at) = CURDATE()';
    let expenseCondition = 'DATE(expense_date) = CURDATE()';

    if (period === 'weekly') {
      dateCondition = 'o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      expenseCondition = 'expense_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'monthly') {
      dateCondition = 'MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())';
      expenseCondition = 'MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE())';
    }

    // 1. Total Revenue from POS
    const [revRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as gross_revenue,
        COALESCE(SUM(platform_fee), 0) as total_platform_fees,
        COALESCE(SUM(total_amount - platform_fee), 0) as net_revenue,
        COUNT(id) as total_transactions
      FROM orders o
      WHERE status != 'CANCELLED' AND ${dateCondition}
    `);

    // 2. Calculate Realized HPP (COGS) based on items sold * their recipe ingredients * buy price
    const [hppRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(oi.qty * ri.amount_required * i.last_buy_price), 0) as total_hpp
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN recipes r ON oi.menu_id = r.menu_id AND r.is_active = TRUE
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE o.status != 'CANCELLED' AND ${dateCondition}
    `);

    // 3. Operational Expenses
    const [expRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses,
        category,
        SUM(amount) as category_amount
      FROM expenses
      WHERE ${expenseCondition}
      GROUP BY category
    `);

    const totalExpenses = expRows.reduce((sum, item) => sum + parseFloat(item.category_amount || 0), 0);
    const grossRevenue = parseFloat(revRows[0].gross_revenue || 0);
    const platformFees = parseFloat(revRows[0].total_platform_fees || 0);
    const netRevenue = parseFloat(revRows[0].net_revenue || 0);
    const totalHpp = parseFloat(hppRows[0].total_hpp || 0);
    const grossProfit = netRevenue - totalHpp;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      period,
      revenue: {
        gross: grossRevenue,
        platformFees,
        net: netRevenue,
        transactionCount: revRows[0].total_transactions
      },
      cogs: {
        totalHpp,
        grossProfit,
        grossMarginPercent: netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(1) : 0
      },
      expenses: {
        total: totalExpenses,
        byCategory: expRows
      },
      netProfit,
      netMarginPercent: netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(1) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/finance/hpp-per-menu
router.get('/hpp-per-menu', async (req, res) => {
  try {
    const [menus] = await pool.query(`
      SELECT m.id, m.code, m.name, m.category, m.sell_price, m.online_price, r.id as recipe_id, r.version as recipe_version
      FROM menus m
      LEFT JOIN recipes r ON m.id = r.menu_id AND r.is_active = TRUE
      ORDER BY m.id ASC
    `);

    for (let m of menus) {
      if (m.recipe_id) {
        const [ingList] = await pool.query(`
          SELECT ri.amount_required, i.name, i.unit, i.last_buy_price,
                 (ri.amount_required * i.last_buy_price) as item_cost
          FROM recipe_ingredients ri
          JOIN ingredients i ON ri.ingredient_id = i.id
          WHERE ri.recipe_id = ?
        `, [m.recipe_id]);

        const hpp = ingList.reduce((sum, item) => sum + parseFloat(item.item_cost), 0);
        m.ingredients = ingList;
        m.hpp = hpp;
        m.gross_margin = parseFloat(m.sell_price) - hpp;
        m.margin_percentage = m.sell_price > 0 ? ((m.gross_margin / parseFloat(m.sell_price)) * 100).toFixed(1) : 0;
      } else {
        m.ingredients = [];
        m.hpp = 0;
        m.gross_margin = parseFloat(m.sell_price);
        m.margin_percentage = 100;
      }
    }

    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/finance/shift-reconciliation
router.get('/shift-reconciliation', async (req, res) => {
  try {
    const [shifts] = await pool.query(`
      SELECT us.*, u.name as cashier_name, s.name as shift_name, s.start_time, s.end_time,
             COALESCE(SUM(CASE WHEN p.payment_method = 'CASH' THEN (p.amount_paid - p.change_amount) ELSE 0 END), 0) as recorded_cash_sales,
             COALESCE(SUM(CASE WHEN p.payment_method = 'QRIS' THEN p.amount_paid ELSE 0 END), 0) as recorded_qris_sales,
             COALESCE(SUM(CASE WHEN p.payment_method = 'TRANSFER' THEN p.amount_paid ELSE 0 END), 0) as recorded_transfer_sales
      FROM user_shifts us
      JOIN users u ON us.user_id = u.id
      JOIN shifts s ON us.shift_id = s.id
      LEFT JOIN orders o ON us.id = o.user_shift_id AND o.status != 'CANCELLED'
      LEFT JOIN payments p ON o.id = p.order_id AND p.status = 'PAID'
      GROUP BY us.id
      ORDER BY us.id DESC LIMIT 30
    `);

    res.json(shifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/finance/expenses
router.get('/expenses', async (req, res) => {
  try {
    const [expenses] = await pool.query(`
      SELECT e.*, u.name as recorded_by
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.expense_date DESC, e.id DESC
    `);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/finance/expenses
router.post('/expenses', async (req, res) => {
  try {
    const { expenseDate, category, amount, description, userId } = req.body;
    const [resExp] = await pool.query(
      'INSERT INTO expenses (expense_date, category, amount, description, user_id) VALUES (?, ?, ?, ?, ?)',
      [expenseDate || new Date().toISOString().slice(0, 10), category, amount, description, userId || 1]
    );

    await logAudit(userId || 1, 'CATAT_PENGELUARAN', 'Keuangan', `Mencatat beban ${category}: ${description} senilai Rp ${amount}`);

    res.status(201).json({ message: 'Pengeluaran berhasil dicatat', expenseId: resExp.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
