import express from 'express';
import db from '../db/schema.js';
import { getSessionUser } from './auth.js';
import { checkRateLimit } from '../utils/moderation.js';
import { sendTelegramContactNotification, retryPendingTelegramMessages } from '../utils/telegram.js';

const router = express.Router();

// POST /api/contact
router.post('/', async (req, res) => {
  const user = getSessionUser(req);
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown Browser';

  console.log('\n==================================================');
  console.log('📩 [CONTACT FLOW STEP 1] Form submission received');
  console.log('   User:', user ? `${user.username} (ID: ${user.id})` : 'Anonymous');
  console.log('   IP:', clientIp);

  // 1. Rate Limiting: Max 5 messages per 10 minutes (600,000 ms)
  const identifier = user ? `contact_user_${user.id}` : `contact_ip_${clientIp}`;
  const rateLimit = checkRateLimit(identifier, 5, 10 * 60 * 1000);

  if (!rateLimit.allowed) {
    console.warn('⚠️ [CONTACT FLOW STEP 1 FAIL] Rate limit exceeded');
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

  // 3. Duplicate Message Prevention (identical message within 5 minutes)
  const duplicate = db.prepare(`
    SELECT id FROM contact_messages 
    WHERE (user_id = ? OR ip_address = ?) AND message = ? AND created_at > datetime('now', '-5 minutes')
  `).get(userId || -1, clientIp, trimmedMessage);

  if (duplicate) {
    console.warn('⚠️ [CONTACT FLOW STEP 2 FAIL] Duplicate message prevented');
    return res.status(400).json({ error: 'You have already sent this exact message recently.' });
  }

  // 4. Save to Database ALWAYS
  const result = db.prepare(`
    INSERT INTO contact_messages (user_id, username, message, status, delivered_to_telegram, user_agent, ip_address)
    VALUES (?, ?, ?, 'pending_retry', 0, ?, ?)
  `).run(userId, username, trimmedMessage, userAgent, clientIp);

  const messageId = result.lastInsertRowid;
  const serverTime = new Date().toLocaleString();
  console.log(`💾 [CONTACT FLOW STEP 2] Saved contact message to DB with ID: #${messageId}`);

  // 5. Send to Telegram API
  console.log('🚀 [CONTACT FLOW STEP 3] Attempting Telegram delivery...');
  const telegramRes = await sendTelegramContactNotification({
    username,
    userId,
    serverTime,
    message: trimmedMessage,
    userAgent,
    ipAddress: clientIp
  });

  if (telegramRes.success) {
    // Update DB status to delivered
    db.prepare(`
      UPDATE contact_messages 
      SET delivered_to_telegram = 1, status = 'delivered' 
      WHERE id = ?
    `).run(messageId);

    console.log('✅ [CONTACT FLOW STEP 4 SUCCESS] Delivered to Telegram & DB updated');
    console.log('==================================================\n');

    return res.json({
      success: true,
      delivered: true,
      messageId,
      responseMessage: 'Your message has been sent successfully to Telegram.'
    });
  } else {
    // Log exact Telegram diagnostic error in server logs
    console.warn('⚠️ [CONTACT FLOW STEP 4 FAILED] Telegram delivery failed:', telegramRes.error);
    console.log('==================================================\n');

    // Return the exact Telegram diagnostic error to the client
    return res.status(400).json({
      success: false,
      delivered: false,
      messageId,
      error: telegramRes.error || 'Failed to deliver message to Telegram.'
    });
  }
});

export default router;
