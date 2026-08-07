import db from '../config/database.js';

const ClientModel = {
  findAll({ search, status, page = 1, limit = 20 } = {}) {
    let query = 'SELECT * FROM clients WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM clients WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const s = `%${search}%`;
      query += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)';
      countQuery += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(s, s, s, s);
      countParams.push(s, s, s, s);
    }
    if (status) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    const total = db.prepare(countQuery).get(...countParams).total;
    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO clients (name, company, email, phone, address, city, state, zip_code, country, tax_id, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.name, data.company || null, data.email || null, data.phone || null,
      data.address || null, data.city || null, data.state || null, data.zip_code || null,
      data.country || 'USA', data.tax_id || null, data.notes || null, data.status || 'active'
    );
    return this.findById(result.lastInsertRowid);
  },

  update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['name','company','email','phone','address','city','state','zip_code','country','tax_id','notes','status'];
    
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  },

  count() {
    return db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  }
};

export default ClientModel;
