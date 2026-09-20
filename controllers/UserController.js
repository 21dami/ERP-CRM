import bcrypt from 'bcryptjs';
import UserModel from '../models/User.js';

const UserController = {
  getAll(req, res) {
    try {
      const { search, status, role, page, limit, sort, order } = req.query;
      const result = UserModel.findAll({
        search, status, role, page: parseInt(page) || 1, limit: parseInt(limit) || 20, sort, order
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  getById(req, res) {
    try {
      const user = UserModel.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  },

  async create(req, res) {
    try {
      const { username, password, full_name, email, role, status } = req.body;
      if (!username || !password || !full_name || !role) {
        return res.status(400).json({ error: 'Username, password, full name, and role are required' });
      }
      const existing = UserModel.findByUsername(username);
      if (existing) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = UserModel.create({ username, password: hashedPassword, full_name, email, role, status });
      res.status(201).json(user);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  },

  async update(req, res) {
    try {
      const existing = UserModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'User not found' });

      const data = { ...req.body };
      if (data.username && data.username !== existing.username) {
        const taken = UserModel.findByUsername(data.username);
        if (taken) return res.status(400).json({ error: 'Username already exists' });
      }
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 12);
      } else {
        delete data.password;
      }

      const user = UserModel.update(req.params.id, data);
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  },

  delete(req, res) {
    try {
      const existing = UserModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'User not found' });
      if (existing.username === 'admin') {
        return res.status(400).json({ error: 'Cannot delete the admin user' });
      }
      UserModel.delete(req.params.id);
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  },

  count(req, res) {
    try {
      res.json({ count: UserModel.count() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to count users' });
    }
  }
};

export default UserController;
