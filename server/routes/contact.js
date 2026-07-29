import express from 'express';
import { getSessionUser } from './auth.js';
import { checkRateLimit } from '../utils/moderation.js';
import { sendTelegramContactNotification } from '../utils/telegram.js';
import { getSupabaseClient } from '../utils/supabase.js';

const router = express.Router();
const supabase = getSupabaseClient();

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const user = await getSessionUser(req);
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
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
    let messageId = Date.now();

    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .insert([{
          user_id: userId,
          username,
          message: trimmedMessage,
          status: 'pending_retry',
          delivered_to_telegram: 0,
          user_agent: userAgent,
          ip_address: clientIp
        }])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      if (data?.id) {
        messageId = data.id;
      }
    } catch (dbErr) {
      console.warn('Backend DB insert skipped:', dbErr.message);
    }

    const now = new Date();
    const telegramRes = await sendTelegramContactNotification({
      username,
      userId,
      rawDate: now,
      message: trimmedMessage,
      userAgent,
      ipAddress: clientIp
    });

    if (telegramRes.success) {
      try {
        if (supabase) {
          await supabase.from('contact_messages').update({ delivered_to_telegram: 1, status: 'delivered' }).eq('id', messageId);
        }
      } catch (e) {}

      return res.json({
        success: true,
        delivered: true,
        messageId,
        responseMessage: 'Your message has been sent successfully.'
      });
    } else {
      return res.json({
        success: true,
        delivered: false,
        messageId,
        responseMessage: 'Your message has been saved successfully.'
      });
    }
  } catch (err) {
    console.error('Contact route error:', err);
    return res.status(500).json({ error: 'Server error processing message.' });
  }
});

export default router;
