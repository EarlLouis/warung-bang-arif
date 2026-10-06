/**
 * backfillPlatingPhotos.js
 * ---------------------------------------------------------
 * Mengisi kolom recipes.plating_photo_url untuk resep yang SEDANG AKTIF,
 * berdasarkan nama menunya (cocok dengan salah satu dari 17 menu resmi).
 * Ini TIDAK membuat versi resep baru (tidak seperti reconcileAllMenus.js),
 * jadi aman dijalankan kapan saja tanpa menambah sampah histori resep.
 *
 * Dipakai sekali untuk menambal masalah: FoodThumbnail di frontend
 * membaca `plating_photo_url` dari tabel `recipes`, BUKAN `image_url` dari
 * tabel `menus`. Kalau kosong, tampilan fallback ke ikon gradient generik.
 *
 * CARA MENJALANKAN (dari folder backend/):
 *   node src/config/backfillPlatingPhotos.js
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

// name (harus cocok PERSIS dengan menus.name hasil reconcileAllMenus.js) -> file foto
const PHOTO_BY_MENU_NAME = {
  'Ayam Bakar Madu': 'ayam_bakar_madu.jpg',
  'Ayam Goreng': 'ayam_goreng.jpg',
  'Ayam Negeri Bakar Madu': 'ayam_negeri_bakar_madu.jpg',
  'Ayam Negeri Goreng': 'ayam_negeri_goreng.jpg',
  'Ayam Pejantan Bakar Madu': 'ayam_pejantan_bakar_madu.jpg',
  'Ayam Pejantan Goreng': 'ayam_pejantan_goreng.jpg',
  'Bebek Bakar': 'bebek_bakar.jpg',
  'Bebek Goreng': 'bebek_goreng.jpg',
  'Ikan Lele Bakar': 'ikan_lele_bakar.jpg',
  'Ikan Lele Goreng': 'ikan_lele_goreng.jpg',
  'Ikan Nila Bakar': 'ikan_nila_bakar.jpg',
  'Ikan Nila Goreng': 'ikan_nila_goreng.jpg',
  'Nasi': 'nasi.jpg',
  'Es Teh Manis': 'es_teh_manis.jpg',
  'Es Teh Tawar': 'es_teh_tawar.jpg',
  'Es Jeruk': 'es_jeruk.jpg',
  'Teh Panas Manis': 'teh_panas_manis.jpg',
};

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Terhubung ke database', DB_CONFIG.database);

  try {
    let updated = 0;
    for (const [menuName, imageFile] of Object.entries(PHOTO_BY_MENU_NAME)) {
      const [menus] = await conn.query('SELECT id FROM menus WHERE name = ?', [menuName]);
      if (menus.length === 0) {
        console.warn(`! Menu "${menuName}" tidak ditemukan di tabel menus, dilewati.`);
        continue;
      }
      const menuId = menus[0].id;
      const [result] = await conn.query(
        'UPDATE recipes SET plating_photo_url = ? WHERE menu_id = ? AND is_active = TRUE',
        [`/images/${imageFile}`, menuId]
      );
      if (result.affectedRows > 0) {
        updated++;
        console.log(`OK - "${menuName}" -> /images/${imageFile}`);
      } else {
        console.warn(`! "${menuName}" (menu id ${menuId}) tidak punya resep aktif untuk ditambal.`);
      }
    }
    console.log(`\nSelesai. ${updated} resep aktif berhasil ditambal fotonya.`);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('Gagal menambal foto resep:', err);
  process.exit(1);
});
