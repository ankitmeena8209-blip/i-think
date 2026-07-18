import express from 'express';
import db from '../db/schema.js';
import { getSessionUser } from './auth.js';
import { sanitizeText, containsProfanity, checkRateLimit } from '../utils/moderation.js';

const router = express.Router();

// GET /api/thoughts
router.get('/', async (req, res) => {
  const sort = req.query.sort === 'top' ? 'top' : 'latest';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  let query = 'SELECT id, username, content, created_at FROM thoughts';
  const params = [];

  if (search) {
    query += ' WHERE (username LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (sort === 'top') {
    // For top, we order by content length & recent timestamp as a proxy for depth
    query += ' ORDER BY LENGTH(content) DESC, created_at DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(limit + 1, offset); // Fetch 1 extra to check if hasMore

  const rows = await db.prepare(query).all(...params);
  const hasMore = rows.length > limit;
  const thoughts = hasMore ? rows.slice(0, limit) : rows;

  return res.json({ thoughts, hasMore, page });
});

// POST /api/thoughts
router.post('/', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'You must create an identity to publish thoughts.' });
  }

  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Rate limiting (max 5 thoughts per 60s per user)
  const rateLimit = checkRateLimit(`thought_${user.id}_${clientIp}`, 5, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Slow down! Please wait ${rateLimit.waitSeconds} seconds before posting another thought.`
    });
  }

  const { content } = req.body || {};

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Thought content cannot be empty.' });
  }

  if (content.length > 300) {
    return res.status(400).json({ error: 'Thought exceeds maximum length of 300 characters.' });
  }

  if (containsProfanity(content)) {
    return res.status(400).json({ error: 'Your thought contains offensive or inappropriate language.' });
  }

  const sanitizedContent = sanitizeText(content);

  try {
    const result = await db.prepare(`
      INSERT INTO thoughts (user_id, username, content, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(user.id, user.username, sanitizedContent, clientIp);

    const newThought = await db.prepare(`
      SELECT id, username, content, created_at FROM thoughts WHERE id = ?
    `).get(result.lastInsertRowid);

    return res.json({ success: true, thought: newThought });
  } catch (err) {
    console.error('Error inserting thought:', err);
    return res.status(500).json({ error: 'Failed to publish thought. Please try again.' });
  }
});

export default router;
