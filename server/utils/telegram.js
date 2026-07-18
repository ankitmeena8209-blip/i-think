import db from '../db/schema.js';

/**
 * Formats and sends a contact message notification to Telegram with full step-by-step auditing.
 */
export async function sendTelegramContactNotification({ username, userId, serverTime, message, userAgent, ipAddress }) {
  console.log('\n--- [TELEGRAM BOT API AUDIT START] ---');

  // Step 2: Verify TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from process.env
  const rawToken = process.env.TELEGRAM_BOT_TOKEN;
  const rawChatId = process.env.TELEGRAM_CHAT_ID;

  console.log('[Audit 1] Checking Environment Variables:');
  console.log('  - TELEGRAM_BOT_TOKEN present:', Boolean(rawToken));
  console.log('  - TELEGRAM_CHAT_ID present:', Boolean(rawChatId));

  if (!rawToken || !rawChatId) {
    const errText = 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables.';
    console.error('❌ [Telegram Audit Error]:', errText);
    console.log('--- [TELEGRAM BOT API AUDIT END] ---\n');
    return { success: false, error: errText };
  }

  // Token & Chat ID Sanitization
  let cleanToken = rawToken.trim();
  if (cleanToken.toLowerCase().startsWith('bot')) {
    cleanToken = cleanToken.substring(3);
  }
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

  const apiUrl = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  console.log('[Audit 2] Sending Telegram HTTP POST request to:', `https://api.telegram.org/bot${cleanToken.substring(0, 6)}.../sendMessage`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: telegramText
      })
    });

    const data = await response.json();
    console.log(`[Audit 3] Telegram API HTTP Status: ${response.status} ${response.statusText}`);
    console.log('[Audit 4] Telegram API Response Payload:', JSON.stringify(data, null, 2));

    if (response.ok && data.ok) {
      console.log('✅ [Telegram Audit Success] Notification delivered to Telegram Chat ID:', cleanChatId);
      console.log('--- [TELEGRAM BOT API AUDIT END] ---\n');
      return { success: true, response: data };
    } else {
      const errMsg = `Telegram API Error (${data.error_code || response.status}): ${data.description || 'Failed to deliver message to Telegram'}`;
      console.error('❌ [Telegram Audit Failure]:', errMsg);
      console.log('--- [TELEGRAM BOT API AUDIT END] ---\n');
      return { success: false, error: errMsg };
    }
  } catch (err) {
    const fetchErr = `Telegram Network Request Exception: ${err.message || err}`;
    console.error('❌ [Telegram Audit Exception]:', fetchErr);
    console.log('--- [TELEGRAM BOT API AUDIT END] ---\n');
    return { success: false, error: fetchErr };
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
      LIMIT 5
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
        console.log(`[Telegram Retry] Successfully delivered message ID #${msg.id}`);
      }
    }
  } catch (err) {
    console.error('[Telegram Retry Error]:', err);
  }
}
