import db from '../config/database.js';
import InventoryModel from './Inventory.js';
import SalesModel from './Sale.js';

const REVENUE_STATUSES = ['paid', 'partial'];
// Fulfillment stages that mean the order is confirmed. Orders may skip straight
// to processing/shipped/delivered, so every stage from confirmed onwards counts.
const ACTIVE_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];
// sales.payment_status has its own CHECK constraint ('pending','paid','partial','refunded')
const SALE_PAYMENT_MAP = { unpaid: 'pending', partial: 'partial', paid: 'paid', refunded: 'refunded' };

const round2 = n => Math.round((Number(n) || 0) * 100) / 100;

// Activated = stock committed and revenue recognized. Triggers on either
// fulfillment status (confirmed or any later stage) or payment (paid/partial).
function isActivated(order) {
  if (order.status === 'cancelled') return false;
  return ACTIVE_STATUSES.includes(order.status) || REVENUE_STATUSES.includes(order.payment_status);
}

// Stock leaves inventory while activated, except when refunded (goods returned)
function stockActive(order) {
  return isActivated(order) && order.payment_status !== 'refunded';
}

// 'active' = counts as revenue, 'refunded' = kept but excluded from revenue, 'none' = no sale row
function saleState(order) {
  if (order.status === 'cancelled') return 'none';
  if (order.payment_status === 'refunded') return 'refunded';
  return isActivated(order) ? 'active' : 'none';
}

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
    const rows = db.prepare("SELECT order_number FROM orders WHERE order_number LIKE 'ORD-%'").all();
    let max = 0;
    for (const r of rows) {
      const m = /ORD-(\d+)$/.exec(r.order_number);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `ORD-${String(max + 1).padStart(6, '0')}`;
  },

  computeTotals(items, discount) {
    let subtotal = 0;
    let taxAmount = 0;
    for (const item of items) {
      const line = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
      subtotal += line;
      taxAmount += line * (Number(item.tax_rate) || 0) / 100;
    }
    subtotal = round2(subtotal);
    taxAmount = round2(taxAmount);
    const total = Math.max(0, round2(subtotal + taxAmount - (Number(discount) || 0)));
    return { subtotal, tax_amount: taxAmount, total };
  },

  enrichItems(items = []) {
    return items
      .filter(i => i.product_id && Number(i.quantity) > 0)
      .map(i => {
        const product = db.prepare('SELECT tax_rate FROM products WHERE id = ?').get(i.product_id);
        return {
          product_id: i.product_id,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price) || 0,
          tax_rate: product ? (Number(product.tax_rate) || 0) : (Number(i.tax_rate) || 0),
          total: round2((Number(i.unit_price) || 0) * Number(i.quantity))
        };
      });
  },

  assertStockAvailable(items = []) {
    for (const item of items) {
      const inv = InventoryModel.findByProduct(item.product_id);
      const available = inv ? inv.quantity : 0;
      if (available < item.quantity) {
        const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id);
        throw new Error(`Insufficient stock for ${product ? product.name : 'product ID ' + item.product_id} (available: ${available}, requested: ${item.quantity})`);
      }
    }
  },

  applyStock(items = [], direction) {
    for (const item of items) {
      if (direction === 'deduct') {
        InventoryModel.deductStock(item.product_id, item.quantity);
      } else {
        const inv = InventoryModel.findByProduct(item.product_id);
        if (inv) InventoryModel.adjustStock(item.product_id, item.quantity);
        else InventoryModel.updateQuantity(item.product_id, item.quantity);
      }
    }
  },

  // Keeps the sales table (the single source of revenue) in sync with the order
  syncSale(order) {
    const state = saleState(order);
    const existing = db.prepare('SELECT id FROM sales WHERE order_id = ?').get(order.id);

    if (state === 'none') {
      if (existing) {
        db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(existing.id);
        db.prepare('DELETE FROM sales WHERE id = ?').run(existing.id);
      }
      return;
    }

    const paymentStatus = state === 'refunded' ? 'refunded' : (SALE_PAYMENT_MAP[order.payment_status] || 'pending');
    const items = order.items || [];

    if (existing) {
      db.prepare(`UPDATE sales SET subtotal = ?, tax_amount = ?, discount = ?, total = ?,
        payment_status = ?, payment_method = ?, client_id = ? WHERE id = ?`)
        .run(order.subtotal, order.tax_amount, order.discount, order.total,
          paymentStatus, order.payment_method || 'cash', order.client_id, existing.id);
    } else {
      const r = db.prepare(`INSERT INTO sales (sale_number, order_id, client_id, subtotal, tax_amount, discount, total, payment_method, payment_status, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        SalesModel.generateSaleNumber(), order.id, order.client_id,
        order.subtotal, order.tax_amount, order.discount, order.total,
        order.payment_method || 'cash', paymentStatus, order.notes, order.created_by
      );
      for (const item of items) {
        db.prepare(`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, tax_rate, discount, total)
          VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
          r.lastInsertRowid, item.product_id, item.quantity, item.unit_price,
          item.tax_rate || 0, item.discount || 0, item.total
        );
      }
    }
  },

  create(data) {
    const items = this.enrichItems(data.items);
    if (!items.length) throw new Error('Order must contain at least one item');

    const totals = this.computeTotals(items, data.discount);
    this.assertStockAvailable(items);

    const status = data.status || 'pending';
    const paymentStatus = data.payment_status || 'unpaid';
    const deductNow = stockActive({ status, payment_status: paymentStatus });

    const orderNumber = this.generateOrderNumber();
    const r = db.prepare(`
      INSERT INTO orders (order_number, client_id, due_date, status, subtotal, tax_amount, discount, total, payment_status, payment_method, shipping_address, notes, stock_deducted, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber, data.client_id, data.due_date || null,
      status, totals.subtotal, totals.tax_amount,
      round2(data.discount || 0), totals.total,
      paymentStatus, data.payment_method || null, data.shipping_address || null,
      data.notes || null, deductNow ? 1 : 0, data.created_by || null
    );

    for (const item of items) {
      db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, tax_rate, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(r.lastInsertRowid, item.product_id, item.quantity, item.unit_price, item.tax_rate, 0, item.total);
    }

    if (deductNow) this.applyStock(items, 'deduct');
    const order = this.findById(r.lastInsertRowid);
    this.syncSale(order);
    return order;
  },

  update(id, data) {
    const existing = this.findById(id);
    if (!existing) throw new Error('Order not found');

    const allowed = ['client_id','due_date','status','subtotal','tax_amount','discount','total','payment_status','payment_method','shipping_address','notes'];
    const patch = {};
    for (const key of allowed) if (data[key] !== undefined) patch[key] = data[key];

    // Recalculate money fields server-side whenever any of them is sent
    if (['subtotal', 'tax_amount', 'discount', 'total'].some(k => patch[k] !== undefined)) {
      const items = existing.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, tax_rate: i.tax_rate, total: i.total }));
      const totals = this.computeTotals(items, patch.discount !== undefined ? patch.discount : existing.discount);
      patch.subtotal = totals.subtotal;
      patch.tax_amount = totals.tax_amount;
      patch.total = totals.total;
    }

    const merged = { ...existing, ...patch };
    const wantStock = stockActive(merged);
    const hasDeducted = !!existing.stock_deducted;
    const items = existing.items;

    if (wantStock && !hasDeducted) this.assertStockAvailable(items);

    const fields = [];
    const values = [];
    for (const key of Object.keys(patch)) {
      fields.push(`${key} = ?`);
      values.push(patch[key]);
    }
    if (fields.length === 0) return existing;

    if (wantStock !== hasDeducted) {
      fields.push('stock_deducted = ?');
      values.push(wantStock ? 1 : 0);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = this.findById(id);
    if (wantStock && !hasDeducted) this.applyStock(items, 'deduct');
    else if (!wantStock && hasDeducted) this.applyStock(items, 'restore');
    this.syncSale(updated);
    return updated;
  },

  delete(id) {
    const existing = this.findById(id);
    if (existing) {
      if (existing.stock_deducted) this.applyStock(existing.items, 'restore');
      this.syncSale({ ...existing, status: 'cancelled', payment_status: 'unpaid' });
    }
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
