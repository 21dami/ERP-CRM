import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initDatabase, saveDatabase } from './database.js';

const seed = async () => {
  console.log('Seeding database...');
  await initDatabase();

  // Import db after initialization
  const { default: db } = await import('./database.js');

  const password = await bcrypt.hash('admin123', 12);
  const salesPass = await bcrypt.hash('sales123', 12);
  const hrPass = await bcrypt.hash('hr123', 12);
  const acctPass = await bcrypt.hash('accounting123', 12);
  const whPass = await bcrypt.hash('warehouse123', 12);

  const users = [
    ['admin', password, 'System Administrator', 'admin@erp.com', 'admin'],
    ['sales1', salesPass, 'John Salesman', 'john@erp.com', 'sales'],
    ['hr1', hrPass, 'Jane HR', 'jane@erp.com', 'hr'],
    ['acct1', acctPass, 'Bob Accountant', 'bob@erp.com', 'accounting'],
    ['wh1', whPass, 'Charlie Warehouse', 'charlie@erp.com', 'warehouse'],
  ];

  for (const u of users) {
    try {
      db.prepare('INSERT OR IGNORE INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)').run(...u);
    } catch(e) {}
  }

  const clients = [
    ['Acme Corporation', 'Acme Corp', 'contact@acme.com', '555-0101', '123 Main St', 'New York', 'NY', '10001', 'USA', '12-3456789'],
    ['TechVista Solutions', 'TechVista Inc', 'hello@techvista.com', '555-0102', '456 Oak Ave', 'San Francisco', 'CA', '94102', 'USA', '98-7654321'],
    ['GlobalTrade Partners', 'GlobalTrade LLC', 'info@globaltrade.com', '555-0103', '789 Pine Rd', 'Chicago', 'IL', '60601', 'USA', '45-1234567'],
    ['Summit Industries', 'Summit Corp', 'sales@summit.com', '555-0104', '321 Elm St', 'Houston', 'TX', '77001', 'USA', '67-8901234'],
    ['Pinnacle Services', 'Pinnacle LLC', 'office@pinnacle.com', '555-0105', '654 Maple Dr', 'Phoenix', 'AZ', '85001', 'USA', '34-5678901'],
    ['NovaTech Enterprises', 'NovaTech Inc', 'support@novatech.com', '555-0106', '987 Cedar Ln', 'Seattle', 'WA', '98101', 'USA', '89-0123456'],
    ['Cascade Digital', 'Cascade LLC', 'team@cascade.com', '555-0107', '147 Birch Blvd', 'Denver', 'CO', '80201', 'USA', '23-4567890'],
    ['Apex Manufacturing', 'Apex Corp', 'production@apex.com', '555-0108', '258 Walnut Way', 'Detroit', 'MI', '48201', 'USA', '56-7890123'],
  ];

  for (const c of clients) {
    try {
      db.prepare('INSERT OR IGNORE INTO clients (name, company, email, phone, address, city, state, zip_code, country, tax_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...c);
    } catch(e) {}
  }

  const products = [
    ['SKU-001', 'Laptop Pro 15', 'High-performance laptop', 'Electronics', 1299.99, 899.99, 8.5, 'pcs', 10],
    ['SKU-002', 'Wireless Mouse', 'Ergonomic wireless mouse', 'Accessories', 29.99, 12.99, 8.5, 'pcs', 50],
    ['SKU-003', 'USB-C Hub', '7-in-1 USB-C hub', 'Accessories', 49.99, 22.99, 8.5, 'pcs', 30],
    ['SKU-004', 'Monitor 27"', '4K IPS Monitor', 'Electronics', 449.99, 299.99, 8.5, 'pcs', 15],
    ['SKU-005', 'Keyboard Mech', 'Mechanical RGB Keyboard', 'Accessories', 89.99, 45.99, 8.5, 'pcs', 25],
    ['SKU-006', 'Webcam HD', '1080p HD Webcam', 'Electronics', 79.99, 35.99, 8.5, 'pcs', 20],
    ['SKU-007', 'Desk Lamp LED', 'Adjustable LED Desk Lamp', 'Office', 39.99, 18.99, 8.5, 'pcs', 40],
    ['SKU-008', 'Office Chair', 'Ergonomic Office Chair', 'Furniture', 349.99, 189.99, 8.5, 'pcs', 8],
    ['SKU-009', 'Standing Desk', 'Electric Standing Desk', 'Furniture', 599.99, 349.99, 8.5, 'pcs', 5],
    ['SKU-010', 'Headphones BT', 'Noise-cancelling headphones', 'Electronics', 199.99, 89.99, 8.5, 'pcs', 20],
    ['SKU-011', 'Cable Kit', 'Premium cable management kit', 'Accessories', 24.99, 8.99, 8.5, 'set', 60],
    ['SKU-012', 'Printer Laser', 'Mono Laser Printer', 'Electronics', 249.99, 159.99, 8.5, 'pcs', 10],
  ];

  for (const p of products) {
    try {
      db.prepare('INSERT OR IGNORE INTO products (sku, name, description, category, unit_price, cost_price, tax_rate, unit, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...p);
    } catch(e) {}
  }

  const inventoryData = [25, 150, 80, 12, 45, 30, 60, 8, 5, 35, 100, 15];
  inventoryData.forEach((qty, i) => {
    try {
      db.prepare("INSERT OR IGNORE INTO inventory (product_id, quantity, warehouse_location, last_restocked) VALUES (?, ?, ?, datetime('now'))").run(i + 1, qty, `Zone ${String.fromCharCode(65 + (i % 4))}-Row${Math.floor(i / 4) + 1}`);
    } catch(e) {}
  });

  const employees = [
    ['EMP-001', 'Alice', 'Johnson', 'alice@erp.com', '555-1001', 'Management', 'CEO', '2020-01-15', 95000],
    ['EMP-002', 'Bob', 'Williams', 'bob@erp.com', '555-1002', 'Sales', 'Sales Manager', '2020-03-01', 72000],
    ['EMP-003', 'Carol', 'Davis', 'carol@erp.com', '555-1003', 'HR', 'HR Director', '2020-06-15', 68000],
    ['EMP-004', 'David', 'Brown', 'david@erp.com', '555-1004', 'Accounting', 'Chief Accountant', '2021-01-10', 71000],
    ['EMP-005', 'Eva', 'Martinez', 'eva@erp.com', '555-1005', 'Warehouse', 'Warehouse Manager', '2021-04-20', 58000],
    ['EMP-006', 'Frank', 'Wilson', 'frank@erp.com', '555-1006', 'Sales', 'Sales Rep', '2022-02-01', 52000],
    ['EMP-007', 'Grace', 'Lee', 'grace@erp.com', '555-1007', 'IT', 'System Admin', '2022-05-15', 65000],
    ['EMP-008', 'Henry', 'Taylor', 'henry@erp.com', '555-1008', 'Warehouse', 'Warehouse Associate', '2023-01-10', 42000],
  ];

  for (const e of employees) {
    try {
      db.prepare('INSERT OR IGNORE INTO employees (employee_id, first_name, last_name, email, phone, department, position, hire_date, salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...e);
    } catch(e) {}
  }

  saveDatabase();

  // Mark initial migration as applied if using migrations
  try {
    db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES ('001_initial_schema.js')").run();
    saveDatabase();
  } catch(e) {}

  console.log('Database seeded successfully!');
  console.log('\nDefault login credentials:');
  console.log('Admin: admin / admin123');
  console.log('Sales: sales1 / sales123');
  console.log('HR: hr1 / hr123');
  console.log('Accounting: acct1 / accounting123');
  console.log('Warehouse: wh1 / warehouse123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
