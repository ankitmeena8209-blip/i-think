import db from '../db/schema.js';

/**
 * Formats and sends a contact message notification to Telegram.
 */
export async function sendTelegramContactNotification({ username, userId, serverTime, message, userAgent, ipAddress }) {
  const rawToken = process.env.TELEGRAM_BOT_TOKEN;
  const rawChatId = process.env.TELEGRAM_CHAT_ID;

  if (!rawToken || !rawChatId) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variable is missing.');
    return { success: false, error: 'Telegram environment credentials missing' };
  }

  // Sanitize token formatting if prefix 'bot' was included
  const cleanToken = rawToken.trim().replace(/^bot/i, '');
  const cleanChatId = rawChatId.trim();

  const telegramText = `📩 New Contact Message

👤 Identity:
${username || 'Anonymous'}

🆔 User ID:
${userId ? userId : 'N/A (Anonymous)'}

🕒 Time:
${serverTime || new Date().toLocaleString()}

💬 Message:
${message}

🌐 Browser:
${userAgent || 'Unknown Browser'}

📍 IP:
${ipAddress || 'Unknown IP'}`;

  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: telegramText
      })
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      console.log('[Telegram] Message successfully sent to Telegram Chat ID:', cleanChatId);
      return { success: true };
    } else {
      console.error('[Telegram] API error response:', data);
      return { success: false, error: data.description || 'Telegram API returned failure' };
    }
  } catch (err) {
    console.error('[Telegram] Network connection error:', err);
    return { success: false, error: err.message || 'Telegram network request failed' };
  }
}

/**
 * Background routine to retry delivering pending messages to Telegram.
 */
export async function retryPendingTelegramMessages() {
  const rawToken = process.env.TELEGRAM_BOT_TOKEN;
  const rawChatId = process.env.TELEGRAM_CHAT_ID;
  if (!rawToken || !rawChatId) return;

  try {
    const pendingMessages = db.prepare(`
      SELECT * FROM contact_messages 
      WHERE delivered_to_telegram = 0 
      ORDER BY created_at ASC 
      LIMIT 10
    `).all();

    for (const msg of pendingMessages) {
      const result = await sendTelegramContactNotification({
        username: msg.username,
        userId: msg.user_id,
        serverTime: new Date(msg.created_at).toLocaleString(),
        message: msg.message,
        userAgent: msg.user_agent,
        ipAddress: msg.ip_address
      });

      if (result.success) {
        db.prepare(`
          UPDATE contact_messages 
          SET delivered_to_telegram = 1, status = 'delivered' 
          WHERE id = ?
        `).run(msg.id);
        console.log(`[Telegram] Successfully delivered retried message ID #${msg.id}`);
      }
    }
  } catch (err) {
    console.error('[Telegram Retry] Error processing pending queue:', err);
  }
}
