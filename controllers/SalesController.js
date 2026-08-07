import SalesModel from '../models/Sale.js';

const SalesController = {
  getAll(req, res) {
    try {
      const { search, payment_status, client_id, start_date, end_date, page, limit } = req.query;
      const result = SalesModel.findAll({
        search, payment_status, client_id: client_id ? parseInt(client_id) : null,
        start_date, end_date, page: parseInt(page) || 1, limit: parseInt(limit) || 20
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch sales' });
    }
  },

  getById(req, res) {
    try {
      const sale = SalesModel.findById(req.params.id);
      if (!sale) return res.status(404).json({ error: 'Sale not found' });
      res.json(sale);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch sale' });
    }
  },

  create(req, res) {
    try {
      if (!req.body.items || !req.body.items.length) {
        return res.status(400).json({ error: 'At least one item is required' });
      }
      req.body.created_by = req.user.id;
      const sale = SalesModel.create(req.body);
      res.status(201).json(sale);
    } catch (err) {
      res.status(400).json({ error: 'Failed to create sale: ' + err.message });
    }
  },

  getStats(req, res) {
    try {
      const { start_date, end_date } = req.query;
      res.json(SalesModel.getStats({ start_date, end_date }));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch sales stats' });
    }
  },

  getMonthlyRevenue(req, res) {
    try {
      const { year } = req.query;
      res.json(SalesModel.getMonthlyRevenue(year));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch monthly revenue' });
    }
  },

  getTopProducts(req, res) {
    try {
      const { limit } = req.query;
      res.json(SalesModel.getTopProducts(parseInt(limit) || 5));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch top products' });
    }
  }
};

export default SalesController;
