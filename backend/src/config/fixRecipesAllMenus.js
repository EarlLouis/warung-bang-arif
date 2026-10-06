/**
 * fixRecipesAllMenus.js
 * ---------------------------------------------------------
 * MASALAH: Setelah syncMenusExact.js menambahkan 16 menu "asli" sesuai
 * foto produk, sebagian besar menu (13 dari 16) tidak punya resep/BOM
 * (recipes + recipe_ingredients) yang terhubung. Akibatnya saat menu
 * tersebut dipesan lewat POS, stok bahan baku TIDAK berkurang sama
 * sekali (lihat pos.js: deduksi stok di-skip kalau recipes.length === 0).
 *
 * SCRIPT INI:
 * 1. Menambahkan 3 bahan baku yang belum ada di Inventori (Bebek, Ikan
 *    Lele, Ikan Nila) supaya bisa dilacak stoknya.
 * 2. Membuat/menimpa resep + recipe_ingredients untuk SEMUA 16 menu
 *    aktif (kode MN-01 s.d. MN-16), sehingga tiap kali menu tersebut
 *    dipesan, stok bahan bakunya otomatis berkurang.
 *
 * AMAN dijalankan berkali-kali (idempotent) — resep lama untuk menu
 * yang sama akan diganti bersih, bukan ditumpuk dobel.
 *
 * CARA MENJALANKAN (dari folder backend/):
 *   node src/config/fixRecipesAllMenus.js
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

// Bahan baku tambahan yang belum ada di tabel ingredients
const NEW_INGREDIENTS = [
  { code: 'ING-18', name: 'Daging Bebek Segar', category: 'Daging & Protein', unit: 'kg', current_stock: 15.00, min_threshold: 5.00, last_buy_price: 42000 },
  { code: 'ING-19', name: 'Ikan Lele Segar', category: 'Daging & Protein', unit: 'ekor', current_stock: 80.00, min_threshold: 20.00, last_buy_price: 4500 },
  { code: 'ING-20', name: 'Ikan Nila Segar', category: 'Daging & Protein', unit: 'ekor', current_stock: 60.00, min_threshold: 15.00, last_buy_price: 6000 },
];

// Definisi resep untuk tiap kode menu.
// ingredientCode -> jumlah bahan yang dipakai untuk 1 porsi
const RECIPE_DEFINITIONS = {
  'MN-01': { // Ayam Bakar Madu (resep lama sudah benar, tetap dipertahankan/disegarkan)
    marination: 120,
    instructions: 'Marinasi ayam 0.25kg dengan bumbu kuning min. 2 jam, bakar arang batok sambil dioles madu & kecap hingga karamelisasi.',
    taste: 'Gurih manis madu meresap, aroma bakar arang, include sambal & lalapan.',
    items: { 'ING-01': 0.250, 'ING-02': 20.000, 'ING-03': 30.000, 'ING-04': 15.000, 'ING-12': 0.200, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 },
  },
  'MN-02': { // Ayam Goreng
    marination: 45,
    instructions: 'Ungkep ayam 0.25kg dengan bumbu rempah 45 menit, goreng minyak panas 170°C hingga renyah keemasan.',
    taste: 'Gurih rempah renyah, include sambal & lalapan.',
    items: { 'ING-01': 0.250, 'ING-03': 30.000, 'ING-05': 100.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 },
  },
  'MN-03': { // Ayam Negeri Bakar Madu
    marination: 120,
    instructions: 'Marinasi ayam negeri 0.22kg dengan bumbu kuning, bakar arang sambil dioles madu & kecap.',
    taste: 'Empuk juicy gurih manis madu, include sambal & lalapan.',
    items: { 'ING-01': 0.220, 'ING-02': 18.000, 'ING-03': 28.000, 'ING-04': 12.000, 'ING-12': 0.180, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 },
  },
  'MN-04': { // Ayam Negeri Goreng
    marination: 45,
    instructions: 'Ungkep ayam negeri 0.22kg dengan bumbu rempah, goreng hingga renyah.',
    taste: 'Gurih renyah ringan, include sambal & lalapan.',
    items: { 'ING-01': 0.220, 'ING-03': 28.000, 'ING-05': 90.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 },
  },
  'MN-05': { // Ayam Pejantan Bakar Madu
    marination: 120,
    instructions: 'Marinasi ayam pejantan 0.28kg (serat padat) dengan bumbu kuning, bakar arang sambil dioles madu & kecap.',
    taste: 'Serat padat gurih seperti ayam kampung, manis madu, include sambal & lalapan.',
    items: { 'ING-01': 0.280, 'ING-02': 22.000, 'ING-03': 32.000, 'ING-04': 16.000, 'ING-12': 0.220, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 },
  },
  'MN-06': { // Ayam Pejantan Goreng
    marination: 45,
    instructions: 'Ungkep ayam pejantan 0.28kg dengan bumbu khas, goreng hingga garing empuk.',
    taste: 'Garing di luar empuk di dalam, include sambal & lalapan.',
    items: { 'ING-01': 0.280, 'ING-03': 32.000, 'ING-05': 110.000, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 },
  },
  'MN-07': { // Bebek Bakar
    marination: 150,
    instructions: 'Marinasi bebek 0.30kg dengan bumbu rempah, bakar arang sambil dioles madu agar empuk tidak amis.',
    taste: 'Empuk tidak amis tidak alot, gurih manis bakar, include sambal & lalapan.',
    items: { 'ING-18': 0.300, 'ING-02': 20.000, 'ING-03': 30.000, 'ING-04': 15.000, 'ING-12': 0.250, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 },
  },
  'MN-08': { // Bebek Goreng
    marination: 60,
    instructions: 'Ungkep bebek 0.30kg dengan bumbu rempah, goreng hingga renyah harum.',
    taste: 'Renyah harum berempah, include sambal & lalapan.',
    items: { 'ING-18': 0.300, 'ING-03': 30.000, 'ING-05': 120.000, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 },
  },
  'MN-09': { // Ikan Lele Bakar
    marination: 30,
    instructions: 'Lumuri lele segar dengan bumbu, bakar arang sambil dioles madu.',
    taste: 'Gurih legit harum arang, include sambal & lalapan.',
    items: { 'ING-19': 2, 'ING-02': 15.000, 'ING-03': 20.000, 'ING-04': 10.000, 'ING-12': 0.150, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 },
  },
  'MN-10': { // Ikan Lele Goreng
    marination: 20,
    instructions: 'Lumuri lele segar dengan bumbu, goreng kering hingga garing.',
    taste: 'Garing gurih kering, include sambal & lalapan.',
    items: { 'ING-19': 2, 'ING-03': 20.000, 'ING-05': 90.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 },
  },
  'MN-11': { // Ikan Nila Bakar
    marination: 30,
    instructions: 'Lumuri nila segar dengan bumbu, bakar arang sambil dioles madu.',
    taste: 'Daging tebal gurih manis bakar madu, include sambal & lalapan.',
    items: { 'ING-20': 1, 'ING-02': 18.000, 'ING-03': 25.000, 'ING-04': 12.000, 'ING-12': 0.180, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 },
  },
  'MN-12': { // Ikan Nila Goreng
    marination: 20,
    instructions: 'Lumuri nila segar dengan bumbu, goreng hingga renyah kriuk.',
    taste: 'Renyah kriuk hingga sirip, include sambal & lalapan.',
    items: { 'ING-20': 1, 'ING-03': 25.000, 'ING-05': 100.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 },
  },
  'MN-13': { // Nasi
    marination: 0,
    instructions: 'Kukus/liwet beras ramos hingga pulen hangat.',
    taste: 'Nasi putih pulen hangat.',
    items: { 'ING-06': 150.000 },
  },
  'MN-14': { // Es Teh Manis
    marination: 0,
    instructions: 'Seduh teh tubruk, tambah gula, sajikan dengan es batu.',
    taste: 'Manis segar wangi melati.',
    items: { 'ING-13': 5.000, 'ING-14': 20.000 },
  },
  'MN-15': { // Es Teh Tawar
    marination: 0,
    instructions: 'Seduh teh tubruk tanpa gula, sajikan dengan es batu.',
    taste: 'Tawar segar wangi melati.',
    items: { 'ING-13': 5.000 },
  },
  'MN-16': { // Es Jeruk
    marination: 0,
    instructions: 'Peras jeruk segar, tambah gula & es batu.',
    taste: 'Asam manis segar alami.',
    items: { 'ING-17': 0.150, 'ING-14': 15.000 },
  },
};

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Terhubung ke database', DB_CONFIG.database);

  try {
    // 1. Tambahkan bahan baku baru (Bebek, Lele, Nila) jika belum ada
    for (const ing of NEW_INGREDIENTS) {
      await conn.query(
        `INSERT INTO ingredients (code, name, category, unit, current_stock, min_threshold, last_buy_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [ing.code, ing.name, ing.category, ing.unit, ing.current_stock, ing.min_threshold, ing.last_buy_price]
      );
    }
    console.log(`OK - ${NEW_INGREDIENTS.length} bahan baku baru dipastikan tersedia.`);

    // Ambil peta ingredient code -> id
    const [ingredientRows] = await conn.query('SELECT id, code FROM ingredients');
    const ingredientIdByCode = {};
    for (const row of ingredientRows) ingredientIdByCode[row.code] = row.id;

    // 2. Untuk tiap menu, buat ulang resep + recipe_ingredients secara bersih
    let fixedCount = 0;
    for (const [menuCode, def] of Object.entries(RECIPE_DEFINITIONS)) {
      const [menuRows] = await conn.query('SELECT id, name FROM menus WHERE code = ?', [menuCode]);
      if (menuRows.length === 0) {
        console.warn(`! Menu dengan kode ${menuCode} tidak ditemukan, dilewati.`);
        continue;
      }
      const menuId = menuRows[0].id;
      const menuName = menuRows[0].name;

      // Nonaktifkan resep lama untuk menu ini (jaga histori, tidak dihapus)
      await conn.query('UPDATE recipes SET is_active = FALSE WHERE menu_id = ?', [menuId]);

      // Buat resep baru yang aktif
      const [recipeResult] = await conn.query(
        `INSERT INTO recipes (menu_id, version, instructions, marination_time_minutes, taste_profile, sop_notes, is_active)
         VALUES (?, 1, ?, ?, ?, 'Resep otomatis dibuat oleh fixRecipesAllMenus.js agar stok bahan baku terpotong otomatis saat menu ini dipesan.', TRUE)`,
        [menuId, def.instructions, def.marination, def.taste]
      );
      const recipeId = recipeResult.insertId;

      // Masukkan bahan baku resep
      for (const [ingCode, amount] of Object.entries(def.items)) {
        const ingredientId = ingredientIdByCode[ingCode];
        if (!ingredientId) {
          console.warn(`! Bahan ${ingCode} tidak ditemukan untuk menu ${menuName}, dilewati.`);
          continue;
        }
        await conn.query(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount_required) VALUES (?, ?, ?)',
          [recipeId, ingredientId, amount]
        );
      }

      fixedCount++;
      console.log(`OK - Resep untuk "${menuName}" (${menuCode}) berhasil dibuat/diperbarui.`);
    }

    console.log(`\nSelesai. ${fixedCount} menu sekarang punya resep aktif dan akan memotong stok otomatis saat dipesan di POS.`);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('Gagal menjalankan perbaikan resep:', err);
  process.exit(1);
});
