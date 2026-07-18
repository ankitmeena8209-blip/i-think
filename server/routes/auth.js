import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/schema.js';
import { checkRateLimit } from '../utils/moderation.js';

const router = express.Router();

// Helper to get active session user
export function getSessionUser(req) {
  const token = req.cookies?.ithink_session;
  if (!token) return null;

  try {
    const session = db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.username, u.is_admin
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
    `).get(token);

    return session ? { id: session.id, username: session.username, isAdmin: !!session.is_admin } : null;
  } catch (err) {
    console.error('Error fetching session user:', err);
    return null;
  }
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
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Brute-force protection: Max 5 failed attempts per 15 minutes (900,000 ms)
  const rateLimit = checkRateLimit(`admin_login_ip_${clientIp}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many failed login attempts. Please wait ${rateLimit.waitSeconds} seconds before trying again.`
    });
  }

  const adminUserEnv = process.env.ADMIN_USER;
  const adminPassEnv = process.env.ADMIN_PASS;

  if (!adminUserEnv || !adminPassEnv) {
    return res.status(500).json({ error: 'Admin credentials are not configured on the server.' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (username.trim() !== adminUserEnv) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  let user = db.prepare('SELECT id, username, is_admin, password_hash FROM users WHERE is_admin = 1 OR username = ?').get(adminUserEnv);

  const newHash = bcrypt.hashSync(adminPassEnv, 10);

  if (!user) {
    const result = db.prepare(`
      INSERT INTO users (username, word1, word2, is_admin, password_hash, ip_address)
      VALUES (?, 'Admin', 'User', 1, ?, '127.0.0.1')
    `).run(adminUserEnv, newHash);
    user = { id: result.lastInsertRowid, username: adminUserEnv, is_admin: 1, password_hash: newHash };
  } else if (user.username !== adminUserEnv || !user.password_hash || !user.is_admin) {
    db.prepare('UPDATE users SET username = ?, is_admin = 1, password_hash = ? WHERE id = ?').run(adminUserEnv, newHash, user.id);
    user.username = adminUserEnv;
    user.is_admin = 1;
    user.password_hash = newHash;
  }

  const isPasswordValid = (password === adminPassEnv) || (user.password_hash && bcrypt.compareSync(password, user.password_hash));
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
  const token = req.cookies?.ithink_session;
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie('ithink_session', { httpOnly: true, sameSite: 'lax', path: '/' });
  return res.json({ success: true });
});

export default router;
