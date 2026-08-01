import express from 'express';
import { getSessionUser, verifyAdminPassword, setSessionCookie } from './auth.js';
import { getSupabaseClient } from '../utils/supabase.js';
import { detectTableColumns } from '../utils/supabaseSchema.js';

const router = express.Router();
const supabase = getSupabaseClient();

// --- Schema adapters (deployed DB may predate the current migration) ---

async function initContactMessageColumn() {
  const result = await detectTableColumns('contact_messages', [
    'message', 'content', 'text', 'body'
  ]);
  // Prefer `message`, but use whatever exists on the deployed table.
  return ['message', 'content', 'text', 'body'].find((col) => result.columns.has(col)) || 'message';
}

let usersSchemaChecked = false;
let usersHasDeletedAt = false;

async function initUsersSchema() {
  if (usersSchemaChecked) return usersHasDeletedAt;
  const result = await detectTableColumns('users', ['id', 'deleted_at']);
  usersHasDeletedAt = result.columns.has('deleted_at');
  usersSchemaChecked = true;
  return usersHasDeletedAt;
}

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
    const hasDeletedAt = await initUsersSchema();

    let usersQuery = supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_admin', 0);
    if (hasDeletedAt) {
      usersQuery = usersQuery.is('deleted_at', null);
    }

    const [userCountRes, thoughtCountRes, contactCountRes] = await Promise.all([
      usersQuery,
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
    const hasDeletedAt = await initUsersSchema();
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const userProjection = hasDeletedAt
      ? 'id, username, word1, word2, is_admin, created_at, ip_address, deleted_at'
      : 'id, username, word1, word2, is_admin, created_at, ip_address';

    let query = supabase
      .from('users')
      .select(userProjection)
      .eq('is_admin', 0)
      .order('created_at', { ascending: false })
      .limit(100);

    if (hasDeletedAt) {
      query = query.is('deleted_at', null);
    }

    if (search) {
      query = query.or(`username.ilike.%${search}%,id.ilike.%${search}%`);
      if (hasDeletedAt) {
        query = query.is('deleted_at', null);
      }
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

// DELETE /api/admin/users/:id (Soft-delete user + delete all thoughts)
// Soft-delete keeps the username reserved so the identity can never be reused.
router.delete('/users/:id', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured.' });
  }

  const userId = req.params.id;
  if (!userId) return res.status(400).json({ error: 'Invalid user ID.' });

  try {
    const hasDeletedAt = await initUsersSchema();

    const userProjection = hasDeletedAt ? 'is_admin, deleted_at' : 'is_admin';
    const { data: targetUser, error: lookupError } = await supabase
      .from('users')
      .select(userProjection)
      .eq('id', userId)
      .maybeSingle();

    if (lookupError || !targetUser) return res.status(404).json({ error: 'User not found.' });
    if (targetUser.is_admin) return res.status(403).json({ error: 'Cannot delete administrator account.' });
    if (hasDeletedAt && targetUser.deleted_at) return res.status(400).json({ error: 'User is already deleted.' });

    // 1. Remove all thoughts published by this user
    await supabase.from('thoughts').delete().eq('user_id', userId);

    if (hasDeletedAt) {
      // 2. Soft-delete the user (username stays reserved forever)
      const { error: updateError } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', userId)
        .is('deleted_at', null);

      if (updateError) throw updateError;
      return res.json({ success: true, message: 'User deleted. Their identity will never be reused.' });
    }

    // 3. Pre-migration DB: hard-delete (identity can be reused — recommend running the migration)
    const { error: deleteError } = await supabase.from('users').delete().eq('id', userId);
    if (deleteError) throw deleteError;
    console.warn('[admin] Hard-deleted user (deleted_at column missing). Run supabase_setup.sql to enable permanent identity reservation.');
    return res.json({ success: true, message: 'User deleted.' });
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
    const messageColumn = await initContactMessageColumn();
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const messageProjection = [
      'id', 'user_id', 'username', messageColumn, 'status',
      'delivered_to_telegram', 'user_agent', 'ip_address', 'created_at'
    ].join(', ');

    let query = supabase
      .from('contact_messages')
      .select(messageProjection)
      .order('created_at', { ascending: false })
      .limit(100);

    if (search) {
      query = query.or(`username.ilike.%${search}%,${messageColumn}.ilike.%${search}%,user_id.ilike.%${search}%`);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    // Normalize the message column so the client always reads `msg.message`
    const normalized = (messages || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      username: row.username,
      message: row[messageColumn] || '',
      status: row.status,
      delivered_to_telegram: row.delivered_to_telegram,
      user_agent: row.user_agent,
      ip_address: row.ip_address,
      created_at: row.created_at
    }));

    return res.json({ messages: normalized });
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

  if (!verifyAdminPassword(currentPassword)) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  process.env.ADMIN_PASS = newPassword;
  process.env.ADMIN_PASSWORD = newPassword;

  setSessionCookie(res, {
    id: `admin_${process.env.ADMIN_USER || process.env.ADMIN_USERNAME || 'admin'}`,
    username: process.env.ADMIN_USER || process.env.ADMIN_USERNAME || 'admin',
    isAdmin: true
  });

  return res.json({ success: true, message: 'Admin password updated successfully for this deployment instance.' });
});

router.post('/broadcast', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase is not configured.' });
  }

  const { content } = req.body || {};
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Announcement content is required.' });
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length > 300) {
    return res.status(400).json({ error: 'Announcement exceeds the maximum length of 300 characters.' });
  }

  try {
    const { data, error } = await supabase
      .from('thoughts')
      .insert([{
        user_id: req.adminUser?.id || 'admin',
        username: req.adminUser?.username || 'Admin',
        content: trimmedContent
      }])
      .select('id, username, content, created_at')
      .single();

    if (error) throw error;

    return res.json({ success: true, thought: data });
  } catch (err) {
    console.error('Error broadcasting admin announcement:', err);
    return res.status(500).json({ error: 'Failed to publish announcement.' });
  }
});

export default router;
