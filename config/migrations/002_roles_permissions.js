export const up = `
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL,
  permission_key TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_key),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

PRAGMA legacy_alter_table = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE users_without_role_check (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users_without_role_check (id, username, password, full_name, email, role, status, created_at, updated_at)
  SELECT id, username, password, full_name, email, role, status, created_at, updated_at FROM users;

DROP TABLE users;
ALTER TABLE users_without_role_check RENAME TO users;

PRAGMA foreign_keys = ON;
PRAGMA legacy_alter_table = OFF;
`;

export const down = `
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;
`;
