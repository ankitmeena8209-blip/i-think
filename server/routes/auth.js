import express from 'express';
import db from '../db/schema.js';

const router = express.Router();

// Helper to get active session
export function getSessionUser(req) {
  const token = req.cookies.ithink_session;
  if (!token) return null;

  const session = db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.username
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
  `).get(token);

  return session ? { id: session.id, username: session.username } : null;
}

// GET /api/auth/me
router.get('/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.json({ authenticated: false });
  }
  return res.json({ authenticated: true, user });
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
