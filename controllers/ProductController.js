import ProductModel from '../models/Product.js';
import InventoryModel from '../models/Inventory.js';

const ProductController = {
  getAll(req, res) {
    try {
      const { search, category, status, page, limit, sort, order } = req.query;
      const result = ProductModel.findAll({
        search, category, status, page: parseInt(page) || 1, limit: parseInt(limit) || 20, sort, order
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  },

  getById(req, res) {
    try {
      const product = ProductModel.findById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  },

  create(req, res) {
    try {
      if (!req.body.name || !req.body.sku) {
        return res.status(400).json({ error: 'Name and SKU are required' });
      }
      const existing = ProductModel.findBySku(req.body.sku);
      if (existing) return res.status(400).json({ error: 'SKU already exists' });

      const product = ProductModel.create(req.body);
      InventoryModel.updateQuantity(product.id, req.body.stock_quantity || 0, req.body.warehouse_location);
      res.status(201).json(ProductModel.findById(product.id));
    } catch (err) {
      res.status(500).json({ error: 'Failed to create product' });
    }
  },

  update(req, res) {
    try {
      const existing = ProductModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Product not found' });

      if (req.body.sku && req.body.sku !== existing.sku) {
        const skuCheck = ProductModel.findBySku(req.body.sku);
        if (skuCheck) return res.status(400).json({ error: 'SKU already exists' });
      }

      const product = ProductModel.update(req.params.id, req.body);
      if (req.body.stock_quantity !== undefined) {
        InventoryModel.updateQuantity(req.params.id, req.body.stock_quantity, req.body.warehouse_location);
      }
      res.json(ProductModel.findById(req.params.id));
    } catch (err) {
      res.status(500).json({ error: 'Failed to update product' });
    }
  },

  delete(req, res) {
    try {
      const existing = ProductModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Product not found' });
      ProductModel.delete(req.params.id);
      res.json({ message: 'Product deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  },

  getCategories(req, res) {
    try {
      res.json(ProductModel.getCategories());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  },

  getUnits(req, res) {
    try {
      res.json(ProductModel.getUnits());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch units' });
    }
  },

  getLowStock(req, res) {
    try {
      res.json(ProductModel.getLowStock());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch low stock products' });
    }
  }
};

export default ProductController;
