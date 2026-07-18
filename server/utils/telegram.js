import 'dotenv/config';
import db from '../db/schema.js';

// Backend Fallback Bot Token (Kept strictly on the server)
const HARDCODED_BOT_TOKEN = '8993080619:AAHdX1Z-Bl5IyMX_OLRD5GXcRu7cKCGknpg';

// Clean Date/Time Formatter (e.g. 18 Jul 2026 11:42 PM)
export function formatTelegramTime(dateObj = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
}

/**
 * Formats and sends a contact message notification to Telegram with authenticated user metadata.
 */
export async function sendTelegramContactNotification({ username, userId, rawDate, message, userAgent, ipAddress }) {
  console.log('\n--- [TELEGRAM BOT API AUDIT START] ---');

  // 1. Resolve Token
  const rawToken = process.env.TELEGRAM_BOT_TOKEN || 
                   process.env.TELEGRAM_TOKEN || 
                   process.env.BOT_TOKEN || 
                   HARDCODED_BOT_TOKEN;

  let cleanToken = rawToken.trim();
  if (cleanToken.toLowerCase().startsWith('bot')) {
    cleanToken = cleanToken.substring(3);
  }

  // 2. Resolve Chat ID
  let rawChatId = process.env.TELEGRAM_CHAT_ID || 
                  process.env.TELEGRAM_CHATID || 
                  process.env.CHAT_ID;

  // Auto-discover Chat ID from Telegram getUpdates if not explicitly set in env
  if (!rawChatId) {
    console.log('[Audit 1.5] TELEGRAM_CHAT_ID not in env. Attempting auto-discovery via getUpdates...');
    try {
      const updatesUrl = `https://api.telegram.org/bot${cleanToken}/getUpdates`;
      const updatesRes = await fetch(updatesUrl);
      const updatesData = await updatesRes.json();

      if (updatesData.ok && Array.isArray(updatesData.result) && updatesData.result.length > 0) {
        for (let i = updatesData.result.length - 1; i >= 0; i--) {
          const update = updatesData.result[i];
          const chatId = update.message?.chat?.id || update.channel_post?.chat?.id || update.my_chat_member?.chat?.id;
          if (chatId) {
            rawChatId = String(chatId);
            console.log(`✅ [Audit Auto-Discovery Success] Discovered Chat ID: ${rawChatId}`);
            break;
          }
        }
      }
    } catch (err) {
      console.error('[Audit Auto-Discovery Failed]:', err.message);
    }
  }

  console.log('[Audit 1] Checking Environment Credentials:');
  console.log('  - Token configured:', Boolean(cleanToken));
  console.log('  - Chat ID configured/discovered:', Boolean(rawChatId), rawChatId ? `(ID: ${rawChatId})` : '');

  if (!rawChatId) {
    const errText = 'Missing TELEGRAM_CHAT_ID. Please open your bot on Telegram and send /start so it can discover your Chat ID!';
    console.error('❌ [Telegram Audit Error]:', errText);
    console.log('--- [TELEGRAM BOT API AUDIT END] ---\n');
    return { success: false, error: errText };
  }

  const cleanChatId = String(rawChatId).trim();

  // Format metadata
  const identityName = username || 'Anonymous Stranger';
  const displayUserId = userId ? (typeof userId === 'string' && userId.startsWith('usr_') ? userId : `usr_${userId}`) : 'N/A (Unauthenticated)';
  const formattedTime = formatTelegramTime(rawDate ? new Date(rawDate) : new Date());

  const telegramText = `📩 New Contact Message

Identity:
${identityName}

User ID:
${displayUserId}

Time:
${formattedTime}

Message:
${message}`;

  console.log('[Audit 2] Formatted Telegram Notification Text:');
  console.log(telegramText);

  const apiUrl = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  console.log('[Audit 3] Sending HTTP POST request to Telegram API...');

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
    console.log(`[Audit 4] Telegram API Status: ${response.status} ${response.statusText}`);
    console.log('[Audit 5] Telegram API Response Payload:', JSON.stringify(data, null, 2));

    if (response.ok && data.ok) {
      console.log('✅ [Telegram Audit Success] Notification delivered to Telegram Chat ID:', cleanChatId);
      console.log('--- [TELEGRAM BOT API AUDIT END] ---\n');
      return { success: true, response: data };
    } else {
      let desc = data.description || 'Failed to deliver message to Telegram';
      if (desc.includes('chat not found') || desc.includes('bot was blocked')) {
        desc += ' (Please open your bot on Telegram and press /start!)';
      }
      const errMsg = `Telegram Error (${data.error_code || response.status}): ${desc}`;
      console.error('❌ [Telegram Audit Failure]:', errMsg);
      console.log('--- [TELEGRAM BOT API AUDIT END] ---\n');
      return { success: false, error: errMsg };
    }
  } catch (err) {
    const fetchErr = `Telegram Network Exception: ${err.message || err}`;
    console.error('❌ [Telegram Audit Exception]:', fetchErr);
    console.log('--- [TELEGRAM BOT API AUDIT END] ---\n');
    return { success: false, error: fetchErr };
  }
}

/**
 * Background routine to retry delivering pending messages to Telegram.
 */
export async function retryPendingTelegramMessages() {
  try {
    const pendingMessages = await db.prepare(`
      SELECT * FROM contact_messages 
      WHERE delivered_to_telegram = 0 
      ORDER BY created_at ASC 
      LIMIT 5
    `).all();

    if (pendingMessages.length === 0) return;

    for (const msg of pendingMessages) {
      const result = await sendTelegramContactNotification({
        username: msg.username,
        userId: msg.user_id,
        rawDate: msg.created_at,
        message: msg.message,
        userAgent: msg.user_agent,
        ipAddress: msg.ip_address
      });

      if (result.success) {
        await db.prepare(`
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
