/**
 * fixMenuCatalogAndRecipes.js
 * ---------------------------------------------------------
 * MASALAH YANG DIPERBAIKI:
 * Project ini pernah dijalankan 3 script seed menu yang berbeda dan
 * saling tumpang tindih (initDb.js -> syncMenusExact.js -> updateImages.js).
 * Ketiganya memakai penomoran "code" (MN-01, MN-02, dst) yang BERBEDA
 * untuk foto yang sama, sehingga:
 *   1. Muncul menu duplikat/kembar (mis. "Es Teh Tawar" vs
 *      "Es Teh Tawar Melati" — dua-duanya pakai foto yang sama).
 *   2. Kategori jadi pecah dua (mis. "Minuman" vs "Minuman Segar")
 *      sehingga muncul tab kembar di POS.
 *   3. Resep (recipes/recipe_ingredients) jadi tidak nyambung ke menu
 *      yang benar, sehingga stok bahan baku TIDAK berkurang saat menu
 *      tersebut dipesan (badge selalu "Stok ~50 porsi" = nilai default
 *      kalau menu belum punya resep aktif).
 *
 * STRATEGI PERBAIKAN:
 * Daripada mengandalkan "code" yang sudah kacau, script ini mengenali
 * setiap menu dari file FOTO-nya (image_url) — karena walau nama/kode
 * berubah-ubah, foto yang dipakai untuk 1 jenis masakan selalu sama.
 * Untuk tiap kelompok foto yang sama:
 *   - Baris tertua (id terkecil) dijadikan "master".
 *   - Baris duplikat lainnya: pesanan lama (order_items) dipindah dulu
 *     ke baris master (supaya riwayat transaksi TIDAK hilang), baru
 *     baris duplikatnya dihapus.
 *   - Baris master dirapikan (nama, kategori, harga, deskripsi jadi
 *     konsisten) lalu diberi resep (BOM) yang benar.
 *
 * AMAN dijalankan berkali-kali (idempotent).
 *
 * CARA MENJALANKAN (dari folder backend/):
 *   node src/config/fixMenuCatalogAndRecipes.js
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

// Satu-satunya sumber kebenaran untuk katalog menu, dikunci oleh nama file foto
// (paling stabil, karena tidak pernah berubah walau nama/kode menu berubah-ubah).
const CANONICAL_MENUS = [
  {
    image: 'ayam_bakar_madu.jpg', code: 'MN-01', name: 'Ayam Bakar Madu', category: 'Ayam',
    sell_price: 23000, online_price: 28000, is_favorite: 1,
    description: 'Ayam dimarinasi bumbu rempah kuning 2 jam, dibakar arang batok dengan olesan madu murni gurih legit. Sudah include sambal & lalapan segar.',
    recipe: { marination: 120, instructions: 'Marinasi ayam 0.25kg dengan bumbu kuning min. 2 jam, bakar arang batok sambil dioles madu & kecap hingga karamelisasi.', taste: 'Gurih manis madu meresap, aroma bakar arang, include sambal & lalapan.',
      items: { 'ING-01': 0.250, 'ING-02': 20.000, 'ING-03': 30.000, 'ING-04': 15.000, 'ING-12': 0.200, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ayam_goreng.jpg', code: 'MN-02', name: 'Ayam Goreng', category: 'Ayam',
    sell_price: 22000, online_price: 27000, is_favorite: 1,
    description: 'Ayam ungkep bumbu tradisional digoreng renyah gurih harum. Sudah include sambal & lalapan segar.',
    recipe: { marination: 45, instructions: 'Ungkep ayam 0.25kg dengan bumbu rempah 45 menit, goreng minyak panas 170°C hingga renyah keemasan.', taste: 'Gurih rempah renyah, include sambal & lalapan.',
      items: { 'ING-01': 0.250, 'ING-03': 30.000, 'ING-05': 100.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ayam_negeri_bakar_madu.jpg', code: 'MN-03', name: 'Ayam Negeri Bakar Madu', category: 'Ayam',
    sell_price: 22000, online_price: 27000, is_favorite: 0,
    description: 'Ayam broiler negeri potongan empuk juicy dibakar bumbu madu mantap. Sudah include sambal & lalapan segar.',
    recipe: { marination: 120, instructions: 'Marinasi ayam negeri 0.22kg dengan bumbu kuning, bakar arang sambil dioles madu & kecap.', taste: 'Empuk juicy gurih manis madu, include sambal & lalapan.',
      items: { 'ING-01': 0.220, 'ING-02': 18.000, 'ING-03': 28.000, 'ING-04': 12.000, 'ING-12': 0.180, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ayam_negeri_goreng.jpg', code: 'MN-04', name: 'Ayam Negeri Goreng', category: 'Ayam',
    sell_price: 21000, online_price: 26000, is_favorite: 0,
    description: 'Ayam broiler negeri goreng renyah bumbu ungkep gurih. Sudah include sambal & lalapan segar.',
    recipe: { marination: 45, instructions: 'Ungkep ayam negeri 0.22kg dengan bumbu rempah, goreng hingga renyah.', taste: 'Gurih renyah ringan, include sambal & lalapan.',
      items: { 'ING-01': 0.220, 'ING-03': 28.000, 'ING-05': 90.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ayam_pejantan_bakar_madu.jpg', code: 'MN-05', name: 'Ayam Pejantan Bakar Madu', category: 'Ayam',
    sell_price: 26000, online_price: 32000, is_favorite: 1,
    description: 'Ayam pejantan serat padat gurih seperti ayam kampung, dibakar madu harum. Sudah include sambal & lalapan segar.',
    recipe: { marination: 120, instructions: 'Marinasi ayam pejantan 0.28kg (serat padat) dengan bumbu kuning, bakar arang sambil dioles madu & kecap.', taste: 'Serat padat gurih seperti ayam kampung, manis madu, include sambal & lalapan.',
      items: { 'ING-01': 0.280, 'ING-02': 22.000, 'ING-03': 32.000, 'ING-04': 16.000, 'ING-12': 0.220, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 } },
  },
  {
    image: 'ayam_pejantan_goreng.jpg', code: 'MN-06', name: 'Ayam Pejantan Goreng', category: 'Ayam',
    sell_price: 25000, online_price: 31000, is_favorite: 0,
    description: 'Ayam pejantan goreng rempah khas Bang Arif garing empuk. Sudah include sambal & lalapan segar.',
    recipe: { marination: 45, instructions: 'Ungkep ayam pejantan 0.28kg dengan bumbu khas, goreng hingga garing empuk.', taste: 'Garing di luar empuk di dalam, include sambal & lalapan.',
      items: { 'ING-01': 0.280, 'ING-03': 32.000, 'ING-05': 110.000, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 } },
  },
  {
    image: 'bebek_bakar.jpg', code: 'MN-07', name: 'Bebek Bakar', category: 'Bebek',
    sell_price: 28000, online_price: 34000, is_favorite: 1,
    description: 'Bebek pilihan bumbu rempah bakar madu empuk tidak amis dan tidak alot. Sudah include sambal & lalapan segar.',
    recipe: { marination: 150, instructions: 'Marinasi bebek 0.30kg dengan bumbu rempah, bakar arang sambil dioles madu agar empuk tidak amis.', taste: 'Empuk tidak amis tidak alot, gurih manis bakar, include sambal & lalapan.',
      items: { 'ING-18': 0.300, 'ING-02': 20.000, 'ING-03': 30.000, 'ING-04': 15.000, 'ING-12': 0.250, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 } },
  },
  {
    image: 'bebek_goreng.jpg', code: 'MN-08', name: 'Bebek Goreng', category: 'Bebek',
    sell_price: 27000, online_price: 33000, is_favorite: 0,
    description: 'Bebek ungkep empuk digoreng renyah harum berempah. Sudah include sambal & lalapan segar.',
    recipe: { marination: 60, instructions: 'Ungkep bebek 0.30kg dengan bumbu rempah, goreng hingga renyah harum.', taste: 'Renyah harum berempah, include sambal & lalapan.',
      items: { 'ING-18': 0.300, 'ING-03': 30.000, 'ING-05': 120.000, 'ING-07': 10, 'ING-08': 10, 'ING-09': 10, 'ING-11': 1 } },
  },
  {
    image: 'ikan_lele_bakar.jpg', code: 'MN-09', name: 'Ikan Lele Bakar', category: 'Ikan',
    sell_price: 16000, online_price: 20000, is_favorite: 0,
    description: 'Ikan lele segar dibakar bumbu madu gurih legit harum arang. Sudah include sambal & lalapan segar.',
    recipe: { marination: 30, instructions: 'Lumuri lele segar dengan bumbu, bakar arang sambil dioles madu.', taste: 'Gurih legit harum arang, include sambal & lalapan.',
      items: { 'ING-19': 2, 'ING-02': 15.000, 'ING-03': 20.000, 'ING-04': 10.000, 'ING-12': 0.150, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ikan_lele_goreng.jpg', code: 'MN-10', name: 'Ikan Lele Goreng', category: 'Ikan',
    sell_price: 15000, online_price: 19000, is_favorite: 0,
    description: 'Ikan lele goreng kering garing gurih nikmat. Sudah include sambal & lalapan segar.',
    recipe: { marination: 20, instructions: 'Lumuri lele segar dengan bumbu, goreng kering hingga garing.', taste: 'Garing gurih kering, include sambal & lalapan.',
      items: { 'ING-19': 2, 'ING-03': 20.000, 'ING-05': 90.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ikan_nila_bakar.jpg', code: 'MN-11', name: 'Ikan Nila Bakar', category: 'Ikan',
    sell_price: 22000, online_price: 27000, is_favorite: 0,
    description: 'Ikan nila segar ukuran sedang berdaging tebal dibakar bumbu madu. Sudah include sambal & lalapan segar.',
    recipe: { marination: 30, instructions: 'Lumuri nila segar dengan bumbu, bakar arang sambil dioles madu.', taste: 'Daging tebal gurih manis bakar madu, include sambal & lalapan.',
      items: { 'ING-20': 1, 'ING-02': 18.000, 'ING-03': 25.000, 'ING-04': 12.000, 'ING-12': 0.180, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'ikan_nila_goreng.jpg', code: 'MN-12', name: 'Ikan Nila Goreng', category: 'Ikan',
    sell_price: 21000, online_price: 26000, is_favorite: 0,
    description: 'Ikan nila goreng renyah kriuk hingga ke sirip. Sudah include sambal & lalapan segar.',
    recipe: { marination: 20, instructions: 'Lumuri nila segar dengan bumbu, goreng hingga renyah kriuk.', taste: 'Renyah kriuk hingga sirip, include sambal & lalapan.',
      items: { 'ING-20': 1, 'ING-03': 25.000, 'ING-05': 100.000, 'ING-07': 8, 'ING-08': 8, 'ING-09': 8, 'ING-11': 1 } },
  },
  {
    image: 'nasi.jpg', code: 'MN-13', name: 'Nasi', category: 'Nasi',
    sell_price: 5000, online_price: 6000, is_favorite: 0,
    description: 'Nasi putih pulen hangat dari beras ramos pilihan.',
    recipe: { marination: 0, instructions: 'Kukus/liwet beras ramos hingga pulen hangat.', taste: 'Nasi putih pulen hangat.',
      items: { 'ING-06': 150.000 } },
  },
  {
    image: 'es_teh_manis.jpg', code: 'MN-14', name: 'Es Teh Manis', category: 'Minuman',
    sell_price: 4000, online_price: 5000, is_favorite: 1,
    description: 'Teh tubruk wangi melati Jawa Tengah manis segar es jumbo.',
    recipe: { marination: 0, instructions: 'Seduh teh tubruk, tambah gula, sajikan dengan es batu.', taste: 'Manis segar wangi melati.',
      items: { 'ING-13': 5.000, 'ING-14': 20.000 } },
  },
  {
    image: 'es_teh_tawar.jpg', code: 'MN-15', name: 'Es Teh Tawar', category: 'Minuman',
    sell_price: 2500, online_price: 3500, is_favorite: 0,
    description: 'Teh melati wangi dingin tanpa gula menyegarkan dahaga.',
    recipe: { marination: 0, instructions: 'Seduh teh tubruk tanpa gula, sajikan dengan es batu.', taste: 'Tawar segar wangi melati.',
      items: { 'ING-13': 5.000 } },
  },
  {
    image: 'es_jeruk.jpg', code: 'MN-16', name: 'Es Jeruk', category: 'Minuman',
    sell_price: 6000, online_price: 7500, is_favorite: 0,
    description: 'Jeruk peras murni asam manis segar dengan es batu.',
    recipe: { marination: 0, instructions: 'Peras jeruk segar, tambah gula & es batu.', taste: 'Asam manis segar alami.',
      items: { 'ING-17': 0.150, 'ING-14': 15.000 } },
  },
];

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Terhubung ke database', DB_CONFIG.database);

  try {
    // 0. Pastikan kolom category cukup longgar (jaga-jaga kalau belum di-ALTER)
    try {
      await conn.query('ALTER TABLE menus MODIFY COLUMN category VARCHAR(50) NOT NULL');
    } catch (e) { /* sudah longgar / abaikan */ }

    // 1. Pastikan bahan baku Bebek/Lele/Nila ada
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
    console.log('OK - bahan baku dasar tersedia.');

    let mergedDuplicates = 0;
    let fixedMenus = 0;

    // Membebaskan sebuah kode ("MN-xx") dari baris manapun SELAIN keeperId,
    // dengan cara menggabungkan (pindah riwayat order_items lalu hapus) baris
    // lama yang masih memegang kode itu. Dipanggil sebelum insert/update apa
    // pun yang akan menulis kode tsb, supaya tidak pernah lagi bentrok
    // ER_DUP_ENTRY pada kolom `code`, apa pun kombinasi data lama yang ada.
    async function freeUpCode(code, keeperId) {
      const [clashRows] = await conn.query(
        keeperId != null ? 'SELECT id, name FROM menus WHERE code = ? AND id != ?' : 'SELECT id, name FROM menus WHERE code = ?',
        keeperId != null ? [code, keeperId] : [code]
      );
      for (const clash of clashRows) {
        if (keeperId != null) {
          await conn.query('UPDATE order_items SET menu_id = ? WHERE menu_id = ?', [keeperId, clash.id]);
        }
        const [oldRecipes] = await conn.query('SELECT id FROM recipes WHERE menu_id = ?', [clash.id]);
        for (const r of oldRecipes) {
          await conn.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [r.id]);
          await conn.query('DELETE FROM sop_checklists WHERE recipe_id = ?', [r.id]);
        }
        await conn.query('DELETE FROM recipes WHERE menu_id = ?', [clash.id]);
        await conn.query('DELETE FROM menus WHERE id = ?', [clash.id]);
        mergedDuplicates++;
        console.log(`  - Membebaskan kode "${code}": menggabungkan "${clash.name}" (id ${clash.id}) lalu menghapusnya${keeperId != null ? ` (riwayat dipindah ke id ${keeperId})` : ''}.`);
      }
    }

    // 2. Proses tiap dish kanonik berdasarkan foto (image_url)
    for (const dish of CANONICAL_MENUS) {
      const imagePath = `/images/${dish.image}`;
      const [rows] = await conn.query(
        'SELECT id, name FROM menus WHERE image_url = ? ORDER BY id ASC',
        [imagePath]
      );

      let keeperId;

      if (rows.length === 0) {
        // Belum ada menu untuk foto ini. Bebaskan dulu kodenya kalau-kalau
        // masih dipegang baris lama (foto/nama beda, sisa seed lama).
        await freeUpCode(dish.code, null);

        const [codeRowsNow] = await conn.query('SELECT id, name FROM menus WHERE code = ?', [dish.code]);

        if (codeRowsNow.length > 0) {
          // Ternyata masih ada baris dengan kode ini (baru saja jadi unik
          // setelah freeUpCode) -> pakai sebagai keeper, timpa datanya.
          keeperId = codeRowsNow[0].id;
          await conn.query(
            `UPDATE menus SET code = ?, name = ?, category = ?, sell_price = ?, online_price = ?, description = ?, image_url = ?, is_favorite = ?, is_available = 1
             WHERE id = ?`,
            [dish.code, dish.name, dish.category, dish.sell_price, dish.online_price, dish.description, imagePath, dish.is_favorite, keeperId]
          );
          console.log(`~ Kode "${dish.code}" dipakai ulang dari baris lama (id ${keeperId}) -> ditimpa jadi "${dish.name}".`);
        } else {
          // Benar-benar belum ada -> buat baru
          const [insertResult] = await conn.query(
            `INSERT INTO menus (code, name, category, sell_price, online_price, description, image_url, is_favorite, is_available)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [dish.code, dish.name, dish.category, dish.sell_price, dish.online_price, dish.description, imagePath, dish.is_favorite]
          );
          keeperId = insertResult.insertId;
          console.log(`+ Menu baru dibuat: "${dish.name}"`);
        }
      } else {
        keeperId = rows[0].id;

        // Ada duplikat foto -> pindahkan riwayat order_items ke keeper, lalu hapus baris duplikat
        if (rows.length > 1) {
          for (let i = 1; i < rows.length; i++) {
            const dupeId = rows[i].id;
            await conn.query('UPDATE order_items SET menu_id = ? WHERE menu_id = ?', [keeperId, dupeId]);
            await conn.query('DELETE FROM menus WHERE id = ?', [dupeId]);
            mergedDuplicates++;
            console.log(`  - Menggabungkan duplikat "${rows[i].name}" (id ${dupeId}) ke dalam "${rows[0].name}" (id ${keeperId})`);
          }
        }

        // Bebaskan kode kanonik ini kalau-kalau masih dipegang baris LAIN
        // (id berbeda dari keeper) sebelum menimpanya ke keeper.
        await freeUpCode(dish.code, keeperId);

        // Rapikan data baris master supaya konsisten
        await conn.query(
          `UPDATE menus SET code = ?, name = ?, category = ?, sell_price = ?, online_price = ?, description = ?, is_favorite = ?, is_available = 1
           WHERE id = ?`,
          [dish.code, dish.name, dish.category, dish.sell_price, dish.online_price, dish.description, dish.is_favorite, keeperId]
        );
      }

      // 3. Nonaktifkan resep lama, pasang resep baru yang benar
      await conn.query('UPDATE recipes SET is_active = FALSE WHERE menu_id = ?', [keeperId]);

      const [recipeResult] = await conn.query(
        `INSERT INTO recipes (menu_id, version, instructions, marination_time_minutes, taste_profile, sop_notes, is_active)
         VALUES (?, 1, ?, ?, ?, 'Resep otomatis dari fixMenuCatalogAndRecipes.js.', TRUE)`,
        [keeperId, dish.recipe.instructions, dish.recipe.marination, dish.recipe.taste]
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
      console.log(`OK - "${dish.name}" beres (menu id ${keeperId}, kategori "${dish.category}").`);
    }

    // 4. Laporkan sisa menu "asing" yang tidak dikenali (bukan bagian dari 16 foto resmi)
    const knownImages = CANONICAL_MENUS.map((d) => `/images/${d.image}`);
    const placeholders = knownImages.map(() => '?').join(',');
    const [strayMenus] = await conn.query(
      `SELECT id, code, name, image_url FROM menus WHERE image_url NOT IN (${placeholders}) OR image_url IS NULL`,
      knownImages
    );

    console.log(`\nSelesai. ${fixedMenus} menu resmi sudah rapi & punya resep aktif. ${mergedDuplicates} baris duplikat berhasil digabungkan.`);
    if (strayMenus.length > 0) {
      console.log(`\nPerhatian: ditemukan ${strayMenus.length} menu di luar 16 menu resmi (tidak diotak-atik, silakan cek manual):`);
      for (const m of strayMenus) console.log(`  - [${m.code}] ${m.name} (id ${m.id}, foto: ${m.image_url})`);
    }
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('Gagal menjalankan perbaikan katalog menu:', err);
  process.exit(1);
});
