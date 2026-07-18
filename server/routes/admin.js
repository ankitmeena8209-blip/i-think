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
  const contactCount = db.prepare('SELECT COUNT(*) as count FROM contact_messages').get().count;
  return res.json({ userCount, thoughtCount, contactCount });
});

// GET /api/admin/contact-messages
router.get('/contact-messages', requireAdmin, (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  let query = 'SELECT id, user_id, username, message, status, delivered_to_telegram, user_agent, ip_address, created_at FROM contact_messages';
  const params = [];

  if (search) {
    query += ' WHERE (username LIKE ? OR CAST(user_id AS TEXT) LIKE ? OR message LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const messages = db.prepare(query).all(...params);
  return res.json({ messages });
});

// DELETE /api/admin/contact-messages/:id
router.delete('/contact-messages/:id', requireAdmin, (req, res) => {
  const msgId = parseInt(req.params.id, 10);
  if (!msgId) return res.status(400).json({ error: 'Invalid message ID.' });

  const result = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(msgId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  return res.json({ success: true, message: 'Contact message deleted permanently.' });
});

// DELETE /api/admin/thoughts/:id
router.delete('/thoughts/:id', requireAdmin, (req, res) => {
  const thoughtId = parseInt(req.params.id, 10);
  if (!thoughtId) return res.status(400).json({ error: 'Invalid thought ID.' });

  db.prepare('DELETE FROM thoughts WHERE id = ?').run(thoughtId);
  return res.json({ success: true, message: 'Thought deleted successfully.' });
});

export default router;
