import db from '../config/database.js';

const RoleModel = {
  findAll({ search, page = 1, limit = 20, sort, order } = {}) {
    let query = `
      SELECT r.id, r.name, r.display_name, r.description, r.is_system, r.created_at, r.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.role = r.name) as user_count,
        (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) as permission_count
      FROM roles r WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) as total FROM roles r WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const s = `%${search}%`;
      const clause = ' AND (r.name LIKE ? OR r.display_name LIKE ? OR r.description LIKE ?)';
      query += clause;
      countQuery += clause;
      params.push(s, s, s);
      countParams.push(s, s, s);
    }

    const total = db.prepare(countQuery).get(...countParams).total;
    const offset = (page - 1) * limit;

    const sortCols = {
      name: 'r.name',
      display_name: 'r.display_name',
      is_system: 'r.is_system',
      user_count: 'user_count',
      permission_count: 'permission_count',
      created_at: 'r.created_at'
    };
    const sortCol = sortCols[sort] || 'r.created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    return db.prepare(`
      SELECT r.id, r.name, r.display_name, r.description, r.is_system, r.created_at, r.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.role = r.name) as user_count,
        (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) as permission_count
      FROM roles r WHERE r.id = ?`).get(id);
  },

  findByName(name) {
    return db.prepare('SELECT * FROM roles WHERE name = ?').get(name);
  },

  count() {
    return db.prepare('SELECT COUNT(*) as count FROM roles').get().count;
  },

  countUsers(name) {
    return db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(name).count;
  },

  create({ name, display_name, description, permissions = [] }) {
    const result = db.prepare(`
      INSERT INTO roles (name, display_name, description, is_system)
      VALUES (?, ?, ?, 0)
    `).run(name, display_name, description || '');

    const role = this.findById(result.lastInsertRowid);
    this.setPermissions(role.id, permissions);
    return this.findById(role.id);
  },

  update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['name', 'display_name', 'description'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  renameUsers(oldName, newName) {
    return db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE role = ?').run(newName, oldName);
  },

  delete(id) {
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id);
    return db.prepare('DELETE FROM roles WHERE id = ?').run(id);
  },

  getPermissions(roleId) {
    return db.prepare('SELECT permission_key FROM role_permissions WHERE role_id = ?')
      .all(roleId)
      .map(row => row.permission_key);
  },

  setPermissions(roleId, keys) {
    const id = Number(roleId);
    const statements = [`DELETE FROM role_permissions WHERE role_id = ${id};`];
    for (const key of keys) {
      const safeKey = String(key).replace(/'/g, "''");
      statements.push(`INSERT OR IGNORE INTO role_permissions (role_id, permission_key) VALUES (${id}, '${safeKey}');`);
    }
    db.exec(statements.join('\n'));
    return this.getPermissions(id);
  },

  getPermissionsForRoleName(roleName) {
    if (!roleName) return [];
    return db.prepare(`
      SELECT rp.permission_key
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      WHERE r.name = ?
    `).all(roleName).map(row => row.permission_key);
  }
};

export default RoleModel;
