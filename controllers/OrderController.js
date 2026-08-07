import OrderModel from '../models/Order.js';

const OrderController = {
  getAll(req, res) {
    try {
      const { search, status, payment_status, client_id, page, limit } = req.query;
      const result = OrderModel.findAll({
        search, status, payment_status, client_id: client_id ? parseInt(client_id) : null,
        page: parseInt(page) || 1, limit: parseInt(limit) || 20
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  },

  getById(req, res) {
    try {
      const order = OrderModel.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  },

  create(req, res) {
    try {
      if (!req.body.client_id) return res.status(400).json({ error: 'Client is required' });
      req.body.created_by = req.user.id;
      const order = OrderModel.create(req.body);
      res.status(201).json(order);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create order: ' + err.message });
    }
  },

  update(req, res) {
    try {
      const existing = OrderModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Order not found' });
      const order = OrderModel.update(req.params.id, req.body);
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update order' });
    }
  },

  updateStatus(req, res) {
    try {
      const existing = OrderModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Order not found' });
      if (!req.body.status) return res.status(400).json({ error: 'Status is required' });
      const order = OrderModel.update(req.params.id, { status: req.body.status });
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  },

  delete(req, res) {
    try {
      const existing = OrderModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Order not found' });
      OrderModel.delete(req.params.id);
      res.json({ message: 'Order deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete order' });
    }
  }
};

export default OrderController;
