/**
 * cleanupStrayMenus.js
 * ---------------------------------------------------------
 * JALANKAN INI SETELAH fixMenuCatalogAndRecipes.js
 *
 * MASALAH:
 * fixMenuCatalogAndRecipes.js mencocokkan menu berdasarkan image_url yang
 * PERSIS sama dengan salah satu dari 16 foto resmi. Kalau ada baris menu
 * lama yang namanya sudah diedit manual (mis. "Bebek Goreng Lengkuas",
 * "Bebek Bakar Madu Spesial", "Ikan Nila Goreng Renyah") TAPI foto/kategori
 * lamanya berbeda dari canonical, baris itu tidak ikut dirapikan dan masih
 * membawa data lama yang salah (kategori "Ikan"/"Minuman" ngawur, resep
 * masih nyantol ke Es Jeruk, dsb).
 *
 * SCRIPT INI:
 * 1. Mengambil ulang 16 menu resmi (yang sudah benar, hasil dari
 *    fixMenuCatalogAndRecipes.js) sebagai daftar acuan.
 * 2. Mencari semua menu LAIN yang namanya "mirip" salah satu dari 16 nama
 *    resmi tsb (mengandung kata-kata inti yang sama, mis. "Bebek Goreng
 *    Lengkuas" dianggap mirip "Bebek Goreng").
 * 3. Untuk tiap kecocokan: pindahkan riwayat order_items ke menu resmi,
 *    lalu HAPUS baris siluman tsb (recipes/recipe_ingredients ikut terhapus
 *    otomatis lewat ON DELETE CASCADE bila constraint mengizinkan, kalau
 *    tidak akan dihapus manual di script ini juga).
 * 4. Sisanya (yang tidak ada kecocokan nama sama sekali) HANYA dilaporkan,
 *    TIDAK dihapus otomatis — supaya tidak salah hapus menu yang memang
 *    sengaja ditambahkan manual oleh Anda.
 *
 * AMAN dijalankan berkali-kali (idempotent).
 *
 * CARA MENJALANKAN (dari folder backend/):
 *   node src/config/cleanupStrayMenus.js
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

// Harus sama persis dengan daftar image di fixMenuCatalogAndRecipes.js
const CANONICAL_IMAGES = [
  'ayam_bakar_madu.jpg', 'ayam_goreng.jpg', 'ayam_negeri_bakar_madu.jpg',
  'ayam_negeri_goreng.jpg', 'ayam_pejantan_bakar_madu.jpg', 'ayam_pejantan_goreng.jpg',
  'bebek_bakar.jpg', 'bebek_goreng.jpg', 'ikan_lele_bakar.jpg', 'ikan_lele_goreng.jpg',
  'ikan_nila_bakar.jpg', 'ikan_nila_goreng.jpg', 'nasi.jpg', 'es_teh_manis.jpg',
  'es_teh_tawar.jpg', 'es_jeruk.jpg',
];

// Kata kunci inti dari tiap nama resmi, dipakai untuk mendeteksi baris
// duplikat yang namanya "diperpanjang" (mis. + "Lengkuas", "Spesial", "Renyah").
// Urutan penting: yang lebih spesifik/panjang taruh duluan supaya tidak
// salah cocok (mis. "Ayam Negeri Bakar Madu" harus dicek sebelum "Ayam Bakar Madu").
const NAME_KEYWORDS_IN_ORDER = [
  'Ayam Negeri Bakar Madu',
  'Ayam Negeri Goreng',
  'Ayam Pejantan Bakar Madu',
  'Ayam Pejantan Goreng',
  'Ayam Bakar Madu',
  'Ayam Goreng',
  'Bebek Bakar',
  'Bebek Goreng',
  'Ikan Lele Bakar',
  'Ikan Lele Goreng',
  'Ikan Nila Bakar',
  'Ikan Nila Goreng',
  'Es Teh Manis',
  'Es Teh Tawar',
  'Es Jeruk',
  'Nasi',
];

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findCanonicalMatch(strayName) {
  const norm = normalize(strayName);
  for (const keyword of NAME_KEYWORDS_IN_ORDER) {
    const kwNorm = normalize(keyword);
    // Semua kata kunci harus muncul di nama siluman, sebagai kecocokan "mengandung"
    const kwWords = kwNorm.split(' ');
    const allWordsPresent = kwWords.every((w) => norm.includes(w));
    if (allWordsPresent) return keyword;
  }
  return null;
}

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Terhubung ke database', DB_CONFIG.database);

  try {
    // 1. Ambil menu resmi (keeper) yang sudah benar
    const canonicalImagePaths = CANONICAL_IMAGES.map((f) => `/images/${f}`);
    const placeholders = canonicalImagePaths.map(() => '?').join(',');
    const [keepers] = await conn.query(
      `SELECT id, name, image_url FROM menus WHERE image_url IN (${placeholders})`,
      canonicalImagePaths
    );

    const keeperIdByName = {};
    for (const k of keepers) keeperIdByName[k.name] = k.id;

    console.log(`Ditemukan ${keepers.length} menu resmi sebagai acuan.`);

    // 2. Ambil semua menu YANG BUKAN menu resmi (calon siluman)
    const [strayMenus] = await conn.query(
      `SELECT id, code, name, category, image_url FROM menus WHERE image_url NOT IN (${placeholders}) OR image_url IS NULL`,
      canonicalImagePaths
    );

    console.log(`Ditemukan ${strayMenus.length} baris menu di luar daftar resmi. Mengecek satu per satu...\n`);

    let merged = 0;
    const unmatched = [];

    for (const stray of strayMenus) {
      const matchName = findCanonicalMatch(stray.name);
      const keeperId = matchName ? keeperIdByName[matchName] : null;

      if (!keeperId) {
        unmatched.push(stray);
        continue;
      }

      // Pindahkan riwayat transaksi ke menu resmi
      await conn.query('UPDATE order_items SET menu_id = ? WHERE menu_id = ?', [keeperId, stray.id]);

      // Hapus resep & recipe_ingredients milik baris siluman (jaga-jaga kalau tidak ada CASCADE)
      const [oldRecipes] = await conn.query('SELECT id FROM recipes WHERE menu_id = ?', [stray.id]);
      for (const r of oldRecipes) {
        await conn.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [r.id]);
        await conn.query('DELETE FROM sop_checklists WHERE recipe_id = ?', [r.id]);
      }
      await conn.query('DELETE FROM recipes WHERE menu_id = ?', [stray.id]);

      // Hapus baris menu siluman-nya
      await conn.query('DELETE FROM menus WHERE id = ?', [stray.id]);

      merged++;
      console.log(`OK - "${stray.name}" (id ${stray.id}) digabung & dihapus -> jadi "${matchName}" (id ${keeperId}).`);
    }

    console.log(`\nSelesai. ${merged} baris siluman berhasil digabung ke menu resmi.`);

    if (unmatched.length > 0) {
      console.log(`\nPerhatian: ${unmatched.length} baris TIDAK dihapus karena namanya tidak mirip menu resmi manapun (cek manual, mungkin memang menu tambahan yang sengaja dibuat):`);
      for (const m of unmatched) {
        console.log(`  - [id ${m.id}] "${m.name}" | kategori: ${m.category} | foto: ${m.image_url}`);
      }
    }
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('Gagal membersihkan menu siluman:', err);
  process.exit(1);
});
