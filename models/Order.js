import db from '../config/database.js';

const OrderModel = {
  findAll({ search, status, payment_status, client_id, page = 1, limit = 20, sort, order } = {}) {
    let query = `SELECT o.*, c.name as client_name FROM orders o
                 LEFT JOIN clients c ON o.client_id = c.id WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const s = `%${search}%`;
      query += ' AND (o.order_number LIKE ? OR c.name LIKE ?)';
      countQuery += ' AND order_number LIKE ?';
      params.push(s, s);
      countParams.push(s);
    }
    if (status) {
      query += ' AND o.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }
    if (payment_status) {
      query += ' AND o.payment_status = ?';
      countQuery += ' AND payment_status = ?';
      params.push(payment_status);
      countParams.push(payment_status);
    }
    if (client_id) {
      query += ' AND o.client_id = ?';
      countQuery += ' AND client_id = ?';
      params.push(client_id);
      countParams.push(client_id);
    }

    const total = db.prepare(countQuery).get(...countParams).total;
    const offset = (page - 1) * limit;

    const sortCols = { order_number: 'o.order_number', client_name: 'c.name', order_date: 'o.order_date', total: 'o.total', status: 'o.status', payment_status: 'o.payment_status', due_date: 'o.due_date', created_at: 'o.created_at' };
    const sortCol = sortCols[sort] || 'o.created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    const order = db.prepare(`SELECT o.*, c.name as client_name, c.email as client_email,
      c.phone as client_phone FROM orders o LEFT JOIN clients c ON o.client_id = c.id
      WHERE o.id = ?`).get(id);
    if (order) {
      order.items = db.prepare(`SELECT oi.*, p.name as product_name, p.sku
        FROM order_items oi JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?`).all(id);
    }
    return order;
  },

  generateOrderNumber() {
    const count = db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_number LIKE 'ORD-%'").get().c;
    return `ORD-${String(count + 1).padStart(6, '0')}`;
  },

  create(data) {
    const orderNumber = this.generateOrderNumber();
    const r = db.prepare(`
      INSERT INTO orders (order_number, client_id, due_date, status, subtotal, tax_amount, discount, total, payment_status, payment_method, shipping_address, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber, data.client_id, data.due_date || null,
      data.status || 'pending', data.subtotal || 0, data.tax_amount || 0,
      data.discount || 0, data.total || 0, data.payment_status || 'unpaid',
      data.payment_method || null, data.shipping_address || null,
      data.notes || null, data.created_by || null
    );
    if (data.items && data.items.length) {
      for (const item of data.items) {
        db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, tax_rate, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(r.lastInsertRowid, item.product_id, item.quantity, item.unit_price, item.tax_rate || 0, item.discount || 0, item.total);
      }
    }
    return this.findById(r.lastInsertRowid);
  },

  update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['client_id','due_date','status','subtotal','tax_amount','discount','total','payment_status','payment_method','shipping_address','notes'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  },

  count() {
    return db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  },

  getRecent(limit = 5) {
    return db.prepare(`SELECT o.*, c.name as client_name FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id ORDER BY o.created_at DESC LIMIT ?`).all(limit);
  }
};

export default OrderModel;
