import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dbDir, 'erp.db');

let db;

export async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  createTables();
  saveDatabase();

  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Auto-save periodically
let saveInterval;
export function startAutoSave() {
  saveInterval = setInterval(saveDatabase, 5000);
}

export function stopAutoSave() {
  if (saveInterval) clearInterval(saveInterval);
  saveDatabase();
}

export { saveDatabase };

// Wrapper to provide a better-sqlite3-like API
const dbWrapper = {
  prepare(sql) {
    return {
      run(...params) {
        db.run(sql, params);
        const lastId = db.exec('SELECT last_insert_rowid() as id');
        const changes = db.getRowsModified();
        saveDatabase();
        return {
          lastInsertRowid: lastId.length ? lastId[0].values[0][0] : 0,
          changes
        };
      },
      get(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((col, i) => row[col] = vals[i]);
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((col, i) => row[col] = vals[i]);
          rows.push(row);
        }
        stmt.free();
        return rows;
      }
    };
  },

  exec(sql) {
    db.exec(sql);
    saveDatabase();
  },

  pragma(str) {
    db.run(`PRAGMA ${str}`);
  }
};

function createTables() {
  dbWrapper.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin','sales','hr','accounting','warehouse')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    tax_id TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit_price REAL NOT NULL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    min_stock INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER DEFAULT 0,
    warehouse_location TEXT,
    last_restocked DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    position TEXT,
    hire_date DATE,
    salary REAL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','terminated')),
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    client_id INTEGER NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','partial','paid','refunded')),
    payment_method TEXT,
    shipping_address TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    tax_rate REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_number TEXT UNIQUE NOT NULL,
    order_id INTEGER,
    client_id INTEGER,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'paid' CHECK(payment_status IN ('pending','paid','partial','refunded')),
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    tax_rate REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  `);
}

export default dbWrapper;
