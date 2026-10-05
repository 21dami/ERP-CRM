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
│   ├── permissions.js       # Permission catalog + default roles
│   ├── seed.js              # Seed demo data
│   ├── migrate.js           # Migration runner
│   └── migrations/
│       ├── 001_initial_schema.js
│       └── 002_roles_permissions.js
├── controllers/
│   ├── AuthController.js    # Login, JWT, password, permissions
│   ├── ClientController.js  # Client CRUD
│   ├── ProductController.js # Product CRUD
│   ├── OrderController.js   # Order CRUD
│   ├── InventoryController.js
│   ├── EmployeeController.js
│   ├── SalesController.js
│   ├── UserController.js    # User CRUD & role assignment
│   ├── RoleController.js    # Role & permission CRUD
│   ├── PermissionController.js
│   └── DashboardController.js
├── middleware/
│   └── auth.js              # JWT auth + requirePermission
├── models/
│   ├── Client.js
│   ├── Product.js
│   ├── Order.js
│   ├── Inventory.js
│   ├── Employee.js
│   ├── Sale.js
│   ├── User.js
│   └── Role.js              # Roles + role_permissions access
├── routes/
│   ├── auth.js
│   ├── clients.js
│   ├── products.js
│   ├── orders.js
│   ├── inventory.js
│   ├── employees.js
│   ├── sales.js
│   ├── users.js
│   ├── roles.js
│   ├── permissions.js
│   └── dashboard.js
├── public/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js           # Main SPA router
│       ├── api.js           # API client
│       ├── utils.js         # Helpers, UI components, permission checks
│       ├── dashboard.js
│       ├── clients.js
│       ├── products.js
│       ├── orders.js
│       ├── inventory.js
│       ├── sales.js
│       ├── employees.js
│       ├── users.js
│       └── roles.js         # Roles & Permissions admin section
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
- **Users** - User management with role assignment and impersonation
- **Roles & Permissions** - Admin section to create roles and grant permissions per role

### Role-Based Permissions

Permissions are stored in the database (`roles` + `role_permissions` tables) and managed from the
**Roles** section by an admin. Every API route and every sidebar item/button is checked against them.
The matrix below shows what the seeded default roles can access out of the box — any of it can be
changed per role, and custom roles can be created with any combination of the 31 permissions.

| Module | Admin | Sales | HR | Accounting | Warehouse |
|---------|-------|-------|-----|------------|-----------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clients | ✅ | ✅ | ❌ | ✅ (read) | ❌ |
| Products | ✅ | ✅ (read) | ❌ | ✅ (read) | ✅ |
| Orders | ✅ | ✅ | ❌ | ✅ (read) | ✅ (read + status) |
| Inventory | ✅ | ❌ | ❌ | ❌ | ✅ |
| Sales | ✅ | ✅ | ❌ | ✅ | ❌ |
| Employees | ✅ | ❌ | ✅ | ❌ | ❌ |
| Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Roles & Permissions | ✅ | ❌ | ❌ | ❌ | ❌ |

Permissions are grouped as `<module>.<action>` (`clients.view`, `clients.create`, `clients.update`,
`clients.delete`, plus `orders.update_status`, `users.impersonate`, `roles.*`, ...). Guards:

- System roles (admin/sales/hr/accounting/warehouse) cannot be renamed or deleted
- A role assigned to users cannot be deleted until the users are reassigned
- Nobody can delete their own role, and nobody can strip their own role of `roles.view` / `roles.update`
- A user's role can only be set to an existing role, and role changes apply immediately (no re-login)

### Security
- JWT authentication with 24h expiry
- bcrypt password hashing (12 rounds)
- Rate limiting on API and auth endpoints
- Helmet security headers
- Parameterized SQL queries (no SQL injection)
- Input validation on all endpoints

## API Endpoints

### Auth
- `POST /api/auth/login` - Login (returns user + permissions)
- `GET /api/auth/me` - Get current user + permissions
- `GET /api/auth/permissions` - Get current user's permission list
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/impersonate/:userId` - Impersonate a user (`users.impersonate`)

### Users
- `GET /api/users` - List (search, filter by role/status, paginate) (`users.view`)
- `GET /api/users/count` - Count (`users.view`)
- `GET /api/users/:id` - Get one (`users.view`)
- `POST /api/users` - Create (`users.create`)
- `PUT /api/users/:id` - Update, including role (`users.update`)
- `DELETE /api/users/:id` - Delete (`users.delete`)

### Roles
- `GET /api/roles` - List with user/permission counts (`roles.view` or `users.view`)
- `GET /api/roles/count` - Count (`roles.view` or `users.view`)
- `GET /api/roles/:id` - Get one with its permission keys (`roles.view` or `users.view`)
- `POST /api/roles` - Create a role (`roles.create`)
- `PUT /api/roles/:id` - Update name/display name/description (`roles.update`)
- `PUT /api/roles/:id/permissions` - Replace a role's permission list (`roles.update`)
- `DELETE /api/roles/:id` - Delete an unused custom role (`roles.delete`)

### Permissions
- `GET /api/permissions` - Permission catalog grouped by module (`roles.view` or `users.view`)

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
