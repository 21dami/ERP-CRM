import db from '../config/database.js';

const ProductModel = {
  findAll({ search, category, status, page = 1, limit = 20 } = {}) {
    let query = `SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity
                 FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const s = `%${search}%`;
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
      countQuery += ' AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)';
      params.push(s, s, s);
      countParams.push(s, s, s);
    }
    if (category) {
      query += ' AND p.category = ?';
      countQuery += ' AND category = ?';
      params.push(category);
      countParams.push(category);
    }
    if (status) {
      query += ' AND p.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    const total = db.prepare(countQuery).get(...countParams).total;
    const offset = (page - 1) * limit;
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    return db.prepare(`SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity,
                       i.warehouse_location, i.last_restocked
                       FROM products p LEFT JOIN inventory i ON p.id = i.product_id
                       WHERE p.id = ?`).get(id);
  },

  findBySku(sku) {
    return db.prepare('SELECT * FROM products WHERE sku = ?').get(sku);
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO products (sku, name, description, category, unit_price, cost_price, tax_rate, unit, min_stock, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.sku, data.name, data.description || null, data.category || null,
      data.unit_price || 0, data.cost_price || 0, data.tax_rate || 0,
      data.unit || 'pcs', data.min_stock || 0, data.status || 'active'
    );
    return this.findById(result.lastInsertRowid);
  },

  update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['sku','name','description','category','unit_price','cost_price','tax_rate','unit','min_stock','status'];
    
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM products WHERE id = ?').run(id);
  },

  getCategories() {
    return db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all().map(r => r.category);
  },

  count() {
    return db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  },

  getLowStock() {
    return db.prepare(`SELECT p.*, i.quantity as stock_quantity FROM products p
      JOIN inventory i ON p.id = i.product_id WHERE i.quantity <= p.min_stock AND p.status = 'active'
      ORDER BY i.quantity ASC`).all();
  }
};

export default ProductModel;
