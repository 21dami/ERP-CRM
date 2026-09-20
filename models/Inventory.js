import db from '../config/database.js';

const InventoryModel = {
  findAll({ search, low_stock, page = 1, limit = 20, sort, order } = {}) {
    let query = `SELECT i.*, p.name as product_name, p.sku, p.unit, p.min_stock, p.unit_price
                 FROM inventory i JOIN products p ON i.product_id = p.id WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM inventory i JOIN products p ON i.product_id = p.id WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      const s = `%${search}%`;
      query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      countQuery += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      params.push(s, s);
      countParams.push(s, s);
    }
    if (low_stock) {
      query += ' AND i.quantity <= p.min_stock';
      countQuery += ' AND i.quantity <= p.min_stock';
    }

    const total = db.prepare(countQuery).get(...countParams).total;
    const offset = (page - 1) * limit;

    const sortCols = { sku: 'p.sku', product_name: 'p.name', quantity: 'i.quantity', reserved: 'i.reserved', min_stock: 'p.min_stock', warehouse_location: 'i.warehouse_location', last_restocked: 'i.last_restocked', updated_at: 'i.updated_at' };
    const sortCol = sortCols[sort] || 'i.updated_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findByProduct(productId) {
    return db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(productId);
  },

  updateQuantity(productId, quantity, location) {
    const existing = this.findByProduct(productId);
    if (existing) {
      const fields = ['quantity = ?', 'updated_at = CURRENT_TIMESTAMP'];
      const values = [quantity];
      if (location !== undefined) {
        fields.push('warehouse_location = ?');
        values.push(location);
      }
      values.push(productId);
      db.prepare(`UPDATE inventory SET ${fields.join(', ')} WHERE product_id = ?`).run(...values);
    } else {
      db.prepare('INSERT INTO inventory (product_id, quantity, warehouse_location) VALUES (?, ?, ?)').run(productId, quantity, location || null);
    }
  },

  adjustStock(productId, adjustment, reason) {
    const inv = this.findByProduct(productId);
    if (!inv) throw new Error('Product not found in inventory');
    const newQty = inv.quantity + adjustment;
    if (newQty < 0) throw new Error('Insufficient stock');
    db.prepare('UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?').run(newQty, productId);
    return this.findByProduct(productId);
  },

  reserveStock(productId, quantity) {
    const inv = this.findByProduct(productId);
    if (!inv) throw new Error('Product not found');
    const available = inv.quantity - inv.reserved;
    if (available < quantity) throw new Error('Insufficient available stock');
    db.prepare('UPDATE inventory SET reserved = reserved + ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?').run(quantity, productId);
    return this.findByProduct(productId);
  },

  releaseStock(productId, quantity) {
    db.prepare('UPDATE inventory SET reserved = MAX(0, reserved - ?), updated_at = CURRENT_TIMESTAMP WHERE product_id = ?').run(quantity, productId);
  },

  deductStock(productId, quantity) {
    const inv = this.findByProduct(productId);
    if (!inv) throw new Error('Product not found');
    if (inv.quantity < quantity) throw new Error('Insufficient stock');
    db.prepare('UPDATE inventory SET quantity = quantity - ?, reserved = MAX(0, reserved - ?), updated_at = CURRENT_TIMESTAMP WHERE product_id = ?').run(quantity, quantity, productId);
    return this.findByProduct(productId);
  },

  getLowStock() {
    return db.prepare(`SELECT i.*, p.name as product_name, p.sku, p.min_stock
      FROM inventory i JOIN products p ON i.product_id = p.id
      WHERE i.quantity <= p.min_stock AND p.status = 'active'
      ORDER BY (i.quantity * 1.0 / p.min_stock) ASC`).all();
  },

  getStats() {
    const total = db.prepare('SELECT SUM(quantity) as total FROM inventory').get().total || 0;
    const totalValue = db.prepare('SELECT SUM(i.quantity * p.unit_price) as value FROM inventory i JOIN products p ON i.product_id = p.id').get().value || 0;
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.quantity <= p.min_stock').get().count;
    const outOfStock = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity = 0').get().count;
    return { total, totalValue, lowStock, outOfStock };
  }
};

export default InventoryModel;
