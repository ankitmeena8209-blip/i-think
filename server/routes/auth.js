import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { checkRateLimit } from '../utils/moderation.js';
import { getSupabaseClient } from '../utils/supabase.js';
import { detectTableColumns } from '../utils/supabaseSchema.js';

const router = express.Router();
const supabase = getSupabaseClient();
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

// Look up a non-deleted user by ID in Supabase (falls back to session payload if Supabase unavailable)
export async function findActiveUserById(userId, fallbackUsername) {
  if (!userId) return null;

  // Admin sessions are stateless and always valid
  if (String(userId).startsWith('admin_')) {
    return { id: userId, username: fallbackUsername || '', isAdmin: true };
  }

  if (supabase) {
    try {
      // Detect whether the deployed DB has the `deleted_at` column.
      // Older deployments don't — in that case we treat any existing user row as valid
      // (soft-delete simply isn't supported there yet).
      const userColumns = await detectTableColumns('users', [
        'id', 'username', 'word1', 'word2', 'is_admin', 'deleted_at'
      ]);
      const hasDeletedAt = userColumns.columns.has('deleted_at');

      const projection = hasDeletedAt
        ? 'id, username, word1, word2, is_admin, deleted_at'
        : 'id, username, word1, word2, is_admin';

      let query = supabase
        .from('users')
        .select(projection)
        .eq('id', userId);

      if (hasDeletedAt) {
        query = query.eq('deleted_at', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (!data) return null; // User was deleted or no longer exists

      return {
        id: data.id,
        username: data.username,
        isAdmin: Boolean(data.is_admin),
        word1: data.word1,
        word2: data.word2
      };
    } catch (err) {
      // If the query itself is broken due to schema mismatch, do NOT silently
      // re-trust the stale session — that would let deleted users keep access.
      // Instead log out by returning null, unless Supabase itself is unreachable.
      if (err?.code === '42703' || /column .* does not exist/i.test(err?.message || '')) {
        console.warn('[auth] Schema mismatch while validating user — logging out:', err.message);
        return null;
      }
      console.warn('[auth] Error validating user in Supabase:', err.message);
      // Fall back to session payload so the app remains usable if Supabase is temporarily down
      return { id: userId, username: fallbackUsername || '', isAdmin: false };
    }
  }

  // No Supabase configured — trust the session payload
  return { id: userId, username: fallbackUsername || '', isAdmin: false };
}

// Helper to get active session user (validates against DB so deleted users lose access immediately)
export async function getSessionUser(req) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  const payload = decodeSessionPayload(token);

  if (!payload?.id || !payload?.username) return null;

  // Verify with database that the user still exists and is not deleted
  const activeUser = await findActiveUserById(payload.id, payload.username);
  if (!activeUser) return null;

  return activeUser;
}

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    return res.json({ authenticated: false });
  }
  return res.json({ authenticated: true, user: { ...user, isAdmin: Boolean(user.isAdmin) } });
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