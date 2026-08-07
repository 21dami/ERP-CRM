import ClientModel from '../models/Client.js';

const ClientController = {
  getAll(req, res) {
    try {
      const { search, status, page, limit } = req.query;
      const result = ClientModel.findAll({
        search, status, page: parseInt(page) || 1, limit: parseInt(limit) || 20
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  },

  getById(req, res) {
    try {
      const client = ClientModel.findById(req.params.id);
      if (!client) return res.status(404).json({ error: 'Client not found' });
      res.json(client);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch client' });
    }
  },

  create(req, res) {
    try {
      if (!req.body.name) return res.status(400).json({ error: 'Client name is required' });
      const client = ClientModel.create(req.body);
      res.status(201).json(client);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create client' });
    }
  },

  update(req, res) {
    try {
      const existing = ClientModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Client not found' });
      const client = ClientModel.update(req.params.id, req.body);
      res.json(client);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update client' });
    }
  },

  delete(req, res) {
    try {
      const existing = ClientModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Client not found' });
      ClientModel.delete(req.params.id);
      res.json({ message: 'Client deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete client' });
    }
  },

  count(req, res) {
    try {
      res.json({ count: ClientModel.count() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to count clients' });
    }
  }
};

export default ClientController;
