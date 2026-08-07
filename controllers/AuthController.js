import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const AuthController = {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  me(req, res) {
    res.json({ user: req.user });
  },

  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const valid = await bcrypt.compare(current_password, user.password);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

      const hashed = await bcrypt.hash(new_password, 12);
      db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, req.user.id);
      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
};

export default AuthController;
