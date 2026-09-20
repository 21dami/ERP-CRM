import db from '../config/database.js';

const SalesModel = {
  findAll({ search, payment_status, client_id, start_date, end_date, page = 1, limit = 20, sort, order } = {}) {
    let query = `SELECT s.*, c.name as client_name, u.full_name as sold_by
                 FROM sales s LEFT JOIN clients c ON s.client_id = c.id
                 LEFT JOIN users u ON s.created_by = u.id WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) as total FROM sales WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const s = `%${search}%`;
      query += ' AND (s.sale_number LIKE ? OR c.name LIKE ?)';
      countQuery += ' AND sale_number LIKE ?';
      params.push(s, s);
      countParams.push(s);
    }
    if (payment_status) {
      query += ' AND s.payment_status = ?';
      countQuery += ' AND payment_status = ?';
      params.push(payment_status);
      countParams.push(payment_status);
    }
    if (client_id) {
      query += ' AND s.client_id = ?';
      countQuery += ' AND client_id = ?';
      params.push(client_id);
      countParams.push(client_id);
    }
    if (start_date) {
      query += ' AND s.sale_date >= ?';
      countQuery += ' AND sale_date >= ?';
      params.push(start_date);
      countParams.push(start_date);
    }
    if (end_date) {
      query += ' AND s.sale_date <= ?';
      countQuery += ' AND sale_date <= ?';
      params.push(end_date);
      countParams.push(end_date);
    }

    const total = db.prepare(countQuery).get(...countParams).total;
    const offset = (page - 1) * limit;

    const sortCols = { sale_number: 's.sale_number', client_name: 'c.name', sale_date: 's.sale_date', total: 's.total', payment_method: 's.payment_method', payment_status: 's.payment_status', sold_by: 'u.full_name', created_at: 's.created_at' };
    const sortCol = sortCols[sort] || 's.created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    const sale = db.prepare(`SELECT s.*, c.name as client_name, u.full_name as sold_by
      FROM sales s LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON s.created_by = u.id WHERE s.id = ?`).get(id);
    if (sale) {
      sale.items = db.prepare(`SELECT si.*, p.name as product_name, p.sku
        FROM sale_items si JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?`).all(id);
    }
    return sale;
  },

  generateSaleNumber() {
    const count = db.prepare("SELECT COUNT(*) as c FROM sales WHERE sale_number LIKE 'SAL-%'").get().c;
    return `SAL-${String(count + 1).padStart(6, '0')}`;
  },

  create(data) {
    const saleNumber = this.generateSaleNumber();
    const r = db.prepare(`
      INSERT INTO sales (sale_number, order_id, client_id, subtotal, tax_amount, discount, total, payment_method, payment_status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      saleNumber, data.order_id || null, data.client_id || null,
      data.subtotal || 0, data.tax_amount || 0, data.discount || 0,
      data.total || 0, data.payment_method || 'cash',
      data.payment_status || 'paid', data.notes || null, data.created_by || null
    );

    if (data.items && data.items.length) {
      for (const item of data.items) {
        db.prepare(`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, tax_rate, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(r.lastInsertRowid, item.product_id, item.quantity, item.unit_price, item.tax_rate || 0, item.discount || 0, item.total);
        const stockResult = db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?').run(item.quantity, item.product_id, item.quantity);
        if (stockResult.changes === 0) {
          throw new Error(`Insufficient stock for product ID ${item.product_id}`);
        }
      }
    }

    return this.findById(r.lastInsertRowid);
  },

  getStats({ start_date, end_date } = {}) {
    let dateFilter = '';
    const params = [];
    if (start_date) { dateFilter += ' AND sale_date >= ?'; params.push(start_date); }
    if (end_date) { dateFilter += ' AND sale_date <= ?'; params.push(end_date); }

    const today = db.prepare(`SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM sales WHERE DATE(sale_date) = DATE('now') ${dateFilter}`).get(...params);
    const thisMonth = db.prepare(`SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM sales WHERE strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now') ${dateFilter}`).get(...params);
    const thisYear = db.prepare(`SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM sales WHERE strftime('%Y', sale_date) = strftime('%Y', 'now') ${dateFilter}`).get(...params);
    const total = db.prepare(`SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE 1=1 ${dateFilter}`).get(...params);

    return { today, thisMonth, thisYear, total };
  },

  getMonthlyRevenue(year) {
    return db.prepare(`SELECT strftime('%m', sale_date) as month,
      COALESCE(SUM(total), 0) as revenue, COUNT(*) as count
      FROM sales WHERE strftime('%Y', sale_date) = ?
      GROUP BY strftime('%m', sale_date) ORDER BY month`).all(year || new Date().getFullYear());
  },

  getTopProducts(limit = 5) {
    return db.prepare(`SELECT p.name, p.sku, SUM(si.quantity) as total_sold, SUM(si.total) as total_revenue
      FROM sale_items si JOIN products p ON si.product_id = p.id
      GROUP BY si.product_id ORDER BY total_revenue DESC LIMIT ?`).all(limit);
  },

  count() {
    return db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
  }
};

export default SalesModel;
