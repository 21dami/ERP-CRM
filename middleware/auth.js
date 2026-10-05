import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import RoleModel from '../models/Role.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, username, full_name, email, role, status FROM users WHERE id = ?').get(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid token or inactive user.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// Grants access when the user's role holds ANY of the given permissions.
export const requirePermission = (...keys) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const permissions = RoleModel.getPermissionsForRoleName(req.user.role);
    if (keys.some(key => permissions.includes(key))) {
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions for this action.' });
  };
};

export const getPermissionsForUser = (user) => {
  if (!user) return [];
  return RoleModel.getPermissionsForRoleName(user.role);
};
