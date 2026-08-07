# ERP Pro - Business Management System

Professional ERP/CRM application built for small businesses. Manages clients, products, orders, inventory, employees, and sales with role-based access control.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (sql.js - WebAssembly)
- **Frontend:** Vanilla HTML, CSS, JavaScript (ES6 Modules)
- **Auth:** JWT + bcrypt password hashing

## Project Structure

```
erp-app/
├── config/
│   ├── database.js          # Database connection & schema
│   ├── seed.js              # Seed demo data
│   ├── migrate.js           # Migration runner
│   └── migrations/
│       └── 001_initial_schema.js
├── controllers/
│   ├── AuthController.js    # Login, JWT, password
│   ├── ClientController.js  # Client CRUD
│   ├── ProductController.js # Product CRUD
│   ├── OrderController.js   # Order CRUD
│   ├── InventoryController.js
│   ├── EmployeeController.js
│   ├── SalesController.js
│   └── DashboardController.js
├── middleware/
│   └── auth.js              # JWT auth + role authorization
├── models/
│   ├── Client.js
│   ├── Product.js
│   ├── Order.js
│   ├── Inventory.js
│   ├── Employee.js
│   └── Sale.js
├── routes/
│   ├── auth.js
│   ├── clients.js
│   ├── products.js
│   ├── orders.js
│   ├── inventory.js
│   ├── employees.js
│   ├── sales.js
│   └── dashboard.js
├── public/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js           # Main SPA router
│       ├── api.js           # API client
│       ├── utils.js         # Helpers & UI components
│       ├── dashboard.js
│       ├── clients.js
│       ├── products.js
│       ├── orders.js
│       ├── inventory.js
│       ├── sales.js
│       └── employees.js
├── data/                    # SQLite database (auto-created)
├── server.js                # Express server entry
├── .env
└── package.json
```

## Quick Start

```bash
# Install dependencies
npm install

# Run migrations and seed demo data
npm run setup

# Start server
npm run start
```

Open `http://localhost:3000` in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with auto-reload (Node --watch) |
| `npm run seed` | Seed demo data |
| `npm run migrate` | Run pending migrations |
| `npm run migrate:rollback` | Rollback last migration |
| `npm run migrate:status` | Show migration status |
| `npm run setup` | Migrate + seed |

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Sales | sales1 | sales123 |
| HR | hr1 | hr123 |
| Accounting | acct1 | accounting123 |
| Warehouse | wh1 | warehouse123 |

## Features

### Modules
- **Dashboard** - Revenue charts, key metrics, low stock alerts, recent orders
- **Clients** - Full CRUD with search, filters, pagination
- **Products** - CRUD with SKU management, categories, stock levels
- **Orders** - Create orders with line items, status tracking, payment status
- **Inventory** - Stock levels, adjustments, low stock alerts, warehouse locations
- **Sales** - Point-of-sale with automatic inventory deduction
- **Employees** - HR management with departments, positions, salaries

### Role-Based Permissions

| Feature | Admin | Sales | HR | Accounting | Warehouse |
|---------|-------|-------|-----|------------|-----------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clients | ✅ | ✅ | ❌ | ❌ | ❌ |
| Products | ✅ | ✅ | ❌ | ❌ | ✅ |
| Orders | ✅ | ✅ | ❌ | ✅ | ✅ |
| Inventory | ✅ | ❌ | ❌ | ❌ | ✅ |
| Sales | ✅ | ✅ | ❌ | ✅ | ❌ |
| Employees | ✅ | ❌ | ✅ | ❌ | ❌ |

### Security
- JWT authentication with 24h expiry
- bcrypt password hashing (12 rounds)
- Rate limiting on API and auth endpoints
- Helmet security headers
- Parameterized SQL queries (no SQL injection)
- Input validation on all endpoints

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Clients
- `GET /api/clients` - List (search, filter, paginate)
- `GET /api/clients/:id` - Get one
- `POST /api/clients` - Create
- `PUT /api/clients/:id` - Update
- `DELETE /api/clients/:id` - Delete

### Products
- `GET /api/products` - List
- `GET /api/products/categories` - Get categories
- `GET /api/products/low-stock` - Low stock items
- `GET /api/products/:id` - Get one
- `POST /api/products` - Create
- `PUT /api/products/:id` - Update
- `DELETE /api/products/:id` - Delete

### Orders
- `GET /api/orders` - List
- `GET /api/orders/:id` - Get with items
- `POST /api/orders` - Create with items
- `PUT /api/orders/:id` - Update
- `PATCH /api/orders/:id/status` - Update status
- `DELETE /api/orders/:id` - Delete

### Inventory
- `GET /api/inventory` - List
- `GET /api/inventory/low-stock` - Low stock items
- `GET /api/inventory/stats` - Inventory statistics
- `PUT /api/inventory/adjust` - Adjust stock
- `PUT /api/inventory/update` - Set quantity

### Employees
- `GET /api/employees` - List
- `GET /api/employees/departments` - Get departments
- `GET /api/employees/stats` - Employee statistics
- `GET /api/employees/:id` - Get one
- `POST /api/employees` - Create
- `PUT /api/employees/:id` - Update
- `DELETE /api/employees/:id` - Delete

### Sales
- `GET /api/sales` - List
- `GET /api/sales/stats` - Sales statistics
- `GET /api/sales/monthly-revenue` - Monthly revenue chart data
- `GET /api/sales/top-products` - Top selling products
- `GET /api/sales/:id` - Get with items
- `POST /api/sales` - Create (auto-deducts inventory)

### Dashboard
- `GET /api/dashboard` - Full dashboard data

## Environment Variables (.env)

```
PORT=3000
JWT_SECRET=your_secret_key
DB_PATH=./data/erp.db
NODE_ENV=development
```

## Database Migrations

Migrations are stored in `config/migrations/` as numbered JS files exporting `up` and `down` SQL strings.

```bash
# Check status
npm run migrate:status

# Apply pending
npm run migrate

# Rollback last
npm run migrate:rollback
```

To add a new migration:
1. Create `config/migrations/002_add_feature.js`
2. Export `up` (SQL to apply) and `down` (SQL to rollback)
3. Run `npm run migrate`
