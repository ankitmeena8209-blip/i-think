import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/schema.js';
import { getSessionUser } from './auth.js';

const router = express.Router();

// Middleware to strictly enforce Admin authorization
function requireAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin authorization required.' });
  }
  req.adminUser = user;
  next();
}

// Apply requireAdmin to ALL /api/admin/* endpoints
router.use(requireAdmin);

// POST /api/admin/change-password
router.post('/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ? AND is_admin = 1').get(req.adminUser.id);
  if (!user || !user.password_hash) {
    return res.status(404).json({ error: 'Admin user record not found.' });
  }

  const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  // 1. Generate new bcrypt hash
  const newHash = bcrypt.hashSync(newPassword, 10);

  // 2. Save new hash permanently
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.adminUser.id);

  // 3. Invalidate ALL existing admin sessions
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.adminUser.id);

  // 4. Create new active session token for current admin session
  const newSessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(newSessionToken, req.adminUser.id, expiresAt);

  // Update HttpOnly cookie with new session token
  res.cookie('ithink_session', newSessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  return res.json({ success: true, message: 'Password updated successfully.' });
});

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').get().count;
  const thoughtCount = db.prepare('SELECT COUNT(*) as count FROM thoughts').get().count;
  const contactCount = db.prepare('SELECT COUNT(*) as count FROM contact_messages').get().count;
  return res.json({ userCount, thoughtCount, contactCount });
});

// GET /api/admin/users (Users Search & Listing - Separate from Messages)
router.get('/users', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  let query = 'SELECT id, username, word1, word2, is_admin, created_at, ip_address FROM users WHERE is_admin = 0';
  const params = [];

  if (search) {
    query += ' AND (username LIKE ? OR CAST(id AS TEXT) LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const users = db.prepare(query).all(...params);
  return res.json({ users });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!userId) return res.status(400).json({ error: 'Invalid user ID.' });

  // Prevent deleting admin users
  const targetUser = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId);
  if (targetUser && targetUser.is_admin) {
    return res.status(403).json({ error: 'Cannot delete administrator account.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return res.json({ success: true, message: 'User deleted permanently.' });
});

// GET /api/admin/contact-messages (Messages Search & Listing - Separate from Users)
router.get('/contact-messages', (req, res) => {
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
router.delete('/contact-messages/:id', (req, res) => {
  const msgId = parseInt(req.params.id, 10);
  if (!msgId) return res.status(400).json({ error: 'Invalid message ID.' });

  const result = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(msgId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  return res.json({ success: true, message: 'Contact message deleted permanently.' });
});

// DELETE /api/admin/thoughts/:id
router.delete('/thoughts/:id', (req, res) => {
  const thoughtId = parseInt(req.params.id, 10);
  if (!thoughtId) return res.status(400).json({ error: 'Invalid thought ID.' });

  db.prepare('DELETE FROM thoughts WHERE id = ?').run(thoughtId);
  return res.json({ success: true, message: 'Thought deleted successfully.' });
});

export default router;
