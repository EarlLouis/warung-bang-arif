const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

async function initDatabase() {
  const useSsl = ['true', '1'].includes(String(process.env.DB_SSL || '').toLowerCase());
  const dbName = process.env.DB_NAME || 'Ayam_goreng_dan_bakar_bang_arif';

  const rootConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
  };

  console.log(`Connecting to MySQL server (${rootConfig.host}:${rootConfig.port})...`);
  const connection = await mysql.createConnection(rootConfig);

  console.log(`Creating database ${dbName} if not exists...`);
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  } catch (err) {
    // Di database cloud, user biasanya tidak boleh CREATE DATABASE (database sudah disediakan).
    console.warn(`Skip CREATE DATABASE (${err.message}). Lanjut pakai database yang sudah ada.`);
  }
  await connection.query(`USE \`${dbName}\`;`);

  console.log('Creating tables...');
  
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('OWNER', 'KASIR') NOT NULL DEFAULT 'KASIR',
      phone VARCHAR(20),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      description VARCHAR(255)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS user_shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      shift_id INT NOT NULL,
      shift_date DATE NOT NULL,
      starting_cash DECIMAL(12,2) DEFAULT 0,
      ending_cash DECIMAL(12,2) DEFAULT 0,
      expected_cash DECIMAL(12,2) DEFAULT 0,
      cash_difference DECIMAL(12,2) DEFAULT 0,
      status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
      notes TEXT,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS ingredients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      category ENUM('Daging & Protein', 'Bumbu & Rempah', 'Minyak & Saus', 'Bahan Pokok', 'Kemasan & Bahan Bakar') NOT NULL,
      unit VARCHAR(20) NOT NULL,
      current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
      min_threshold DECIMAL(10,2) NOT NULL DEFAULT 10,
      last_buy_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      category ENUM('Makanan Utama', 'Paket Nasi', 'Sambal & Ekstra', 'Minuman Segar') NOT NULL,
      sell_price DECIMAL(12,2) NOT NULL,
      online_price DECIMAL(12,2) NOT NULL,
      description TEXT,
      image_url TEXT,
      is_favorite BOOLEAN DEFAULT FALSE,
      is_available BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS recipes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      menu_id INT NOT NULL,
      version INT DEFAULT 1,
      instructions TEXT NOT NULL,
      marination_time_minutes INT DEFAULT 120,
      plating_photo_url TEXT,
      taste_profile VARCHAR(255) DEFAULT 'Gurih manis meresap hingga ke tulang, harum rempah bakar madu',
      sop_notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipe_id INT NOT NULL,
      ingredient_id INT NOT NULL,
      amount_required DECIMAL(10,3) NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS sop_checklists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipe_id INT NOT NULL,
      step_number INT NOT NULL,
      title VARCHAR(150) NOT NULL,
      description VARCHAR(255),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      order_type ENUM('DINE_IN', 'TAKEAWAY', 'GOFOOD', 'GRABFOOD', 'SHOPEEFOOD') DEFAULT 'DINE_IN',
      customer_name VARCHAR(100) DEFAULT 'Pelanggan Walk-in',
      table_number VARCHAR(20) DEFAULT '-',
      user_id INT NULL,
      user_shift_id INT NULL,
      total_items INT DEFAULT 1,
      subtotal DECIMAL(12,2) NOT NULL,
      discount DECIMAL(12,2) DEFAULT 0,
      platform_fee DECIMAL(12,2) DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL,
      status ENUM('PENDING', 'RECEIVED', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (user_shift_id) REFERENCES user_shifts(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      menu_id INT NOT NULL,
      qty INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(12,2) NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL,
      spicy_level ENUM('Tidak Pedas', 'Sedang', 'Pedas', 'Extra Pedas') DEFAULT 'Sedang',
      sweetness_level ENUM('Kurang Manis', 'Sedang / Pas', 'Manis Madu') DEFAULT 'Sedang / Pas',
      notes VARCHAR(255),
      kds_status ENUM('ANTRI', 'MEMASAK', 'SIAP_SAJI', 'SELESAI') DEFAULT 'ANTRI',
      sop_checked BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      payment_method ENUM('CASH', 'QRIS', 'TRANSFER') NOT NULL,
      amount_paid DECIMAL(12,2) NOT NULL,
      change_amount DECIMAL(12,2) DEFAULT 0,
      transaction_ref VARCHAR(100),
      status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PAID',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS stock_mutations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ingredient_id INT NOT NULL,
      mutation_type ENUM('IN_PO', 'OUT_POS', 'ADJUSTMENT_OPNAME', 'WASTE') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      previous_stock DECIMAL(10,2) NOT NULL,
      resulting_stock DECIMAL(10,2) NOT NULL,
      notes TEXT,
      ref_id VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS stock_opnames (
      id INT AUTO_INCREMENT PRIMARY KEY,
      opname_date DATE NOT NULL,
      conducted_by INT NOT NULL,
      status ENUM('DRAFT', 'COMPLETED') DEFAULT 'DRAFT',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conducted_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS stock_opname_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      opname_id INT NOT NULL,
      ingredient_id INT NOT NULL,
      system_stock DECIMAL(10,2) NOT NULL,
      physical_stock DECIMAL(10,2) NOT NULL,
      difference DECIMAL(10,2) NOT NULL,
      reason VARCHAR(255),
      FOREIGN KEY (opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      contact_person VARCHAR(100),
      phone VARCHAR(30),
      address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS supplier_prices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT NOT NULL,
      ingredient_id INT NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      po_number VARCHAR(50) NOT NULL UNIQUE,
      supplier_id INT NOT NULL,
      total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
      status ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RECEIVED', 'REJECTED') DEFAULT 'DRAFT',
      order_date DATE NOT NULL,
      received_date DATE NULL,
      approved_by INT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      po_id INT NOT NULL,
      ingredient_id INT NOT NULL,
      qty DECIMAL(10,2) NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      expense_date DATE NOT NULL,
      category ENUM('Bahan Baku', 'Listrik & Air', 'Gas LPG & Arang', 'Gaji Pegawai', 'Sewa & Kebersihan', 'Lain-lain') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      description TEXT NOT NULL,
      proof_url TEXT,
      user_id INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS customer_feedbacks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NULL,
      customer_name VARCHAR(100) NOT NULL,
      phone VARCHAR(30),
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      category ENUM('RASA', 'PELAYANAN', 'KEBERSIHAN', 'LAINNYA') NOT NULL,
      comment TEXT NOT NULL,
      status ENUM('BARU', 'DITINJAU', 'REVISI_RESEP_SELESAI') DEFAULT 'BARU',
      owner_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('STOK_MENIPIS', 'KOMPLAIN_RASA', 'KDS_SIAP', 'TUTUP_SHIFT', 'PO_MASUK') NOT NULL,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      severity ENUM('INFO', 'WARNING', 'DANGER') DEFAULT 'INFO',
      is_read BOOLEAN DEFAULT FALSE,
      metadata_json JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      action VARCHAR(100) NOT NULL,
      module VARCHAR(50) NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  console.log('Checking and inserting seed data...');

  // 1. Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const [existingUsers] = await connection.query('SELECT COUNT(*) as count FROM users');
  if (existingUsers[0].count === 0) {
    await connection.query(`
      INSERT INTO users (name, email, password, role, phone) VALUES
      ('Bang Arif (Owner)', 'arif@ayambangarif.com', '${passwordHash}', 'OWNER', '081234567890'),
      ('Siti Rahma (Kasir Shift 1)', 'siti@ayambangarif.com', '${passwordHash}', 'KASIR', '081298765432'),
      ('Budi Santoso (Kasir Shift 2)', 'budi@ayambangarif.com', '${passwordHash}', 'KASIR', '081345678912');
    `);
    console.log('Seed users created.');
  }

  // 2. Shifts
  const [existingShifts] = await connection.query('SELECT COUNT(*) as count FROM shifts');
  if (existingShifts[0].count === 0) {
    await connection.query(`
      INSERT INTO shifts (name, start_time, end_time, description) VALUES
      ('Shift 1 (Siang - Sore)', '11:00:00', '19:00:00', 'Operasional jam makan siang hingga sore'),
      ('Shift 2 (Malam - Tutup)', '20:00:00', '00:00:00', 'Operasional jam makan malam hingga tutup jam 00.00');
    `);
    console.log('Seed shifts created.');
  }

  // 3. User Active Shift
  const [existingUserShifts] = await connection.query('SELECT COUNT(*) as count FROM user_shifts');
  if (existingUserShifts[0].count === 0) {
    await connection.query(`
      INSERT INTO user_shifts (user_id, shift_id, shift_date, starting_cash, ending_cash, expected_cash, cash_difference, status, notes) VALUES
      (2, 1, CURDATE(), 200000, 0, 0, 0, 'OPEN', 'Modal kas awal kasir Siti Rp 200.000');
    `);
  }

  // 4. Ingredients
  const [existingIngredients] = await connection.query('SELECT COUNT(*) as count FROM ingredients');
  if (existingIngredients[0].count === 0) {
    await connection.query(`
      INSERT INTO ingredients (code, name, category, unit, current_stock, min_threshold, last_buy_price) VALUES
      ('ING-01', 'Ayam Potong Broiler Segar', 'Daging & Protein', 'kg', 25.00, 10.00, 35000),
      ('ING-02', 'Madu Murni Randu Hutan', 'Bumbu & Rempah', 'ml', 4500.00, 1000.00, 85),
      ('ING-03', 'Bumbu Marinasi Kuning Rempah', 'Bumbu & Rempah', 'gram', 3800.00, 800.00, 45),
      ('ING-04', 'Kecap Manis Tradisional Batang', 'Minyak & Saus', 'ml', 5200.00, 1200.00, 26),
      ('ING-05', 'Minyak Goreng Kelapa Sawit', 'Minyak & Saus', 'ml', 18000.00, 4000.00, 18),
      ('ING-06', 'Beras Ramos Premium', 'Bahan Pokok', 'gram', 42000.00, 10000.00, 15),
      ('ING-07', 'Cabai Rawit Merah Setan', 'Bumbu & Rempah', 'gram', 1800.00, 500.00, 55),
      ('ING-08', 'Cabai Merah Keriting', 'Bumbu & Rempah', 'gram', 2200.00, 600.00, 40),
      ('ING-09', 'Bawang Merah & Putih Kupas', 'Bumbu & Rempah', 'gram', 3100.00, 800.00, 38),
      ('ING-10', 'Lengkuas Parut Segar', 'Bumbu & Rempah', 'gram', 2500.00, 600.00, 22),
      ('ING-11', 'Lalapan Timun & Kemangi', 'Bahan Pokok', 'porsi', 65.00, 20.00, 1500),
      ('ING-12', 'Gas LPG Melon 3kg', 'Kemasan & Bahan Bakar', 'tabung', 8.00, 2.00, 23000),
      ('ING-13', 'Teh Tubruk Wangi Melati', 'Bahan Pokok', 'gram', 1400.00, 300.00, 30),
      ('ING-14', 'Gula Pasir Tebu Kristal', 'Bahan Pokok', 'gram', 7500.00, 2000.00, 17),
      ('ING-15', 'Kotak Dus Kemasan Bang Arif', 'Kemasan & Bahan Bakar', 'pcs', 180.00, 50.00, 1200),
      ('ING-16', 'Tahu & Tempe Kedelai', 'Daging & Protein', 'potong', 60.00, 20.00, 1000),
      ('ING-17', 'Jeruk Peras Segar', 'Bahan Pokok', 'kg', 12.00, 4.00, 16000);
    `);
    console.log('Seed ingredients created.');
  }

  // 5. Menus
  const [existingMenus] = await connection.query('SELECT COUNT(*) as count FROM menus');
  if (existingMenus[0].count === 0) {
    await connection.query(`
      INSERT INTO menus (code, name, category, sell_price, online_price, description, image_url, is_favorite, is_available) VALUES
      ('MN-01', 'Ayam Bakar Madu Spesial', 'Makanan Utama', 23000, 28000, 'Ayam berbumbu rempah rahasia dimarinasi 2 jam, dipanggang di atas kompor gas dengan olesan madu murni gurih manis legit.', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80', TRUE, TRUE),
      ('MN-02', 'Ayam Goreng Lengkuas Gurih', 'Makanan Utama', 22000, 27000, 'Ayam ungkep rempah tradisional digoreng renyah bertabur serundeng lengkuas renyah harum.', 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80', TRUE, TRUE),
      ('MN-03', 'Paket Komplit Ayam Bakar Madu', 'Paket Nasi', 28000, 34000, 'Ayam Bakar Madu + Nasi Pulen + Sambal Terasi / Korek + Lalapan Segar + Es Teh Manis Jumbo.', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80', TRUE, TRUE),
      ('MN-04', 'Paket Komplit Ayam Goreng Lengkuas', 'Paket Nasi', 27000, 33000, 'Ayam Goreng Lengkuas + Nasi Pulen + Sambal Juara + Lalapan Segar + Es Teh Manis Jumbo.', 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=600&auto=format&fit=crop&q=80', FALSE, TRUE),
      ('MN-05', 'Sambal Terasi Bakar Juara', 'Sambal & Ekstra', 4000, 5000, 'Sambal terasi goreng ulek dadakan aroma terasi bakar mantap.', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=80', FALSE, TRUE),
      ('MN-06', 'Sambal Bawang Korek Pedas', 'Sambal & Ekstra', 4000, 5000, 'Cabai rawit setan siram minyak kelapa panas pedas nendang.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80', FALSE, TRUE),
      ('MN-07', 'Tahu & Tempe Bakar Bacem', 'Sambal & Ekstra', 5000, 6500, 'Sepasang tahu dan tempe bacem legit dibakar bumbu madu.', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80', FALSE, TRUE),
      ('MN-08', 'Nasi Putih Pulen Batang', 'Makanan Utama', 5000, 6000, 'Nasi putih pulen hangat dari beras ramos pilihan wangi dan pulen.', 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&auto=format&fit=crop&q=80', FALSE, TRUE),
      ('MN-09', 'Es Teh Manis Jumbo Bang Arif', 'Minuman Segar', 4000, 5000, 'Racikan teh tubruk wangi melati Jawa Tengah manis segar porsi jumbo.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80', TRUE, TRUE),
      ('MN-10', 'Es Jeruk Peras Murni', 'Minuman Segar', 6000, 7500, 'Jeruk peras asli segar asam manis alami menyegarkan dahaga.', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80', FALSE, TRUE);
    `);
    console.log('Seed menus created.');
  }

  // 6. Recipes & Recipe Ingredients & SOP Checklist
  const [existingRecipes] = await connection.query('SELECT COUNT(*) as count FROM recipes');
  if (existingRecipes[0].count === 0) {
    // Recipe 1: Ayam Bakar Madu Spesial (Menu ID 1)
    await connection.query(`
      INSERT INTO recipes (menu_id, version, instructions, marination_time_minutes, plating_photo_url, taste_profile, sop_notes, is_active) VALUES
      (1, 2, '1. Potong ayam ukuran 1/4 (250g per potong).\\n2. Balurkan bumbu marinasi kuning secara merata ke seluruh sela daging.\\n3. Masukkan ke dalam vacuum bag dan simpan di chiller/freezer minimal 2 jam (120 menit) agar bumbu meresap sempurna hingga ke tulang.\\n4. Siapkan api kompor gas dengan panas stabil (sedang-tinggi) dan panaskan wajan/pemanggang datar.\\n5. Panggang ayam sambil dibolak-balik hingga setengah matang.\\n6. Oleskan campuran kecap manis dan madu murni (takaran pas: 20ml madu + 15ml kecap per porsi, jangan terlalu banyak madu agar tidak komplain kemanisan).\\n7. Bakar hingga terkaramelisasi kecokelatan mengkilap harum tanpa gosong hangus.', 120, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80', 'Rasa manis madu seimbang dengan rempah gurih, tidak over-sweet.', 'PENTING: Gunakan kuas takar madu 2x oles saja untuk menjaga konsistensi tingkat kemanisan!', TRUE),
      (2, 1, '1. Ayam potongan 250g diungkep dengan bumbu rempah kuning dan lengkuas parut selama 45 menit.\\n2. Tiriskan dan simpan di vacuum pack.\\n3. Goreng dalam minyak panas 170°C selama 4-5 menit hingga kuning keemasan garing di luar juicy di dalam.\\n4. Goreng serundeng lengkuas terpisah hingga garing kecokelatan dan taburkan di atas ayam.', 0, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80', 'Gurih asin rempah wangi lengkuas renyah tahan lama.', 'Pastikan minyak goreng tidak menghitam, suhu stabil 170C.', TRUE),
      (3, 1, 'Komposisi Paket Komplit: 1 porsi Ayam Bakar Madu + 1 porsi Nasi Pulen (150g beras mentah) + Sambal (20g cabai & bumbu) + Lalapan timun + Es Teh Manis Jumbo.', 120, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80', 'Kombinasi rasa bakar madu gurih manis bersanding sambal pedas segar.', 'Sajikan lengkap bersama garnish timun dan kemangi segar dalam box atau piring anyaman.', TRUE);
    `);

    // Link recipe ingredients
    // Recipe 1 (Ayam Bakar Madu): 0.25 kg Ayam (ING-01), 20 ml Madu (ING-02), 30 gram Bumbu Marinasi (ING-03), 15 ml Kecap (ING-04), 0.05 tabung Gas LPG (ING-12)
    await connection.query(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount_required) VALUES
      (1, 1, 0.250),
      (1, 2, 20.000),
      (1, 3, 30.000),
      (1, 4, 15.000),
      (1, 12, 0.050);
    `);

    // Recipe 2 (Ayam Goreng Lengkuas): 0.25 kg Ayam (ING-01), 30 gram Bumbu (ING-03), 40 gram Lengkuas (ING-10), 100 ml Minyak (ING-05)
    await connection.query(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount_required) VALUES
      (2, 1, 0.250),
      (2, 3, 30.000),
      (2, 10, 40.000),
      (2, 5, 100.000);
    `);

    // Recipe 3 (Paket Komplit Ayam Bakar Madu)
    await connection.query(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount_required) VALUES
      (3, 1, 0.250),
      (3, 2, 20.000),
      (3, 3, 30.000),
      (3, 4, 15.000),
      (3, 6, 150.000),
      (3, 7, 15.000),
      (3, 11, 1.000),
      (3, 12, 0.200),
      (3, 13, 10.000),
      (3, 14, 25.000);
    `);

    // SOP Checklist for Recipe 1
    await connection.query(`
      INSERT INTO sop_checklists (recipe_id, step_number, title, description) VALUES
      (1, 1, 'Cek Durasi Marinasi Minimal 2 Jam', 'Pastikan stok ayam dari freezer/chiller telah melalui marinasi vakum minimal 120 menit.'),
      (1, 2, 'Kesiapan Api Kompor Gas', 'Api kompor harus menyala stabil dan merata di seluruh permukaan pemanggang agar daging matang sampai dalam.'),
      (1, 3, 'Takaran Madu Standar SOP (Anti-Kemanisan)', 'Oleskan bumbu madu maksimal 2 lapis kuas untuk mencegah rasa terlalu manis.'),
      (1, 4, 'Pemeriksaan Kematangan & Standar Plating', 'Pastikan tidak ada darah di tulang, kulit terkaramelisasi kecokelatan, lengkapi timun dan kemangi.');
    `);
    console.log('Seed recipes & SOP checklists created.');
  }

  // 7. Suppliers & Prices
  const [existingSuppliers] = await connection.query('SELECT COUNT(*) as count FROM suppliers');
  if (existingSuppliers[0].count === 0) {
    await connection.query(`
      INSERT INTO suppliers (name, contact_person, phone, address, notes) VALUES
      ('Peternakan Ayam Sejahtera Batang', 'Haji Mahmud', '0812-3344-5566', 'Jl. Raya Warungasem KM 3, Batang', 'Penyedia ayam broiler segar harian ukuran 1.0 - 1.2 kg'),
      ('Toko Rempah & Bumbu Berkah', 'Ibu Nur', '0857-8899-1122', 'Pasar Batang Blok B No. 12', 'Penyedia bumbu dapur rempah segar, lengkuas, cabai, bawang'),
      ('Grosir Madu & Kecap Nusantara', 'Pak Hendra', '0878-2233-4455', 'Pekalongan Utara', 'Madu hutan murni randu dan kecap manis khas'),
      ('Distributor Beras & Minyak Pantura', 'Koh Anton', '0813-9900-1122', 'Kawasan Pergudangan Batang', 'Beras Ramos premium dan minyak kelapa sawit curah grade A');
    `);

    // Supplier Prices comparison
    await connection.query(`
      INSERT INTO supplier_prices (supplier_id, ingredient_id, price) VALUES
      (1, 1, 35000),
      (2, 3, 45),
      (2, 7, 55),
      (2, 8, 40),
      (2, 9, 38),
      (2, 10, 22),
      (3, 2, 85),
      (3, 4, 26),
      (4, 5, 18),
      (4, 6, 15);
    `);
    console.log('Seed suppliers & comparison prices created.');
  }

  // 8. Sample Purchase Orders
  const [existingPOs] = await connection.query('SELECT COUNT(*) as count FROM purchase_orders');
  if (existingPOs[0].count === 0) {
    await connection.query(`
      INSERT INTO purchase_orders (po_number, supplier_id, total_cost, status, order_date, received_date, approved_by, notes) VALUES
      ('PO-20260901-001', 1, 1050000, 'RECEIVED', DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_SUB(CURDATE(), INTERVAL 2 DAY), 1, 'Restock 30 kg Ayam Broiler Segar'),
      ('PO-20260905-002', 3, 425000, 'APPROVED', DATE_SUB(CURDATE(), INTERVAL 1 DAY), NULL, 1, 'Restock Madu Hutan 5000ml');
    `);

    await connection.query(`
      INSERT INTO purchase_order_items (po_id, ingredient_id, qty, unit_price, subtotal) VALUES
      (1, 1, 30.00, 35000, 1050000),
      (2, 2, 5000.00, 85, 425000);
    `);
    console.log('Seed purchase orders created.');
  }

  // 9. Sample Orders & Sales History (for Analytics, Peak Hour, Top Sellers)
  const [existingOrders] = await connection.query('SELECT COUNT(*) as count FROM orders');
  if (existingOrders[0].count === 0) {
    await connection.query(`
      INSERT INTO orders (invoice_number, order_type, customer_name, table_number, user_id, user_shift_id, total_items, subtotal, discount, platform_fee, total_amount, status, created_at) VALUES
      ('INV-20260908-001', 'DINE_IN', 'Mas Dimas', 'Meja 03', 2, 1, 3, 56000, 0, 0, 56000, 'COMPLETED', CONCAT(CURDATE(), ' 12:30:00')),
      ('INV-20260908-002', 'GOFOOD', 'Order GoFood #GF-881', '-', 2, 1, 2, 62000, 0, 12400, 62000, 'COMPLETED', CONCAT(CURDATE(), ' 13:15:00')),
      ('INV-20260908-003', 'DINE_IN', 'Pak Hendra', 'Meja 01', 2, 1, 2, 32000, 0, 0, 32000, 'COMPLETED', CONCAT(CURDATE(), ' 18:45:00')),
      ('INV-20260908-004', 'GRABFOOD', 'Order GrabFood #GB-402', '-', 3, 1, 4, 101000, 0, 20200, 101000, 'COMPLETED', CONCAT(CURDATE(), ' 19:30:00')),
      ('INV-20260908-005', 'DINE_IN', 'Mba Maya', 'Meja 06', 3, 1, 2, 32000, 0, 0, 32000, 'READY', CONCAT(CURDATE(), ' 20:15:00'));
    `);

    // Order Items
    await connection.query(`
      INSERT INTO order_items (order_id, menu_id, qty, unit_price, subtotal, spicy_level, sweetness_level, notes, kds_status, sop_checked) VALUES
      (1, 3, 2, 28000, 56000, 'Sedang', 'Sedang / Pas', 'Sambal dipisah', 'SELESAI', TRUE),
      (2, 3, 1, 34000, 34000, 'Pedas', 'Sedang / Pas', 'Minta ekstra lalapan', 'SELESAI', TRUE),
      (2, 4, 1, 28000, 28000, 'Sedang', 'Sedang / Pas', '-', 'SELESAI', TRUE),
      (3, 1, 1, 23000, 23000, 'Sedang', 'Sedang / Pas', 'Paha atas', 'SELESAI', TRUE),
      (3, 9, 1, 4000, 4000, 'Tidak Pedas', 'Sedang / Pas', 'Es sedikit', 'SELESAI', TRUE),
      (3, 8, 1, 5000, 5000, 'Tidak Pedas', 'Sedang / Pas', 'Hangat', 'SELESAI', TRUE),
      (4, 1, 3, 28000, 84000, 'Extra Pedas', 'Kurang Manis', 'Jangan terlalu manis', 'SELESAI', TRUE),
      (4, 10, 2, 7500, 15000, 'Tidak Pedas', 'Sedang / Pas', '-', 'SELESAI', TRUE),
      (5, 3, 1, 28000, 28000, 'Pedas', 'Sedang / Pas', 'Dada ayam bakar', 'SIAP_SAJI', TRUE),
      (5, 9, 1, 4000, 4000, 'Tidak Pedas', 'Sedang / Pas', '-', 'SIAP_SAJI', TRUE);
    `);

    // Payments
    await connection.query(`
      INSERT INTO payments (order_id, payment_method, amount_paid, change_amount, transaction_ref, status) VALUES
      (1, 'QRIS', 56000, 0, 'QRIS-MIDTRANS-908122', 'PAID'),
      (2, 'TRANSFER', 62000, 0, 'TF-BCA-8891238', 'PAID'),
      (3, 'CASH', 50000, 18000, 'CASH-SITI-003', 'PAID'),
      (4, 'TRANSFER', 101000, 0, 'TF-MANDIRI-4421', 'PAID'),
      (5, 'QRIS', 32000, 0, 'QRIS-MIDTRANS-908129', 'PAID');
    `);
    console.log('Seed orders & payments created.');
  }

  // 10. Operational Expenses
  const [existingExpenses] = await connection.query('SELECT COUNT(*) as count FROM expenses');
  if (existingExpenses[0].count === 0) {
    await connection.query(`
      INSERT INTO expenses (expense_date, category, amount, description, user_id) VALUES
      (DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Bahan Baku', 1050000, 'Pembelian Ayam Broiler 30kg Peternakan Mahmud', 1),
      (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Gas LPG & Arang', 125000, 'Refill 3 tabung Gas Melon 3kg', 1),
      (CURDATE(), 'Listrik & Air', 250000, 'Token Listrik Dapur & Freezer Warung', 1);
    `);
    console.log('Seed expenses created.');
  }

  // 11. Customer Feedback & CRM
  const [existingFeedback] = await connection.query('SELECT COUNT(*) as count FROM customer_feedbacks');
  if (existingFeedback[0].count === 0) {
    await connection.query(`
      INSERT INTO customer_feedbacks (order_id, customer_name, phone, rating, category, comment, status, owner_response) VALUES
      (4, 'Mba Rini (Pelanggan GoFood)', '0812-4455-6677', 3, 'RASA', 'Ayam bakar madunya agak kemanisan kemarin siang, padahal tekstur daging empuk dan sambalnya mantap.', 'DITINJAU', 'Terima kasih atas masukannya Kak Rini. SOP takaran bumbu madu kami revisi agar tidak kemanisan.'),
      (1, 'Mas Dimas', '0819-2233-4455', 5, 'RASA', 'Ayam bakar madunya juara banget! Bumbu meresap sampai ke dalam, sambal terasinya nagih.', 'REVIEWED', 'Terima kasih banyak Mas Dimas! Ditunggu kedatangannya kembali.'),
      (3, 'Pak Hendra', '0813-8877-6655', 4, 'PELAYANAN', 'Pelayanan ramah dan cepat, tempat bersih dan nyaman.', 'REVIEWED', 'Terima kasih atas kunjungannya!');
    `);
    console.log('Seed feedbacks created.');
  }

  // 12. Notifications
  const [existingNotifications] = await connection.query('SELECT COUNT(*) as count FROM notifications');
  if (existingNotifications[0].count === 0) {
    await connection.query(`
      INSERT INTO notifications (type, title, message, severity, is_read) VALUES
      ('KOMPLAIN_RASA', 'Komplain Rasa Masuk!', 'Pelanggan Mba Rini memberikan feedback: Rasa Ayam Bakar kemanisan. Harap evaluasi takaran madu di Modul Resep.', 'WARNING', FALSE),
      ('STOK_MENIPIS', 'Peringatan Stok Menipis!', 'Stok Gas LPG Melon 3kg tersisa 8 tabung (Mendekati ambang batas minimal). Segera buat PO ke supplier.', 'WARNING', FALSE),
      ('KDS_SIAP', 'Pesanan Siap Saji', 'Pesanan Meja 06 (Paket Komplit Ayam Bakar) telah siap disajikan oleh dapur.', 'INFO', FALSE);
    `);
    console.log('Seed notifications created.');
  }

  // 13. Audit Log
  const [existingAudit] = await connection.query('SELECT COUNT(*) as count FROM audit_logs');
  if (existingAudit[0].count === 0) {
    await connection.query(`
      INSERT INTO audit_logs (user_id, action, module, details) VALUES
      (1, 'REVISI_RESEP_MADU', 'Resep Baku', 'Owner merevisi takaran madu murni dari 30ml menjadi 20ml per porsi untuk mengatasi komplain kemanisan.'),
      (2, 'BUKA_SHIFT_1', 'Shift Kasir', 'Kasir Siti membuka Shift 1 dengan modal kas awal Rp 200.000'),
      (1, 'APPROVE_PO', 'Purchase Order', 'Owner menyetujui PO-20260905-002 untuk pembelian Madu Hutan');
    `);
    console.log('Seed audit logs created.');
  }

  console.log('Database initialization & seeding completed successfully!');
  await connection.end();
}

if (require.main === module) {
  initDatabase().catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
}

module.exports = initDatabase;
