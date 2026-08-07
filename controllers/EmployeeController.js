import EmployeeModel from '../models/Employee.js';

const EmployeeController = {
  getAll(req, res) {
    try {
      const { search, department, status, page, limit } = req.query;
      const result = EmployeeModel.findAll({
        search, department, status, page: parseInt(page) || 1, limit: parseInt(limit) || 20
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  },

  getById(req, res) {
    try {
      const employee = EmployeeModel.findById(req.params.id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      res.json(employee);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch employee' });
    }
  },

  create(req, res) {
    try {
      if (!req.body.first_name || !req.body.last_name) {
        return res.status(400).json({ error: 'First name and last name are required' });
      }
      const employee = EmployeeModel.create(req.body);
      res.status(201).json(employee);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create employee' });
    }
  },

  update(req, res) {
    try {
      const existing = EmployeeModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Employee not found' });
      const employee = EmployeeModel.update(req.params.id, req.body);
      res.json(employee);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update employee' });
    }
  },

  delete(req, res) {
    try {
      const existing = EmployeeModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Employee not found' });
      EmployeeModel.delete(req.params.id);
      res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  },

  getDepartments(req, res) {
    try {
      res.json(EmployeeModel.getDepartments());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  },

  getStats(req, res) {
    try {
      res.json(EmployeeModel.getStats());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch employee stats' });
    }
  }
};

export default EmployeeController;
