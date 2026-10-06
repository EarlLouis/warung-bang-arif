const mysql = require('mysql2/promise');

async function syncMenusExact() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Ayam_goreng_dan_bakar_bang_arif'
  });

  console.log('Modifying menus category column to VARCHAR(50)...');
  await conn.query('ALTER TABLE menus MODIFY COLUMN category VARCHAR(50) NOT NULL;');

  // Remove standalone sambal and extras that are not in the photos
  console.log('Removing standalone sambal and non-photo menus...');
  await conn.query("DELETE FROM menus WHERE code IN ('MN-05', 'MN-06', 'MN-07') OR name LIKE '%Sambal%' OR name LIKE '%Bacem%'");

  // The 16 authentic menus matching D:\ demo photos exactly
  const authenticMenus = [
    {
      code: 'MN-01',
      name: 'Ayam Bakar Madu',
      category: 'Ayam',
      sell_price: 23000,
      online_price: 28000,
      description: 'Ayam dimarinasi bumbu rempah kuning 2 jam, dibakar arang batok dengan olesan madu murni gurih legit. Sudah include sambal & lalapan segar.',
      image_url: '/images/ayam_bakar_madu.jpg',
      is_favorite: 1
    },
    {
      code: 'MN-02',
      name: 'Ayam Goreng',
      category: 'Ayam',
      sell_price: 22000,
      online_price: 27000,
      description: 'Ayam ungkep bumbu tradisional digoreng renyah gurih harum. Sudah include sambal & lalapan segar.',
      image_url: '/images/ayam_goreng.jpg',
      is_favorite: 1
    },
    {
      code: 'MN-03',
      name: 'Ayam Negeri Bakar Madu',
      category: 'Ayam',
      sell_price: 22000,
      online_price: 27000,
      description: 'Ayam broiler negeri potongan empuk juicy dibakar bumbu madu mantap. Sudah include sambal & lalapan segar.',
      image_url: '/images/ayam_negeri_bakar_madu.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-04',
      name: 'Ayam Negeri Goreng',
      category: 'Ayam',
      sell_price: 21000,
      online_price: 26000,
      description: 'Ayam broiler negeri goreng renyah bumbu ungkep gurih. Sudah include sambal & lalapan segar.',
      image_url: '/images/ayam_negeri_goreng.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-05',
      name: 'Ayam Pejantan Bakar Madu',
      category: 'Ayam',
      sell_price: 26000,
      online_price: 32000,
      description: 'Ayam pejantan serat padat gurih seperti ayam kampung, dibakar madu harum. Sudah include sambal & lalapan segar.',
      image_url: '/images/ayam_pejantan_bakar_madu.jpg',
      is_favorite: 1
    },
    {
      code: 'MN-06',
      name: 'Ayam Pejantan Goreng',
      category: 'Ayam',
      sell_price: 25000,
      online_price: 31000,
      description: 'Ayam pejantan goreng rempah khas Bang Arif garing empuk. Sudah include sambal & lalapan segar.',
      image_url: '/images/ayam_pejantan_goreng.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-07',
      name: 'Bebek Bakar',
      category: 'Bebek',
      sell_price: 28000,
      online_price: 34000,
      description: 'Bebek pilihan bumbu rempah bakar madu empuk tidak amis dan tidak alot. Sudah include sambal & lalapan segar.',
      image_url: '/images/bebek_bakar.jpg',
      is_favorite: 1
    },
    {
      code: 'MN-08',
      name: 'Bebek Goreng',
      category: 'Bebek',
      sell_price: 27000,
      online_price: 33000,
      description: 'Bebek ungkep empuk digoreng renyah harum berempah. Sudah include sambal & lalapan segar.',
      image_url: '/images/bebek_goreng.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-09',
      name: 'Ikan Lele Bakar',
      category: 'Ikan',
      sell_price: 16000,
      online_price: 20000,
      description: 'Ikan lele segar dibakar bumbu madu gurih legit harum arang. Sudah include sambal & lalapan segar.',
      image_url: '/images/ikan_lele_bakar.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-10',
      name: 'Ikan Lele Goreng',
      category: 'Ikan',
      sell_price: 15000,
      online_price: 19000,
      description: 'Ikan lele goreng kering garing gurih nikmat. Sudah include sambal & lalapan segar.',
      image_url: '/images/ikan_lele_goreng.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-11',
      name: 'Ikan Nila Bakar',
      category: 'Ikan',
      sell_price: 22000,
      online_price: 27000,
      description: 'Ikan nila segar ukuran sedang berdaging tebal dibakar bumbu madu. Sudah include sambal & lalapan segar.',
      image_url: '/images/ikan_nila_bakar.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-12',
      name: 'Ikan Nila Goreng',
      category: 'Ikan',
      sell_price: 21000,
      online_price: 26000,
      description: 'Ikan nila goreng renyah kriuk hingga ke sirip. Sudah include sambal & lalapan segar.',
      image_url: '/images/ikan_nila_goreng.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-13',
      name: 'Nasi',
      category: 'Nasi',
      sell_price: 5000,
      online_price: 6000,
      description: 'Nasi putih pulen hangat dari beras ramos pilihan.',
      image_url: '/images/nasi.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-14',
      name: 'Es Teh Manis',
      category: 'Minuman',
      sell_price: 4000,
      online_price: 5000,
      description: 'Teh tubruk wangi melati Jawa Tengah manis segar es jumbo.',
      image_url: '/images/es_teh_manis.jpg',
      is_favorite: 1
    },
    {
      code: 'MN-15',
      name: 'Es Teh Tawar',
      category: 'Minuman',
      sell_price: 2500,
      online_price: 3500,
      description: 'Teh melati wangi dingin tanpa gula menyegarkan dahaga.',
      image_url: '/images/es_teh_tawar.jpg',
      is_favorite: 0
    },
    {
      code: 'MN-16',
      name: 'Es Jeruk',
      category: 'Minuman',
      sell_price: 6000,
      online_price: 7500,
      description: 'Jeruk peras murni asam manis segar dengan es batu.',
      image_url: '/images/es_jeruk.jpg',
      is_favorite: 0
    }
  ];

  // Upsert all 16 menus
  for (const m of authenticMenus) {
    await conn.query(
      `INSERT INTO menus (code, name, category, sell_price, online_price, description, image_url, is_favorite, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name), 
         category = VALUES(category), 
         sell_price = VALUES(sell_price), 
         online_price = VALUES(online_price), 
         description = VALUES(description), 
         image_url = VALUES(image_url), 
         is_favorite = VALUES(is_favorite)`,
      [m.code, m.name, m.category, m.sell_price, m.online_price, m.description, m.image_url, m.is_favorite]
    );
  }

  // Update recipe linkages
  console.log('Updating recipes and SOP notes...');
  await conn.query(`UPDATE recipes SET taste_profile = 'Gurih manis bumbu madu meresap, sudah include sambal terasi matang & lalapan' WHERE menu_id = 1`);

  console.log('Menus synchronized successfully to exact 16 photo items without separate sambal!');
  await conn.end();
}

syncMenusExact().catch(err => {
  console.error(err);
  process.exit(1);
});
