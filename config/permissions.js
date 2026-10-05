export const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_]{1,30}$/;

export const PERMISSION_GROUPS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'fa-tachometer-alt',
    permissions: [
      { key: 'dashboard.view', label: 'View dashboard' }
    ]
  },
  {
    key: 'clients',
    label: 'Clients',
    icon: 'fa-users',
    permissions: [
      { key: 'clients.view', label: 'View clients' },
      { key: 'clients.create', label: 'Create clients' },
      { key: 'clients.update', label: 'Edit clients' },
      { key: 'clients.delete', label: 'Delete clients' }
    ]
  },
  {
    key: 'products',
    label: 'Products',
    icon: 'fa-box',
    permissions: [
      { key: 'products.view', label: 'View products' },
      { key: 'products.create', label: 'Create products' },
      { key: 'products.update', label: 'Edit products' },
      { key: 'products.delete', label: 'Delete products' }
    ]
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: 'fa-shopping-cart',
    permissions: [
      { key: 'orders.view', label: 'View orders' },
      { key: 'orders.create', label: 'Create orders' },
      { key: 'orders.update', label: 'Edit orders' },
      { key: 'orders.update_status', label: 'Update order status' },
      { key: 'orders.delete', label: 'Delete orders' }
    ]
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: 'fa-warehouse',
    permissions: [
      { key: 'inventory.view', label: 'View inventory' },
      { key: 'inventory.update', label: 'Adjust stock levels' }
    ]
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: 'fa-dollar-sign',
    permissions: [
      { key: 'sales.view', label: 'View sales' },
      { key: 'sales.create', label: 'Record sales' },
      { key: 'sales.refund', label: 'Refund sales' },
      { key: 'sales.delete', label: 'Delete sales' }
    ]
  },
  {
    key: 'employees',
    label: 'Employees',
    icon: 'fa-user-tie',
    permissions: [
      { key: 'employees.view', label: 'View employees' },
      { key: 'employees.create', label: 'Add employees' },
      { key: 'employees.update', label: 'Edit employees' },
      { key: 'employees.delete', label: 'Delete employees' }
    ]
  },
  {
    key: 'users',
    label: 'Users',
    icon: 'fa-user-cog',
    permissions: [
      { key: 'users.view', label: 'View users' },
      { key: 'users.create', label: 'Create users' },
      { key: 'users.update', label: 'Edit users' },
      { key: 'users.delete', label: 'Delete users' },
      { key: 'users.impersonate', label: 'Impersonate users' }
    ]
  },
  {
    key: 'roles',
    label: 'Roles & Permissions',
    icon: 'fa-user-shield',
    permissions: [
      { key: 'roles.view', label: 'View roles' },
      { key: 'roles.create', label: 'Create roles' },
      { key: 'roles.update', label: 'Edit roles & permissions' },
      { key: 'roles.delete', label: 'Delete roles' }
    ]
  }
];

export const PERMISSIONS = PERMISSION_GROUPS.flatMap(group =>
  group.permissions.map(permission => ({ ...permission, group: group.key }))
);

export const PERMISSION_KEYS = PERMISSIONS.map(permission => permission.key);

export const NAV_PAGES = PERMISSION_GROUPS.map(group => group.key);

const ALL_PERMISSIONS = [...PERMISSION_KEYS];

export const DEFAULT_ROLES = [
  { name: 'admin', display_name: 'Admin', description: 'Full access to every section and setting' },
  { name: 'sales', display_name: 'Sales', description: 'Manages clients, orders and sales' },
  { name: 'hr', display_name: 'HR', description: 'Manages employees and HR records' },
  { name: 'accounting', display_name: 'Accounting', description: 'Reviews orders, sales and revenue' },
  { name: 'warehouse', display_name: 'Warehouse', description: 'Manages products, stock and order fulfillment' }
];

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  sales: [
    'dashboard.view',
    'clients.view', 'clients.create', 'clients.update',
    'products.view',
    'orders.view', 'orders.create', 'orders.update',
    'sales.view', 'sales.create', 'sales.refund', 'sales.delete'
  ],
  hr: [
    'dashboard.view',
    'employees.view', 'employees.create', 'employees.update', 'employees.delete'
  ],
  accounting: [
    'dashboard.view',
    'clients.view', 'products.view',
    'orders.view',
    'sales.view', 'sales.create'
  ],
  warehouse: [
    'dashboard.view',
    'products.view', 'products.create', 'products.update',
    'inventory.view', 'inventory.update',
    'orders.view', 'orders.update_status'
  ]
};

export const PROTECTED_OWN_ROLE_PERMISSIONS = ['roles.view', 'roles.update'];

export function isValidPermissionKeys(keys) {
  return Array.isArray(keys) && keys.every(key => PERMISSION_KEYS.includes(key));
}
