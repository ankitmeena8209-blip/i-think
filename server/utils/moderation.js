// Profanity list for content moderation
const PROFANITY_SET = new Set([
  'badword', 'abuse', 'hate', 'slur', 'nazi', 'racist', 'kill', 'terrorist',
  'bitch', 'bastard', 'fuck', 'shit', 'cunt', 'asshole', 'dick', 'pussy',
  'cock', 'motherfucker', 'whore', 'slut', 'nigger', 'faggot', 'retard'
]);

/**
 * Validates a single word for username creation.
 * Rules: Only letters A-Z, 3-15 characters, no spaces, no symbols, no profanity.
 */
export function validateWord(word) {
  if (typeof word !== 'string') return { valid: false, reason: 'Word must be text.' };
  
  const trimmed = word.trim();
  if (trimmed.length < 3 || trimmed.length > 15) {
    return { valid: false, reason: 'Each word must be between 3 and 15 characters.' };
  }

  if (!/^[a-zA-Z]+$/.test(trimmed)) {
    return { valid: false, reason: 'Words can only contain letters (A–Z), no numbers, spaces or symbols.' };
  }

  if (PROFANITY_SET.has(trimmed.toLowerCase())) {
    return { valid: false, reason: 'Words containing offensive language are not allowed.' };
  }

  return { valid: true };
}

/**
 * Capitalizes first letter of a word and lowercases the rest.
 */
export function capitalizeWord(word) {
  if (!word) return '';
  const clean = word.trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Checks if a string contains any profane words.
 */
export function containsProfanity(text) {
  if (!text) return false;
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = normalized.split(/\s+/);
  return tokens.some(token => PROFANITY_SET.has(token));
}

/**
 * Sanitizes thought content text.
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  // Basic HTML entity encoding
  return text
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// In-memory rate limiting map
const rateLimitMap = new Map();

/**
 * Checks rate limits for a given identifier (IP or User ID).
 * Limit: maxRequests per windowMs.
 */
export function checkRateLimit(identifier, limit = 5, windowMs = 60000) {
  const now = Date.now();
  const userRecord = rateLimitMap.get(identifier) || { count: 0, resetTime: now + windowMs };

  if (now > userRecord.resetTime) {
    userRecord.count = 1;
    userRecord.resetTime = now + windowMs;
  } else {
    userRecord.count += 1;
  }

  rateLimitMap.set(identifier, userRecord);

  if (userRecord.count > limit) {
    const waitSeconds = Math.ceil((userRecord.resetTime - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  return { allowed: true };
}
