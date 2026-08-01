import express from 'express';
import { getSessionUser } from './auth.js';
import { checkRateLimit } from '../utils/moderation.js';
import { sendTelegramContactNotification } from '../utils/telegram.js';
import { getSupabaseClient } from '../utils/supabase.js';
import { detectTableColumns } from '../utils/supabaseSchema.js';
import { getClientIp } from '../utils/ip.js';
import db from '../db/schema.js';

const router = express.Router();
const supabase = getSupabaseClient();

let contactMessageSchemaChecked = false;
let contactMessageColumn = 'message';

async function getContactMessageColumn() {
  if (contactMessageSchemaChecked) return contactMessageColumn;
  const result = await detectTableColumns('contact_messages', [
    'message', 'content', 'text', 'body'
  ]);
  contactMessageColumn = ['message', 'content', 'text', 'body'].find((col) => result.columns.has(col)) || 'message';
  contactMessageSchemaChecked = true;
  return contactMessageColumn;
}

// Persist a contact message in Supabase (primary). Falls back to local SQLite if Supabase fails.
async function persistContactMessage({ userId, username, message, status, deliveredToTelegram, userAgent, ipAddress }) {
  // 1. Try Supabase first — this is the store the Admin Panel reads from
  try {
    if (supabase) {
      const msgColumn = await getContactMessageColumn();
      const { data, error } = await supabase
        .from('contact_messages')
        .insert([{
          user_id: userId,
          username,
          [msgColumn]: message,
          status,
          delivered_to_telegram: deliveredToTelegram,
          user_agent: userAgent,
          ip_address: ipAddress
        }])
        .select('id, created_at')
        .single();

      if (!error && data?.id) {
        return { source: 'supabase', id: data.id, created_at: data.created_at };
      }
      console.warn('[contact] Supabase insert failed, falling back to SQLite:', error?.message);
    }
  } catch (dbErr) {
    console.warn('[contact] Supabase insert threw, falling back to SQLite:', dbErr.message);
  }

  // 2. Fallback: local SQLite (used when Supabase is unavailable or not configured)
  try {
    const result = await db.prepare(`
      INSERT INTO contact_messages (user_id, username, message, status, delivered_to_telegram, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, username, message, status, deliveredToTelegram, userAgent, ipAddress);

    return { source: 'sqlite', id: result.lastInsertRowid, created_at: new Date().toISOString() };
  } catch (e) {
    console.warn('[contact] SQLite fallback insert failed:', e.message);
    return null;
  }
}

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const user = await getSessionUser(req);
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    // 1. Rate Limiting: Max 5 messages per 10 minutes (600,000 ms)
    const identifier = user ? `contact_user_${user.id}` : `contact_ip_${clientIp}`;
    const rateLimit = checkRateLimit(identifier, 5, 10 * 60 * 1000);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: `Too many contact requests. Please wait ${rateLimit.waitSeconds} seconds before sending another message.`
      });
    }

    // 2. Validate Message
    let { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    if (trimmedMessage.length > 1000) {
      return res.status(400).json({ error: 'Message length cannot exceed 1000 characters.' });
    }

    const username = user ? user.username : 'Anonymous Stranger';
    const userId = user ? user.id : null;

    // 3. Persist the message FIRST (so it always shows in the Admin Panel, even if Telegram fails)
    const persisted = await persistContactMessage({
      userId,
      username,
      message: trimmedMessage,
      status: 'pending_retry',
      deliveredToTelegram: 0,
      userAgent,
      ipAddress: clientIp
    });

    const now = new Date();
    const telegramRes = await sendTelegramContactNotification({
      username,
      userId,
      rawDate: now,
      message: trimmedMessage,
      userAgent,
      ipAddress: clientIp
    });

    // 4. Mark the persisted message as delivered if Telegram succeeded
    if (telegramRes.success && persisted) {
      try {
        if (persisted.source === 'supabase' && supabase) {
          await supabase
            .from('contact_messages')
            .update({ delivered_to_telegram: 1, status: 'delivered' })
            .eq('id', persisted.id);
        } else if (persisted.source === 'sqlite') {
          await db.prepare(`
            UPDATE contact_messages
            SET delivered_to_telegram = 1, status = 'delivered'
            WHERE id = ?
          `).run(persisted.id);
        }
      } catch (e) {
        console.warn('[contact] Failed to mark message as delivered:', e.message);
      }
    }

    // 5. Always return success AND the real delivery status so the UI can inform the user accurately
    return res.json({
      success: true,
      delivered: telegramRes.success,
      messageId: persisted?.id || null,
      responseMessage: telegramRes.success
        ? 'Your message has been sent successfully.'
        : 'Your message has been saved. We will respond to you soon.'
    });
  } catch (err) {
    console.error('Contact route error:', err);
    return res.status(500).json({ error: 'Server error processing message.' });
  }
});

export default router;