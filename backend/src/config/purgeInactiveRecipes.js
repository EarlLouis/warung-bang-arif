/**
 * purgeInactiveRecipes.js
 * ---------------------------------------------------------
 * MASALAH: Setiap kali resep sebuah menu direvisi (baik lewat tombol
 * "Revisi/Buat Versi Baru Resep" di UI, maupun lewat script perbaikan
 * seperti reconcileAllMenus.js), versi resep LAMA tidak dihapus — cuma
 * ditandai is_active = FALSE. Ini bagus untuk audit trail, TAPI karena
 * proses perbaikan katalog kita jalankan berkali-kali, jumlah resep
 * nonaktif menumpuk banyak sekali dan bikin database gembung tidak perlu.
 *
 * SCRIPT INI: menghapus semua baris `recipes` (beserta recipe_ingredients
 * dan sop_checklists terkait) yang is_active = FALSE, HANYA menyisakan
 * 1 resep aktif per menu.
 *
 * PERHATIAN: ini menghapus histori versi resep lama secara permanen
 * (tidak bisa di-undo). Kalau Anda butuh riwayat revisi resep untuk
 * keperluan audit, JANGAN jalankan script ini.
 *
 * CARA MENJALANKAN (dari folder backend/):
 *   node src/config/purgeInactiveRecipes.js
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'Ayam_goreng_dan_bakar_bang_arif',
};

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Terhubung ke database', DB_CONFIG.database);

  try {
    const [inactive] = await conn.query('SELECT id, menu_id FROM recipes WHERE is_active = FALSE');
    console.log(`Ditemukan ${inactive.length} resep nonaktif (versi lama) yang akan dihapus...`);

    for (const r of inactive) {
      await conn.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [r.id]);
      await conn.query('DELETE FROM sop_checklists WHERE recipe_id = ?', [r.id]);
      await conn.query('DELETE FROM recipes WHERE id = ?', [r.id]);
    }

    const [remaining] = await conn.query('SELECT COUNT(*) as total FROM recipes WHERE is_active = TRUE');
    console.log(`Selesai. ${inactive.length} resep lama dihapus. Sisa ${remaining[0].total} resep aktif di database.`);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('Gagal membersihkan resep nonaktif:', err);
  process.exit(1);
});
