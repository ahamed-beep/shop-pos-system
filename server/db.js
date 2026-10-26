const path = require('path');
const { userData } = require('./utils/config');
const logger = require('./utils/logger');
const { runMigrations } = require('./utils/migrationRunner');
const migrations = require('./utils/migrations');
const sqlite3 = require('sqlite3').verbose();

// Database path (NEVER inside app resources)
const dbPath = path.join(userData, 'pos.sqlite3');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Database connection error: ' + err.message);
  } else {
    logger.info('Database connected at: ' + dbPath);
    // 🔥 ENABLE WAL MODE for high concurrency and performance
    db.run('PRAGMA journal_mode = WAL');
    // 🔥 Prevent "Database is locked" errors by waiting up to 5s for busy transactions
    db.run('PRAGMA busy_timeout = 5000');
  }
});

/* ================== CORE TABLE SETUP ================== */
// These are the "base" tables. Evolutions should be handled via migrations.
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    company TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    sku TEXT,
    shortcut TEXT UNIQUE,
    cost REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    qty INTEGER DEFAULT 100,
    low_qty INTEGER DEFAULT 2,
    image_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT,
    customer_name TEXT,
    user_email TEXT,
    total REAL,
    discount REAL DEFAULT 0,
    grand_total REAL,
    paid REAL,
    payment_method TEXT DEFAULT 'cash',
    sold_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'completed',
    customer_id INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    qty INTEGER,
    price REAL,
    total REAL,
    refunded_qty INTEGER DEFAULT 0,
    product_name TEXT,
    category TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'cashier',
    is_verified INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    reset_token TEXT,
    reset_expiration INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS printer_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    printer_type TEXT DEFAULT 'auto',
    printer_name TEXT,
    printer_interface TEXT,
    paper_width INTEGER DEFAULT 58,
    auto_cut INTEGER DEFAULT 1,
    last_detected DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add inside db.serialize() in db.js

db.run(`CREATE TABLE IF NOT EXISTS udhaar_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  total_amount REAL NOT NULL,
  discount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  remaining_amount REAL NOT NULL,
  status TEXT CHECK(status IN ('pending', 'partial', 'paid', 'overdue')) DEFAULT 'pending',
  borrowed_date TEXT NOT NULL,
  due_date TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE TABLE IF NOT EXISTS udhaar_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  udhaar_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  cost REAL DEFAULT 0,
  FOREIGN KEY (udhaar_id) REFERENCES udhaar_records(id) ON DELETE CASCADE
)`);

db.run(`CREATE TABLE IF NOT EXISTS udhaar_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  udhaar_id INTEGER NOT NULL,
  amount_paid REAL NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (udhaar_id) REFERENCES udhaar_records(id) ON DELETE CASCADE
)`);

  // Initialize Default Settings
  const defaultSettings = [
    ['shop_name', 'Hassan Mobiles and Repairing center'],
    ['shop_address', 'Shaheen chowk Ali wali Market, Gujrat'],
    ['shop_phone', '0314-7088914, 0300-6295417'],
    ['receipt_customer_note', 'Jazzcash and Easypaisy is available'],
    ['receipt_show_cashier', 'true'],
    ['receipt_show_invoice', 'true'],
    ['receipt_show_datetime', 'true'],
    ['receipt_phone_label', 'Phone']
  ];

  defaultSettings.forEach(([key, value]) => {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  });

  db.run(`INSERT OR IGNORE INTO printer_settings (id, printer_type) VALUES (1, 'auto')`);
});


const dbReady = (async () => {
  return new Promise((resolve, reject) => {
    // We wait for the serialize queue to reach this point
    db.serialize(() => {
      db.run("SELECT 1", async (err) => {
        if (err) return reject(err);
        try {
          await runMigrations(db, migrations);
          logger.info('All database migrations completed successfully.');
          resolve(db);
        } catch (migrationErr) {
          logger.error('Database migration failed: ' + migrationErr.message);
          reject(migrationErr);
        }
      });
    });
  });
})();

module.exports = { db, dbPath, userData, dbReady };
