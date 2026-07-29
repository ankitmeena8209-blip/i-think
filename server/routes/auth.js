import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { checkRateLimit } from '../utils/moderation.js';

const router = express.Router();
const SESSION_COOKIE_NAME = 'ithink_session';
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || 'i-think-dev-secret';

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding ? normalized + '='.repeat(4 - padding) : normalized;
  return Buffer.from(padded, 'base64').toString('utf8');
}

function createSignedToken(payload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `${encodedPayload}.${signature}`;
}

function verifySignedToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  if (expectedSignature !== signature) return null;

  try {
    return JSON.parse(base64UrlDecode(encodedPayload));
  } catch (err) {
    return null;
  }
}

export function encodeSessionPayload(payload) {
  return createSignedToken(payload);
}

export function decodeSessionPayload(token) {
  if (!token) return null;

  const signedPayload = verifySignedToken(token);
  if (signedPayload) return signedPayload;

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
}

export function getAdminCredentials() {
  const username = process.env.ADMIN_USER || process.env.ADMIN_USERNAME || '';
  const password = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD || '';
  return {
    username,
    passwordHash: bcrypt.hashSync(password, 10)
  };
}

export function verifyAdminPassword(password) {
  const { passwordHash } = getAdminCredentials();
  if (!password || !passwordHash) return false;
  return bcrypt.compareSync(password, passwordHash);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  };
}

export function setSessionCookie(res, payload) {
  const sessionToken = encodeSessionPayload(payload);
  res.cookie(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());
  return sessionToken;
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
}

// Helper to get active session user
export async function getSessionUser(req) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
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

  const { username, password } = req.body || {};
  const { username: adminUserEnv, passwordHash } = getAdminCredentials();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (!adminUserEnv || !passwordHash) {
    return res.status(500).json({ error: 'Admin credentials are not configured on the server.' });
  }

  if (username.trim() !== adminUserEnv) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  setSessionCookie(res, {
    id: `admin_${adminUserEnv}`,
    username: adminUserEnv,
    isAdmin: true
  });

  return res.json({
    success: true,
    user: { id: `admin_${adminUserEnv}`, username: adminUserEnv, isAdmin: true }
  });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true });
});

export default router;
