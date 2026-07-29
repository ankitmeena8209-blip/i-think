import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { checkRateLimit } from '../utils/moderation.js';

const router = express.Router();

function encodeSessionPayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function decodeSessionPayload(token) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
}

// Helper to get active session user
export async function getSessionUser(req) {
  const token = req.cookies?.ithink_session;
  const payload = decodeSessionPayload(token);

  if (!payload?.id || !payload?.username) return null;

  return {
    id: payload.id,
    username: payload.username,
    isAdmin: Boolean(payload.isAdmin)
  };
}

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    return res.json({ authenticated: false });
  }
  return res.json({ authenticated: true, user });
});

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Brute-force protection: Max 5 failed attempts per 15 minutes (900,000 ms)
  const rateLimit = checkRateLimit(`admin_login_ip_${clientIp}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many failed login attempts. Please wait ${rateLimit.waitSeconds} seconds before trying again.`
    });
  }

  const adminUserEnv = process.env.ADMIN_USER || process.env.ADMIN_USERNAME || '';
  const adminPassEnv = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD || '';

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (username.trim() !== adminUserEnv) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const isPasswordValid = password === adminPassEnv;
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const sessionToken = encodeSessionPayload({
    id: `admin_${adminUserEnv}`,
    username: adminUserEnv,
    isAdmin: true
  });

  res.cookie('ithink_session', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  return res.json({
    success: true,
    user: { id: `admin_${adminUserEnv}`, username: adminUserEnv, isAdmin: true }
  });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  res.clearCookie('ithink_session', { httpOnly: true, sameSite: 'lax', path: '/' });
  return res.json({ success: true });
});

export default router;
