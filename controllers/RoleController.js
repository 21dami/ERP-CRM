import RoleModel from '../models/Role.js';
import {
  ROLE_NAME_PATTERN,
  PROTECTED_OWN_ROLE_PERMISSIONS,
  isValidPermissionKeys
} from '../config/permissions.js';

function validatePermissions(permissions) {
  if (permissions === undefined) return null;
  if (!isValidPermissionKeys(permissions)) {
    return 'Permission list contains an unknown permission';
  }
  return null;
}

const RoleController = {
  getAll(req, res) {
    try {
      const { search, page, limit, sort, order } = req.query;
      const result = RoleModel.findAll({
        search, page: parseInt(page) || 1, limit: parseInt(limit) || 20, sort, order
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  },

  getById(req, res) {
    try {
      const role = RoleModel.findById(req.params.id);
      if (!role) return res.status(404).json({ error: 'Role not found' });
      res.json({ ...role, permissions: RoleModel.getPermissions(role.id) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch role' });
    }
  },

  count(req, res) {
    try {
      res.json({ count: RoleModel.count() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to count roles' });
    }
  },

  create(req, res) {
    try {
      const { name, display_name, description, permissions } = req.body;

      if (!name || !display_name) {
        return res.status(400).json({ error: 'Role name and display name are required' });
      }
      if (!ROLE_NAME_PATTERN.test(name)) {
        return res.status(400).json({ error: 'Role name must be lowercase letters, numbers or underscores (3-31 characters)' });
      }
      if (RoleModel.findByName(name)) {
        return res.status(400).json({ error: 'Role name already exists' });
      }
      const permissionError = validatePermissions(permissions);
      if (permissionError) return res.status(400).json({ error: permissionError });

      const role = RoleModel.create({
        name, display_name, description, permissions: permissions || []
      });
      res.status(201).json(role);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create role' });
    }
  },

  update(req, res) {
    try {
      const role = RoleModel.findById(req.params.id);
      if (!role) return res.status(404).json({ error: 'Role not found' });

      const data = {};
      if (req.body.display_name !== undefined) data.display_name = req.body.display_name;
      if (req.body.description !== undefined) data.description = req.body.description;

      if (req.body.name !== undefined && req.body.name !== role.name) {
        if (role.is_system) {
          return res.status(400).json({ error: 'System roles cannot be renamed' });
        }
        if (!ROLE_NAME_PATTERN.test(req.body.name)) {
          return res.status(400).json({ error: 'Role name must be lowercase letters, numbers or underscores (3-31 characters)' });
        }
        if (RoleModel.findByName(req.body.name)) {
          return res.status(400).json({ error: 'Role name already exists' });
        }
        data.name = req.body.name;
      }

      if (data.display_name !== undefined && !String(data.display_name).trim()) {
        return res.status(400).json({ error: 'Display name cannot be empty' });
      }

      const updated = RoleModel.update(role.id, data);

      if (data.name) {
        RoleModel.renameUsers(role.name, data.name);
      }

      res.json(RoleModel.findById(role.id) || updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update role' });
    }
  },

  setPermissions(req, res) {
    try {
      const role = RoleModel.findById(req.params.id);
      if (!role) return res.status(404).json({ error: 'Role not found' });

      const { permissions } = req.body;
      if (!isValidPermissionKeys(permissions)) {
        return res.status(400).json({ error: 'Permission list contains an unknown permission' });
      }

      if (role.name === req.user.role) {
        const missing = PROTECTED_OWN_ROLE_PERMISSIONS.filter(key => !permissions.includes(key));
        if (missing.length) {
          return res.status(400).json({
            error: 'You cannot remove role management permissions from your own role'
          });
        }
      }

      RoleModel.setPermissions(role.id, permissions);
      res.json({ ...RoleModel.findById(role.id), permissions: RoleModel.getPermissions(role.id) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update role permissions' });
    }
  },

  delete(req, res) {
    try {
      const role = RoleModel.findById(req.params.id);
      if (!role) return res.status(404).json({ error: 'Role not found' });
      if (role.is_system) {
        return res.status(400).json({ error: 'System roles cannot be deleted' });
      }
      if (role.name === req.user.role) {
        return res.status(400).json({ error: 'You cannot delete your own role' });
      }
      if (role.user_count > 0) {
        return res.status(400).json({ error: `Role is assigned to ${role.user_count} user(s). Reassign them first.` });
      }
      RoleModel.delete(role.id);
      res.json({ message: 'Role deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete role' });
    }
  }
};

export default RoleController;
