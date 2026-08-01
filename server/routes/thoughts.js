import express from 'express';
import { getSessionUser } from './auth.js';
import { sanitizeText, containsProfanity, checkRateLimit } from '../utils/moderation.js';
import { getSupabaseClient } from '../utils/supabase.js';
import { getClientIp } from '../utils/ip.js';

const router = express.Router();
const supabase = getSupabaseClient();

// GET /api/thoughts
router.get('/', async (req, res) => {
  if (!supabase) {
    return res.json({ thoughts: [], hasMore: false, page: 1 });
  }

  try {
    const sort = req.query.sort === 'top' ? 'top' : 'latest';
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    let query = supabase
      .from('thoughts')
      .select('id, user_id, username, content, created_at')
      .limit(limitNum);

    if (sort === 'latest') {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching thoughts from Supabase:', error);
      return res.json({ thoughts: [], hasMore: false, page: 1 });
    }

    const thoughts = (data || []).map((row) => ({
      id: row.id,
      username: row.username || 'Anonymous',
      content: row.content || '',
      created_at: row.created_at
    }));

    if (sort === 'top') {
      thoughts.sort((a, b) => b.content.length - a.content.length);
    }

    return res.json({ thoughts, hasMore: false, page: 1 });
  } catch (err) {
    console.error('Error fetching thoughts:', err);
    return res.json({ thoughts: [], hasMore: false, page: 1 });
  }
});

// POST /api/thoughts
router.post('/', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'You must create an identity to publish thoughts.' });
  }

  const clientIp = getClientIp(req);

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

  if (!supabase) {
    // Supabase not configured — silently succeed so the client-side insert (which
    // already wrote directly to Supabase) is not double-reported as an error.
    return res.json({ success: true });
  }

  try {
    const { data, error } = await supabase
      .from('thoughts')
      .insert([{ user_id: user.id || null, username: user.username, content: sanitizedContent }])
      .select('id, user_id, username, content, created_at')
      .single();

    if (error) {
      console.error('Error inserting thought into Supabase:', error);
      return res.status(500).json({ error: 'Failed to publish thought. Please try again.' });
    }

    return res.json({
      success: true,
      thought: {
        id: data.id,
        username: data.username,
        content: data.content,
        created_at: data.created_at
      }
    });
  } catch (err) {
    console.error('Error inserting thought:', err);
    return res.status(500).json({ error: 'Failed to publish thought. Please try again.' });
  }
});

export default router;
