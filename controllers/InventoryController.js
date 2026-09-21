import InventoryModel from '../models/Inventory.js';

const InventoryController = {
  getAll(req, res) {
    try {
      const { search, low_stock, page, limit, sort, order } = req.query;
      const result = InventoryModel.findAll({
        search, low_stock: low_stock === 'true', page: parseInt(page) || 1, limit: parseInt(limit) || 20, sort, order
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  },

  getByProduct(req, res) {
    try {
      const item = InventoryModel.findByProduct(req.params.productId);
      if (!item) return res.status(404).json({ error: 'Inventory item not found' });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
  },

  adjustStock(req, res) {
    try {
      const { product_id, adjustment, reason } = req.body;
      if (!product_id || adjustment === undefined) {
        return res.status(400).json({ error: 'Product ID and adjustment are required' });
      }
      const item = InventoryModel.adjustStock(product_id, adjustment);
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  updateQuantity(req, res) {
    try {
      const { product_id, quantity, warehouse_location } = req.body;
      if (!product_id || quantity === undefined) {
        return res.status(400).json({ error: 'Product ID and quantity are required' });
      }
      InventoryModel.updateQuantity(product_id, quantity, warehouse_location);
      res.json(InventoryModel.findByProduct(product_id));
    } catch (err) {
      res.status(500).json({ error: 'Failed to update quantity' });
    }
  },

  getLowStock(req, res) {
    try {
      res.json(InventoryModel.getLowStock());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
  },

  getLocations(req, res) {
    try {
      res.json(InventoryModel.getLocations());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch warehouse locations' });
    }
  },

  getStats(req, res) {
    try {
      res.json(InventoryModel.getStats());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch inventory stats' });
    }
  }
};

export default InventoryController;
