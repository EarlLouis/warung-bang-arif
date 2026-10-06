const mysql = require('mysql2/promise');

async function updateImages() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Ayam_goreng_dan_bakar_bang_arif'
  });

  console.log('Updating menu photos with local disk D photos...');

  // 1. Update existing menu photos
  await conn.query("UPDATE menus SET image_url = '/images/ayam_bakar_madu.jpg' WHERE code = 'MN-01'");
  await conn.query("UPDATE menus SET image_url = '/images/ayam_goreng.jpg' WHERE code = 'MN-02'");
  await conn.query("UPDATE menus SET image_url = '/images/ayam_pejantan_bakar_madu.jpg' WHERE code = 'MN-03'");
  await conn.query("UPDATE menus SET image_url = '/images/ayam_pejantan_goreng.jpg' WHERE code = 'MN-04'");
  await conn.query("UPDATE menus SET image_url = '/images/nasi.jpg' WHERE code = 'MN-08'");
  await conn.query("UPDATE menus SET image_url = '/images/es_teh_manis.jpg' WHERE code = 'MN-09'");
  await conn.query("UPDATE menus SET image_url = '/images/es_jeruk.jpg' WHERE code = 'MN-10'");

  // 2. Insert new authentic menus from D:\ demo
  const newMenus = [
    ['MN-11', 'Bebek Bakar Madu Spesial', 'Makanan Utama', 28000, 34000, 'Bebek bumbu rempah bakar madu empuk tidak alot dengan aroma khas.', '/images/bebek_bakar.jpg', true, true],
    ['MN-12', 'Bebek Goreng Lengkuas', 'Makanan Utama', 27000, 33000, 'Bebek ungkep gurih bertabur serundeng lengkuas renyah.', '/images/bebek_goreng.jpg', false, true],
    ['MN-13', 'Ikan Lele Bakar Madu', 'Makanan Utama', 16000, 20000, 'Ikan lele segar dibakar dengan baluran bumbu madu gurih legit.', '/images/ikan_lele_bakar.jpg', false, true],
    ['MN-14', 'Ikan Lele Goreng Crispy', 'Makanan Utama', 15000, 19000, 'Lele goreng bumbu rempah garing renyah sedap.', '/images/ikan_lele_goreng.jpg', false, true],
    ['MN-15', 'Ikan Nila Bakar Madu', 'Makanan Utama', 22000, 27000, 'Ikan nila segar bakar madu daging tebal manis gurih.', '/images/ikan_nila_bakar.jpg', false, true],
    ['MN-16', 'Ikan Nila Goreng Renyah', 'Makanan Utama', 21000, 26000, 'Ikan nila goreng renyah hingga ke sirip.', '/images/ikan_nila_goreng.jpg', false, true],
    ['MN-17', 'Es Teh Tawar Melati', 'Minuman Segar', 2500, 3500, 'Teh melati wangi dingin menyegarkan tanpa gula.', '/images/es_teh_tawar.jpg', false, true]
  ];

  for (const m of newMenus) {
    await conn.query(
      `INSERT INTO menus (code, name, category, sell_price, online_price, description, image_url, is_favorite, is_available) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE image_url = VALUES(image_url), name = VALUES(name), description = VALUES(description)`,
      m
    );
  }

 // 3. Update recipes plating photos (Hanya pakai r.menu_id = m.id)
  await conn.query(`
    UPDATE recipes r 
    JOIN menus m ON r.menu_id = m.id 
    SET r.plating_photo_url = m.image_url
  `);

  console.log('Successfully updated menus and recipes with local disk D photos!');
  await conn.end();
}

updateImages().catch(err => {
  console.error(err);
  process.exit(1);
});