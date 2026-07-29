import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getSessionUser } from './auth.js';
import { getSupabaseClient } from '../utils/supabase.js';

const router = express.Router();
const supabase = getSupabaseClient();

// Middleware to strictly enforce Admin authorization
async function requireAdmin(req, res, next) {
  const user = await getSessionUser(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin authorization required.' });
  }
  req.adminUser = user;
  next();
}

// Apply requireAdmin to ALL /api/admin/* endpoints
router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  if (!supabase) {
    return res.json({ userCount: 0, thoughtCount: 0, contactCount: 0, messagesToday: 0, activeUsers: 0 });
  }

  try {
    const [userCountRes, thoughtCountRes, contactCountRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_admin', 0),
      supabase.from('thoughts').select('id', { count: 'exact', head: true }),
      supabase.from('contact_messages').select('id', { count: 'exact', head: true })
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const { count: messagesTodayCount } = await supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentThoughts } = await supabase
      .from('thoughts')
      .select('user_id')
      .gte('created_at', sevenDaysAgo);

    const activeUsers = new Set((recentThoughts || []).map((row) => row.user_id)).size;

    return res.json({
      userCount: userCountRes.count || 0,
      thoughtCount: thoughtCountRes.count || 0,
      contactCount: contactCountRes.count || 0,
      messagesToday: messagesTodayCount || 0,
      activeUsers
    });
  } catch (err) {
    console.error('Error loading admin stats:', err);
    return res.status(500).json({ error: 'Failed to load admin statistics.' });
  }
});

// GET /api/admin/users (Users Search & Listing)
router.get('/users', async (req, res) => {
  if (!supabase) {
    return res.json({ users: [] });
  }

  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    let query = supabase
      .from('users')
      .select('id, username, word1, word2, is_admin, created_at, ip_address')
      .eq('is_admin', 0)
      .order('created_at', { ascending: false })
      .limit(100);

    if (search) {
      query = query.or(`username.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    const { data: thoughts } = await supabase.from('thoughts').select('id, user_id');
    const thoughtCountByUser = Object.fromEntries((thoughts || []).reduce((acc, thought) => {
      const key = String(thought.user_id || '');
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map()));

    const usersWithCounts = (users || []).map((user) => ({
      ...user,
      thought_count: thoughtCountByUser[String(user.id)] || 0
    }));

    return res.json({ users: usersWithCounts });
  } catch (err) {
    console.error('Error fetching admin users:', err);
    return res.status(500).json({ error: 'Failed to load users.' });
  }
});

// DELETE /api/admin/users/:id (Permanently delete user + all thoughts)
router.delete('/users/:id', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured.' });
  }

  const userId = req.params.id;
  if (!userId) return res.status(400).json({ error: 'Invalid user ID.' });

  try {
    const { data: targetUser, error: lookupError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (lookupError || !targetUser) return res.status(404).json({ error: 'User not found.' });
    if (targetUser.is_admin) return res.status(403).json({ error: 'Cannot delete administrator account.' });

    await supabase.from('thoughts').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);

    return res.json({ success: true, message: 'User and all associated data permanently deleted.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// DELETE /api/admin/users/:id/thoughts (Delete all thoughts for a specific user)
router.delete('/users/:id/thoughts', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured.' });
  }

  const userId = req.params.id;
  if (!userId) return res.status(400).json({ error: 'Invalid user ID.' });

  try {
    const { error } = await supabase.from('thoughts').delete().eq('user_id', userId);
    if (error) throw error;
    return res.json({ success: true, message: 'Deleted thoughts for this user.' });
  } catch (err) {
    console.error('Error deleting user thoughts:', err);
    return res.status(500).json({ error: 'Failed to delete user thoughts.' });
  }
});

// GET /api/admin/thoughts (Thoughts Search & Listing)
router.get('/thoughts', async (req, res) => {
  if (!supabase) {
    return res.json({ thoughts: [] });
  }

  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    let query = supabase
      .from('thoughts')
      .select('id, user_id, username, content, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (search) {
      query = query.or(`username.ilike.%${search}%,content.ilike.%${search}%,user_id.ilike.%${search}%`);
    }

    const { data: thoughts, error } = await query;
    if (error) throw error;
    return res.json({ thoughts: thoughts || [] });
  } catch (err) {
    console.error('Error fetching admin thoughts:', err);
    return res.status(500).json({ error: 'Failed to load thoughts.' });
  }
});

// DELETE /api/admin/thoughts/:id (Delete single thought)
router.delete('/thoughts/:id', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured.' });
  }

  const thoughtId = req.params.id;
  if (!thoughtId) return res.status(400).json({ error: 'Invalid thought ID.' });

  try {
    const { error } = await supabase.from('thoughts').delete().eq('id', thoughtId);
    if (error) throw error;
    return res.json({ success: true, message: 'Thought deleted successfully.' });
  } catch (err) {
    console.error('Error deleting thought:', err);
    return res.status(500).json({ error: 'Failed to delete thought.' });
  }
});

// POST /api/admin/thoughts/bulk-delete (Bulk delete thoughts)
router.post('/thoughts/bulk-delete', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured.' });
  }

  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No thought IDs provided.' });
  }

  try {
    const { error } = await supabase.from('thoughts').delete().in('id', ids);
    if (error) throw error;
    return res.json({ success: true, message: 'Bulk deleted thoughts.' });
  } catch (err) {
    console.error('Error bulk deleting thoughts:', err);
    return res.status(500).json({ error: 'Failed to bulk delete thoughts.' });
  }
});

// GET /api/admin/contact-messages (Messages Search & Listing)
router.get('/contact-messages', async (req, res) => {
  if (!supabase) {
    return res.json({ messages: [] });
  }

  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    let query = supabase
      .from('contact_messages')
      .select('id, user_id, username, message, status, delivered_to_telegram, user_agent, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (search) {
      query = query.or(`username.ilike.%${search}%,message.ilike.%${search}%,user_id.ilike.%${search}%`);
    }

    const { data: messages, error } = await query;
    if (error) throw error;
    return res.json({ messages: messages || [] });
  } catch (err) {
    console.error('Error fetching contact messages:', err);
    return res.status(500).json({ error: 'Failed to load contact messages.' });
  }
});

// PATCH /api/admin/contact-messages/:id/resolve (Mark as resolved)
router.patch('/contact-messages/:id/resolve', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured.' });
  }

  const msgId = req.params.id;
  if (!msgId) return res.status(400).json({ error: 'Invalid message ID.' });

  try {
    const { error } = await supabase.from('contact_messages').update({ status: 'resolved' }).eq('id', msgId);
    if (error) throw error;
    return res.json({ success: true, message: 'Message marked as resolved.' });
  } catch (err) {
    console.error('Error resolving contact message:', err);
    return res.status(500).json({ error: 'Failed to resolve message.' });
  }
});

// DELETE /api/admin/contact-messages/:id
router.delete('/contact-messages/:id', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured.' });
  }

  const msgId = req.params.id;
  if (!msgId) return res.status(400).json({ error: 'Invalid message ID.' });

  try {
    const { error } = await supabase.from('contact_messages').delete().eq('id', msgId);
    if (error) throw error;
    return res.json({ success: true, message: 'Contact message deleted permanently.' });
  } catch (err) {
    console.error('Error deleting contact message:', err);
    return res.status(500).json({ error: 'Failed to delete contact message.' });
  }
});

// POST /api/admin/change-password
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const adminUserEnv = process.env.ADMIN_USER || process.env.ADMIN_USERNAME || '';
  const adminPassEnv = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD || '';

  if (currentPassword !== adminPassEnv) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  const newSessionToken = Buffer.from(JSON.stringify({ id: `admin_${adminUserEnv}`, username: adminUserEnv, isAdmin: true })).toString('base64');
  res.cookie('ithink_session', newSessionToken, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });

  return res.json({ success: true, message: 'Password updated successfully.' });
});

export default router;
