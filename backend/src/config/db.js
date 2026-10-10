const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const DB_NAME = process.env.DB_NAME || 'Ayam_goreng_dan_bakar_bang_arif';

// Database cloud (Aiven, TiDB, dll.) biasanya wajib SSL. Set DB_SSL=true di environment.
// Catatan: rejectUnauthorized:false itu praktis untuk tugas kuliah; untuk produksi sungguhan
// sebaiknya pakai sertifikat CA dari provider.
const SSL_OPTION = ['true', '1'].includes(String(process.env.DB_SSL || '').toLowerCase())
  ? { ssl: { rejectUnauthorized: false } }
  : {};

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4',
  ...SSL_OPTION
};

const pool = mysql.createPool(DB_CONFIG);

module.exports = {
  pool,
  DB_CONFIG,
  DB_NAME,
  SSL_OPTION
};
