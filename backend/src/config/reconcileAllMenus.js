/**
 * reconcileAllMenus.js
 * ---------------------------------------------------------
 * KENAPA SCRIPT INI DIBUAT:
 * fixMenuCatalogAndRecipes.js mencocokkan menu lewat `image_url` (dan
 * belakangan lewat `code` juga), tapi di database project ini ternyata
 * KEDUANYA sudah tidak stabil — banyak baris menu dengan nama yang sama
 * (mis. 5x "Ayam Goreng", 3x "Ayam Bakar Madu") tapi `image_url` dan/atau
 * `code` yang berbeda-beda (sebagian malah kosong, makanya tampil sebagai
 * ikon generik warna-warni, bukan foto asli). Akibatnya, tiap kali script
 * lama dijalankan, dia gagal mengenali baris lama sebagai duplikat dan
 * malah menciptakan baris baru lagi.
 *
 * STRATEGI SCRIPT INI:
 * Alih-alih mengandalkan foto/kode, script ini mencocokkan SEMUA baris
 * menu berdasarkan KATA KUNCI DI NAMA-nya (case-insensitive, mengabaikan
 * imbuhan seperti "Spesial", "Renyah", "Lengkuas", dll). Untuk tiap dari
 * 16 menu resmi:
 *   1. Cari SEMUA baris menu yang namanya cocok.
 *   2. Baris dengan id TERKECIL dijadikan keeper.
 *   3. Semua baris lain: riwayat order_items dipindah ke keeper, resep
 *      lamanya dihapus, baris menunya dihapus.
 *   4. Baris keeper ditimpa total (kode, nama, kategori, harga, deskripsi,
 *      foto) supaya 100% sesuai versi resmi, lalu dipasangi resep/BOM yang
 *      benar dari nol.
 *
 * Menu yang namanya TIDAK cocok kata kunci manapun dari 16 menu resmi
 * TIDAK disentuh — hanya dilaporkan di akhir, supaya aman.
 *
 * AMAN dijalankan berkali-kali (idempotent). Setelah ini jalan, TIDAK
 * perlu lagi menjalankan fixMenuCatalogAndRecipes.js atau
 * cleanupStrayMenus.js — script ini sudah menggantikan keduanya.
 *
 * CARA MENJALANKAN (dari folder backend/):
 *   node src/config/reconcileAllMenus.js
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

const NEW_INGREDIENTS = [
  { code: 'ING-18', name: 'Daging Bebek Segar', category: 'Daging & Protein', unit: 'kg', current_stock: 15.00, min_threshold: 5.00, last_buy_price: 42000 },
  { code: 'ING-19', name: 'Ikan Lele Segar', category: 'Daging & Protein', unit: 'ekor', current_stock: 80.00, min_threshold: 20.00, last_buy_price: 4500 },
  { code: 'ING-20', name: 'Ikan Nila Segar', category: 'Daging & Protein', unit: 'ekor', current_stock: 60.00, min_threshold: 15.00, last_buy_price: 6000 },
];

// Satu-satunya sumber kebenaran. `keywords` dipakai untuk MENCARI baris lama
// (harus SEMUA kata di dalamnya muncul di nama baris, urutan bebas), bukan
// untuk validasi ketat -> jadi "Ayam Goreng Spesial Bang Arif" tetap kena.
// Urutan array PENTING: taruh yang paling spesifik/panjang duluan supaya
// "Ayam Negeri Bakar Madu" tidak salah kecantol ke keyword "Ayam Bakar Madu".
const CANONICAL_MENUS = [
  {
    image: 'ayam_negeri_bakar_madu.jpg', code: 'MN-03', name: 'Ayam Negeri Bakar Madu', category: 'Ayam',
    keywords: ['ayam', 'negeri', 'bakar', 'madu'],
    sell_price: 22000, online_price: 27000, is_favorite: 0,
    description: 'Ayam broiler negeri potongan empuk juicy dibakar bumbu madu mantap. Sudah include sambal & lalapan segar.',
    recipe: { marination: 120, instructions: 'Marinasi ayam negeri 0.22kg dengan bumbu kuning, bakar arang sambil dioles madu & kecap.', taste: 'Empuk juicy gurih manis madu, include sambal & lalapan.',
      items: { 'ING-01': 0.220, 'ING-02': 18.000, 'ING-03': 28.000, 'ING-04': 12.000, 'ING-12': 0.180, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ayam_negeri_goreng.jpg', code: 'MN-04', name: 'Ayam Negeri Goreng', category: 'Ayam',
    keywords: ['ayam', 'negeri', 'goreng'],
    sell_price: 21000, online_price: 26000, is_favorite: 0,
    description: 'Ayam broiler negeri goreng renyah bumbu ungkep gurih. Sudah include sambal & lalapan segar.',
    recipe: { marination: 45, instructions: 'Ungkep ayam negeri 0.22kg dengan bumbu rempah, goreng hingga renyah.', taste: 'Gurih renyah ringan, include sambal & lalapan.',
      items: { 'ING-01': 0.220, 'ING-03': 28.000, 'ING-05': 90.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ayam_pejantan_bakar_madu.jpg', code: 'MN-05', name: 'Ayam Pejantan Bakar Madu', category: 'Ayam',
    keywords: ['ayam', 'pejantan', 'bakar', 'madu'],
    sell_price: 26000, online_price: 32000, is_favorite: 1,
    description: 'Ayam pejantan serat padat gurih seperti ayam kampung, dibakar madu harum. Sudah include sambal & lalapan segar.',
    recipe: { marination: 120, instructions: 'Marinasi ayam pejantan 0.28kg (serat padat) dengan bumbu kuning, bakar arang sambil dioles madu & kecap.', taste: 'Serat padat gurih seperti ayam kampung, manis madu, include sambal & lalapan.',
      items: { 'ING-01': 0.280, 'ING-02': 22.000, 'ING-03': 32.000, 'ING-04': 16.000, 'ING-12': 0.220, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 } },
  },
  {
    image: 'ayam_pejantan_goreng.jpg', code: 'MN-06', name: 'Ayam Pejantan Goreng', category: 'Ayam',
    keywords: ['ayam', 'pejantan', 'goreng'],
    sell_price: 25000, online_price: 31000, is_favorite: 0,
    description: 'Ayam pejantan goreng rempah khas Bang Arif garing empuk. Sudah include sambal & lalapan segar.',
    recipe: { marination: 45, instructions: 'Ungkep ayam pejantan 0.28kg dengan bumbu khas, goreng hingga garing empuk.', taste: 'Garing di luar empuk di dalam, include sambal & lalapan.',
      items: { 'ING-01': 0.280, 'ING-03': 32.000, 'ING-05': 110.000, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 } },
  },
  {
    image: 'ayam_bakar_madu.jpg', code: 'MN-01', name: 'Ayam Bakar Madu', category: 'Ayam',
    keywords: ['ayam', 'bakar', 'madu'],
    sell_price: 23000, online_price: 28000, is_favorite: 1,
    description: 'Ayam dimarinasi bumbu rempah kuning 2 jam, dibakar arang batok dengan olesan madu murni gurih legit. Sudah include sambal & lalapan segar.',
    recipe: { marination: 120, instructions: 'Marinasi ayam 0.25kg dengan bumbu kuning min. 2 jam, bakar arang batok sambil dioles madu & kecap hingga karamelisasi.', taste: 'Gurih manis madu meresap, aroma bakar arang, include sambal & lalapan.',
      items: { 'ING-01': 0.250, 'ING-02': 20.000, 'ING-03': 30.000, 'ING-04': 15.000, 'ING-12': 0.200, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ayam_goreng.jpg', code: 'MN-02', name: 'Ayam Goreng', category: 'Ayam',
    keywords: ['ayam', 'goreng'],
    sell_price: 22000, online_price: 27000, is_favorite: 1,
    description: 'Ayam ungkep bumbu tradisional digoreng renyah gurih harum. Sudah include sambal & lalapan segar.',
    recipe: { marination: 45, instructions: 'Ungkep ayam 0.25kg dengan bumbu rempah 45 menit, goreng minyak panas 170°C hingga renyah keemasan.', taste: 'Gurih rempah renyah, include sambal & lalapan.',
      items: { 'ING-01': 0.250, 'ING-03': 30.000, 'ING-05': 100.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'bebek_bakar.jpg', code: 'MN-07', name: 'Bebek Bakar', category: 'Bebek',
    keywords: ['bebek', 'bakar'],
    sell_price: 28000, online_price: 34000, is_favorite: 1,
    description: 'Bebek pilihan bumbu rempah bakar madu empuk tidak amis dan tidak alot. Sudah include sambal & lalapan segar.',
    recipe: { marination: 150, instructions: 'Marinasi bebek 0.30kg dengan bumbu rempah, bakar arang sambil dioles madu agar empuk tidak amis.', taste: 'Empuk tidak amis tidak alot, gurih manis bakar, include sambal & lalapan.',
      items: { 'ING-18': 0.300, 'ING-02': 20.000, 'ING-03': 30.000, 'ING-04': 15.000, 'ING-12': 0.250, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 } },
  },
  {
    image: 'bebek_goreng.jpg', code: 'MN-08', name: 'Bebek Goreng', category: 'Bebek',
    keywords: ['bebek', 'goreng'],
    sell_price: 27000, online_price: 33000, is_favorite: 0,
    description: 'Bebek ungkep empuk digoreng renyah harum berempah. Sudah include sambal & lalapan segar.',
    recipe: { marination: 60, instructions: 'Ungkep bebek 0.30kg dengan bumbu rempah, goreng hingga renyah harum.', taste: 'Renyah harum berempah, include sambal & lalapan.',
      items: { 'ING-18': 0.300, 'ING-03': 30.000, 'ING-05': 120.000, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 } },
  },
  {
    image: 'ikan_lele_bakar.jpg', code: 'MN-09', name: 'Ikan Lele Bakar', category: 'Ikan',
    keywords: ['ikan', 'lele', 'bakar'],
    sell_price: 16000, online_price: 20000, is_favorite: 0,
    description: 'Ikan lele segar dibakar bumbu madu gurih legit harum arang. Sudah include sambal & lalapan segar.',
    recipe: { marination: 30, instructions: 'Lumuri lele segar dengan bumbu, bakar arang sambil dioles madu.', taste: 'Gurih legit harum arang, include sambal & lalapan.',
      items: { 'ING-19': 2, 'ING-02': 15.000, 'ING-03': 20.000, 'ING-04': 10.000, 'ING-12': 0.150, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ikan_lele_goreng.jpg', code: 'MN-10', name: 'Ikan Lele Goreng', category: 'Ikan',
    keywords: ['ikan', 'lele', 'goreng'],
    sell_price: 15000, online_price: 19000, is_favorite: 0,
    description: 'Ikan lele goreng kering garing gurih nikmat. Sudah include sambal & lalapan segar.',
    recipe: { marination: 20, instructions: 'Lumuri lele segar dengan bumbu, goreng kering hingga garing.', taste: 'Garing gurih kering, include sambal & lalapan.',
      items: { 'ING-19': 2, 'ING-03': 20.000, 'ING-05': 90.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ikan_nila_bakar.jpg', code: 'MN-11', name: 'Ikan Nila Bakar', category: 'Ikan',
    keywords: ['ikan', 'nila', 'bakar'],
    sell_price: 22000, online_price: 27000, is_favorite: 0,
    description: 'Ikan nila segar ukuran sedang berdaging tebal dibakar bumbu madu. Sudah include sambal & lalapan segar.',
    recipe: { marination: 30, instructions: 'Lumuri nila segar dengan bumbu, bakar arang sambil dioles madu.', taste: 'Daging tebal gurih manis bakar madu, include sambal & lalapan.',
      items: { 'ING-20': 1, 'ING-02': 18.000, 'ING-03': 25.000, 'ING-04': 12.000, 'ING-12': 0.180, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ikan_nila_goreng.jpg', code: 'MN-12', name: 'Ikan Nila Goreng', category: 'Ikan',
    keywords: ['ikan', 'nila', 'goreng'],
    sell_price: 21000, online_price: 26000, is_favorite: 0,
    description: 'Ikan nila goreng renyah kriuk hingga ke sirip. Sudah include sambal & lalapan segar.',
    recipe: { marination: 20, instructions: 'Lumuri nila segar dengan bumbu, goreng hingga renyah kriuk.', taste: 'Renyah kriuk hingga sirip, include sambal & lalapan.',
      items: { 'ING-20': 1, 'ING-03': 25.000, 'ING-05': 100.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'es_teh_manis.jpg', code: 'MN-14', name: 'Es Teh Manis', category: 'Minuman',
    keywords: ['es', 'teh', 'manis'],
    sell_price: 4000, online_price: 5000, is_favorite: 1,
    description: 'Teh tubruk wangi melati Jawa Tengah manis segar es jumbo.',
    recipe: { marination: 0, instructions: 'Seduh teh tubruk, tambah gula, sajikan dengan es batu.', taste: 'Manis segar wangi melati.',
      items: { 'ING-13': 5.000, 'ING-14': 20.000 } },
  },
  {
    image: 'es_teh_tawar.jpg', code: 'MN-15', name: 'Es Teh Tawar', category: 'Minuman',
    keywords: ['es', 'teh', 'tawar'],
    sell_price: 2500, online_price: 3500, is_favorite: 0,
    description: 'Teh melati wangi dingin tanpa gula menyegarkan dahaga.',
    recipe: { marination: 0, instructions: 'Seduh teh tubruk tanpa gula, sajikan dengan es batu.', taste: 'Tawar segar wangi melati.',
      items: { 'ING-13': 5.000 } },
  },
  {
    image: 'es_jeruk.jpg', code: 'MN-16', name: 'Es Jeruk', category: 'Minuman',
    keywords: ['es', 'jeruk'],
    sell_price: 6000, online_price: 7500, is_favorite: 0,
    description: 'Jeruk peras murni asam manis segar dengan es batu.',
    recipe: { marination: 0, instructions: 'Peras jeruk segar, tambah gula & es batu.', taste: 'Asam manis segar alami.',
      items: { 'ING-17': 0.150, 'ING-14': 15.000 } },
  },
  {
    image: 'nasi.jpg', code: 'MN-13', name: 'Nasi', category: 'Nasi',
    keywords: ['nasi'],
    sell_price: 5000, online_price: 6000, is_favorite: 0,
    description: 'Nasi putih pulen hangat dari beras ramos pilihan.',
    recipe: { marination: 0, instructions: 'Kukus/liwet beras ramos hingga pulen hangat.', taste: 'Nasi putih pulen hangat.',
      items: { 'ING-06': 150.000 } },
  },
  {
    image: 'teh_panas_manis.jpg', code: 'MN-17', name: 'Teh Panas Manis', category: 'Minuman',
    keywords: ['teh', 'panas', 'manis'],
    sell_price: 4000, online_price: 5000, is_favorite: 0,
    description: 'Teh tubruk hangat manis, cocok menemani makan berat maupun cuaca dingin.',
    recipe: { marination: 0, instructions: 'Seduh teh tubruk dengan air panas, tambahkan gula secukupnya, sajikan hangat.', taste: 'Manis hangat wangi melati.',
      items: { 'ING-13': 5.000, 'ING-14': 20.000 } },
  },
];

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchesKeywords(name, keywords) {
  const norm = ' ' + normalize(name) + ' ';
  return keywords.every((kw) => norm.includes(' ' + kw + ' '));
}

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Terhubung ke database', DB_CONFIG.database);

  try {
    try {
      await conn.query('ALTER TABLE menus MODIFY COLUMN category VARCHAR(50) NOT NULL');
    } catch (e) { /* sudah longgar / abaikan */ }

    // 1. Pastikan bahan baku dasar ada
    for (const ing of NEW_INGREDIENTS) {
      await conn.query(
        `INSERT INTO ingredients (code, name, category, unit, current_stock, min_threshold, last_buy_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [ing.code, ing.name, ing.category, ing.unit, ing.current_stock, ing.min_threshold, ing.last_buy_price]
      );
    }
    const [ingredientRows] = await conn.query('SELECT id, code FROM ingredients');
    const ingredientIdByCode = {};
    for (const row of ingredientRows) ingredientIdByCode[row.code] = row.id;
    console.log('OK - bahan baku dasar tersedia.\n');

    const [allMenus] = await conn.query('SELECT id, code, name FROM menus ORDER BY id ASC');
    const claimedIds = new Set();

    let mergedTotal = 0;
    let fixedMenus = 0;

    for (const dish of CANONICAL_MENUS) {
      const matches = allMenus.filter((m) => !claimedIds.has(m.id) && matchesKeywords(m.name, dish.keywords));

      let keeperId;

      if (matches.length === 0) {
        // Tidak ada baris sama sekali untuk dish ini -> buat baru.
        // Bebaskan dulu kode kanoniknya kalau-kalau masih ada baris (yang
        // namanya sudah tidak cocok keyword apapun) yang kepalang pegang
        // kode ini, supaya insert tidak bentrok ER_DUP_ENTRY.
        await conn.query('UPDATE menus SET code = CONCAT(code, "-OLD-", id) WHERE code = ?', [dish.code]);

        const [insertResult] = await conn.query(
          `INSERT INTO menus (code, name, category, sell_price, online_price, description, image_url, is_favorite, is_available)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [dish.code, dish.name, dish.category, dish.sell_price, dish.online_price, dish.description, `/images/${dish.image}`, dish.is_favorite]
        );
        keeperId = insertResult.insertId;
        console.log(`+ "${dish.name}" tidak ditemukan sama sekali -> menu baru dibuat (id ${keeperId}).`);
      } else {
        matches.sort((a, b) => a.id - b.id);
        keeperId = matches[0].id;
        claimedIds.add(keeperId);

        if (matches.length > 1) {
          for (let i = 1; i < matches.length; i++) {
            const dupe = matches[i];
            claimedIds.add(dupe.id);
            await conn.query('UPDATE order_items SET menu_id = ? WHERE menu_id = ?', [keeperId, dupe.id]);
            const [oldRecipes] = await conn.query('SELECT id FROM recipes WHERE menu_id = ?', [dupe.id]);
            for (const r of oldRecipes) {
              await conn.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [r.id]);
              await conn.query('DELETE FROM sop_checklists WHERE recipe_id = ?', [r.id]);
            }
            await conn.query('DELETE FROM recipes WHERE menu_id = ?', [dupe.id]);
            await conn.query('DELETE FROM menus WHERE id = ?', [dupe.id]);
            mergedTotal++;
            console.log(`  - Menggabungkan "${dupe.name}" (id ${dupe.id}) ke dalam keeper id ${keeperId}, lalu dihapus.`);
          }
        }

        // Bebaskan kode kanonik kalau masih dipegang baris lain (di luar
        // grup yang baru saja digabung), lalu timpa keeper dengan data resmi.
        await conn.query('UPDATE menus SET code = CONCAT(code, "-OLD-", id) WHERE code = ? AND id != ?', [dish.code, keeperId]);

        await conn.query(
          `UPDATE menus SET code = ?, name = ?, category = ?, sell_price = ?, online_price = ?, description = ?, image_url = ?, is_favorite = ?, is_available = 1
           WHERE id = ?`,
          [dish.code, dish.name, dish.category, dish.sell_price, dish.online_price, dish.description, `/images/${dish.image}`, dish.is_favorite, keeperId]
        );
      }

      // Pasang ulang resep dari nol (nonaktifkan yang lama dulu)
      await conn.query('UPDATE recipes SET is_active = FALSE WHERE menu_id = ?', [keeperId]);

      const [recipeResult] = await conn.query(
        `INSERT INTO recipes (menu_id, version, instructions, marination_time_minutes, taste_profile, sop_notes, plating_photo_url, is_active)
         VALUES (?, 1, ?, ?, ?, 'Resep otomatis dari reconcileAllMenus.js.', ?, TRUE)`,
        [keeperId, dish.recipe.instructions, dish.recipe.marination, dish.recipe.taste, `/images/${dish.image}`]
      );
      const recipeId = recipeResult.insertId;

      for (const [ingCode, amount] of Object.entries(dish.recipe.items)) {
        const ingredientId = ingredientIdByCode[ingCode];
        if (!ingredientId) {
          console.warn(`  ! Bahan ${ingCode} tidak ditemukan untuk menu ${dish.name}`);
          continue;
        }
        await conn.query(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount_required) VALUES (?, ?, ?)',
          [recipeId, ingredientId, amount]
        );
      }

      fixedMenus++;
      console.log(`OK - "${dish.name}" beres (menu id ${keeperId}, kategori "${dish.category}", ${matches.length} baris lama digabung).`);
    }

    // Laporkan sisa baris yang tidak cocok keyword manapun (tidak disentuh)
    const [remaining] = await conn.query('SELECT id, code, name, category, image_url FROM menus');
    const untouched = remaining.filter((m) => !CANONICAL_MENUS.some((d) => normalize(m.name) === normalize(d.name)));

    console.log(`\nSelesai. ${fixedMenus} menu resmi beres. ${mergedTotal} baris duplikat digabung & dihapus.`);
    if (untouched.length > 0) {
      console.log(`\nPerhatian: ${untouched.length} baris tersisa yang TIDAK cocok nama menu resmi manapun (cek manual):`);
      for (const m of untouched) console.log(`  - [id ${m.id}, kode ${m.code}] "${m.name}" | kategori: ${m.category} | foto: ${m.image_url}`);
    }
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('Gagal menjalankan rekonsiliasi katalog menu:', err);
  process.exit(1);
});
