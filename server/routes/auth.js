import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/schema.js';

const router = express.Router();

// Helper to get active session
export function getSessionUser(req) {
  const token = req.cookies.ithink_session;
  if (!token) return null;

  const session = db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.username, u.is_admin
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
  `).get(token);

  return session ? { id: session.id, username: session.username, isAdmin: !!session.is_admin } : null;
}

// GET /api/auth/me
router.get('/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.json({ authenticated: false });
  }
  return res.json({ authenticated: true, user });
});

// POST /api/auth/admin-login
router.post('/admin-login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT id, username, is_admin, password_hash FROM users WHERE username = ?').get(username.trim());

  if (!user || !user.is_admin || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  // Create session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(sessionToken, user.id, expiresAt);

  // Set secure HttpOnly cookie
  res.cookie('ithink_session', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  return res.json({
    success: true,
    user: { id: user.id, username: user.username, isAdmin: true }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.cookies.ithink_session;
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie('ithink_session', { httpOnly: true, sameSite: 'lax', path: '/' });
  return res.json({ success: true });
});

export default router;
