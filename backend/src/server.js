const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { pool } = require('./config/db');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket connection
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  socket.on('join:room', (room) => {
    socket.join(room);
    console.log(`[Socket.IO] Client ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Routes
const { router: authRouter } = require('./routes/auth');
const posRouter = require('./routes/pos');
const recipesRouter = require('./routes/recipes');
const kdsRouter = require('./routes/kds');
const inventoryRouter = require('./routes/inventory');
const financeRouter = require('./routes/finance');
const analyticsRouter = require('./routes/analytics');
const crmRouter = require('./routes/crm');
const notificationsRouter = require('./routes/notifications');
const purchaseOrdersRouter = require('./routes/purchaseOrders');
const deliveryRouter = require('./routes/delivery');

app.use('/api/auth', authRouter);
app.use('/api/pos', posRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/kds', kdsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/finance', financeRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/crm', crmRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/po', purchaseOrdersRouter);
app.use('/api/delivery', deliveryRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Sistem Manajemen Ayam Goreng & Bakar Bang Arif',
    database: 'Ayam_goreng_dan_bakar_bang_arif',
    timestamp: new Date().toISOString()
  });
});

// Sajikan frontend hasil build (frontend/dist) dari service yang sama,
// supaya /api dan /socket.io satu domain dengan halaman web.
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));
app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

if (!process.env.JWT_SECRET) {
  console.warn('[Security] JWT_SECRET belum di-set. Set JWT_SECRET di environment sebelum dipakai publik!');
}

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Migration ringan untuk CRUD Inventory: soft-delete/arsip agar data historis
    // resep, mutasi, opname, dan supplier tidak ikut terhapus.
    const [columns] = await pool.query(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ingredients'
        AND COLUMN_NAME = 'is_active'
    `);
    if (Number(columns[0].cnt) === 0) {
      await pool.query(`ALTER TABLE ingredients ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
      console.log('[Migration] Kolom ingredients.is_active berhasil ditambahkan.');
    }

    await pool.query(`CREATE TABLE IF NOT EXISTS delivery_platforms (id INT AUTO_INCREMENT PRIMARY KEY, platform VARCHAR(30) NOT NULL UNIQUE, connected TINYINT(1) NOT NULL DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB`);
    await pool.query(`INSERT IGNORE INTO delivery_platforms (platform, connected) VALUES ('GOFOOD',0),('GRABFOOD',0),('SHOPEEFOOD',0)`);

    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🍗 WARUNG AYAM GORENG & BAKAR MADU BANG ARIF - BACKEND 🍗`);
      console.log(`Server running on: http://localhost:${PORT}`);
      console.log(`Database target: Ayam_goreng_dan_bakar_bang_arif`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Startup] Gagal menyiapkan database:', err.message);
    process.exit(1);
  }
}


let lastDailyReportKey = null;
async function createDailyReportNotification() {
  const now = new Date();
  const key = now.toISOString().slice(0,10);
  if (now.getHours() !== 0 || lastDailyReportKey === key) return;
  lastDailyReportKey = key;
  try {
    const [r] = await pool.query(`SELECT COALESCE(SUM(total_amount),0) omzet, COUNT(*) orders FROM orders WHERE DATE(created_at)=DATE_SUB(CURDATE(),INTERVAL 1 DAY) AND status <> 'CANCELLED'`);
    await pool.query(`INSERT INTO notifications (type,title,message,severity,is_read) VALUES ('LAPORAN_HARIAN','Laporan Harian Otomatis',?,?,FALSE)`, ['INFO', `Ringkasan kemarin: ${r[0].orders} transaksi dengan omzet Rp ${Number(r[0].omzet).toLocaleString('id-ID')}.`]);
    io.emit('notification:new', { type:'LAPORAN_HARIAN', title:'Laporan Harian Otomatis', message:`Ringkasan kemarin: ${r[0].orders} transaksi dengan omzet Rp ${Number(r[0].omzet).toLocaleString('id-ID')}.`, severity:'INFO' });
  } catch (e) { console.error('[Daily Report]', e.message); }
}
setInterval(createDailyReportNotification, 30 * 1000);

startServer();
