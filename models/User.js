import db from '../config/database.js';

const UserModel = {
  findAll({ search, status, role, page = 1, limit = 20 } = {}) {
    let query = 'SELECT id, username, full_name, email, role, status, created_at, updated_at FROM users WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const s = `%${search}%`;
      query += ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)';
      countQuery += ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)';
      params.push(s, s, s);
      countParams.push(s, s, s);
    }
    if (status) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }
    if (role) {
      query += ' AND role = ?';
      countQuery += ' AND role = ?';
      params.push(role);
      countParams.push(role);
    }

    const total = db.prepare(countQuery).get(...countParams).total;
    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    return db.prepare('SELECT id, username, full_name, email, role, status, created_at, updated_at FROM users WHERE id = ?').get(id);
  },

  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO users (username, password, full_name, email, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.username, data.password, data.full_name,
      data.email || null, data.role, data.status || 'active'
    );
    return this.findById(result.lastInsertRowid);
  },

  update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['username', 'full_name', 'email', 'role', 'status', 'password'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  count() {
    return db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  }
};

export default UserModel;
