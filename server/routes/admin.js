import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/schema.js';
import { getSessionUser } from './auth.js';

const router = express.Router();

// Middleware to enforce Admin authorization
function requireAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin authorization required.' });
  }
  req.adminUser = user;
  next();
}

// POST /api/admin/change-password
router.post('/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.adminUser.id);
  if (!user || !user.password_hash) {
    return res.status(404).json({ error: 'Admin user record not found.' });
  }

  const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.adminUser.id);

  return res.json({ success: true, message: 'Password updated successfully.' });
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const thoughtCount = db.prepare('SELECT COUNT(*) as count FROM thoughts').get().count;
  return res.json({ userCount, thoughtCount });
});

// DELETE /api/admin/thoughts/:id
router.delete('/thoughts/:id', requireAdmin, (req, res) => {
  const thoughtId = parseInt(req.params.id, 10);
  if (!thoughtId) return res.status(400).json({ error: 'Invalid thought ID.' });

  db.prepare('DELETE FROM thoughts WHERE id = ?').run(thoughtId);
  return res.json({ success: true, message: 'Thought deleted successfully.' });
});

export default router;
