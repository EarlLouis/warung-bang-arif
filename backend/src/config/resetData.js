const mysql = require('mysql2/promise');

/**
 * Reset semua data TRANSAKSI/ANGKA ke kosong (nol), tanpa menghapus data
 * master seperti user (login), menu, resep, SOP, daftar bahan, dan supplier.
 *
 * Yang di-kosongkan:
 *   - Semua transaksi POS (orders, order_items, payments)
 *   - Semua mutasi & opname stok (stock_mutations, stock_opnames, stock_opname_items)
 *   - Semua Purchase Order (purchase_orders, purchase_order_items)
 *   - Semua pengeluaran (expenses)
 *   - Semua feedback pelanggan (customer_feedbacks)
 *   - Semua notifikasi (notifications)
 *   - Semua audit log (audit_logs)
 *   - Semua shift kasir yang tercatat (user_shifts) -> tidak ada shift aktif
 *   - Stok bahan (ingredients.current_stock) diset ke 0
 *
 * Yang TETAP ADA (supaya aplikasi masih bisa dipakai untuk testing):
 *   - users, shifts, ingredients (daftar), menus, recipes,
 *     recipe_ingredients, sop_checklists, suppliers, supplier_prices
 */
async function resetData() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'Ayam_goreng_dan_bakar_bang_arif',
    multipleStatements: true
  };

  console.log('Menghubungkan ke database...');
  const connection = await mysql.createConnection(config);

  try {
    console.log('Menonaktifkan foreign key checks sementara...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tablesToEmpty = [
      'payments',
      'order_items',
      'orders',
      'purchase_order_items',
      'purchase_orders',
      'stock_opname_items',
      'stock_opnames',
      'stock_mutations',
      'customer_feedbacks',
      'notifications',
      'audit_logs',
      'expenses',
      'user_shifts'
    ];

    for (const table of tablesToEmpty) {
      console.log(`Mengosongkan tabel: ${table}`);
      await connection.query(`TRUNCATE TABLE \`${table}\`;`);
    }

    console.log('Mereset stok semua bahan (ingredients) ke 0...');
    await connection.query('UPDATE ingredients SET current_stock = 0;');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\nSelesai! Semua data transaksi & angka sudah nol/kosong.');
    console.log('Data master (user, menu, resep, bahan, supplier) tetap ada supaya aplikasi masih bisa dipakai untuk testing.');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  resetData().catch(err => {
    console.error('Reset data gagal:', err);
    process.exit(1);
  });
}

module.exports = resetData;
