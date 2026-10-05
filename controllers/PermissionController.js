import { PERMISSION_GROUPS, PERMISSION_KEYS } from '../config/permissions.js';

const PermissionController = {
  catalog(req, res) {
    try {
      res.json({ groups: PERMISSION_GROUPS, keys: PERMISSION_KEYS });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }
};

export default PermissionController;
