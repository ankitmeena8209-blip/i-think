import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateWord, capitalizeWord } from '../utils/moderation.js';
import { getSupabaseClient } from '../utils/supabase.js';
import { detectTableColumns } from '../utils/supabaseSchema.js';
import { setSessionCookie, clearSessionCookie } from './auth.js';
import { getClientIp } from '../utils/ip.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const descriptiveWords = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/words_descriptive.json'), 'utf-8')
);
const natureWords = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/words_nature.json'), 'utf-8')
);

const router = express.Router();
const supabase = getSupabaseClient();

let userSchemaChecked = false;
let hasUsersDeletedAt = false;

async function initUserSchema() {
  if (userSchemaChecked) return hasUsersDeletedAt;
  const userColumns = await detectTableColumns('users', [
    'id', 'username', 'deleted_at'
  ]);
  hasUsersDeletedAt = userColumns.columns.has('deleted_at');
  userSchemaChecked = true;
  return hasUsersDeletedAt;
}

async function isUsernameTaken(username) {
  if (!supabase) return false;

  // On older databases without a `deleted_at` column, hard deletions simply remove
  // the row, so any existing row with this username is still "taken".
  const hasDeletedAt = await initUserSchema();
  const projection = hasDeletedAt ? 'id, deleted_at' : 'id';
  const { data, error } = await supabase.from('users').select(projection).eq('username', username).limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

// Helper to generate N unique available suggestions
async function generateSuggestions(requestedW1, requestedW2, count = 6) {
  const suggestions = [];
  const attemptsLimit = 100;
  let attempts = 0;

  // First try pairing requested W1 with random W2s, and requested W2 with random W1s
  while (suggestions.length < count && attempts < attemptsLimit) {
    attempts++;
    let w1, w2;

    if (attempts % 2 === 0 && requestedW1) {
      w1 = requestedW1;
      w2 = natureWords[Math.floor(Math.random() * natureWords.length)];
    } else if (attempts % 3 === 0 && requestedW2) {
      w1 = descriptiveWords[Math.floor(Math.random() * descriptiveWords.length)];
      w2 = requestedW2;
    } else {
      w1 = descriptiveWords[Math.floor(Math.random() * descriptiveWords.length)];
      w2 = natureWords[Math.floor(Math.random() * natureWords.length)];
    }

    w1 = capitalizeWord(w1);
    w2 = capitalizeWord(w2);
    const combined = `${w1}${w2}`;

    if (!(await isUsernameTaken(combined)) && !suggestions.some(s => s.username === combined)) {
      suggestions.push({ word1: w1, word2: w2, username: combined });
    }
  }

  return suggestions;
}

// POST /api/identity/check
router.post('/check', async (req, res) => {
  const { word1, word2 } = req.body || {};

  const v1 = validateWord(word1);
  if (!v1.valid) {
    return res.json({ available: false, reason: v1.reason, field: 'word1' });
  }

  const v2 = validateWord(word2);
  if (!v2.valid) {
    return res.json({ available: false, reason: v2.reason, field: 'word2' });
  }

  const w1 = capitalizeWord(word1);
  const w2 = capitalizeWord(word2);
  const username = `${w1}${w2}`;

  if (await isUsernameTaken(username)) {
    const suggestions = await generateSuggestions(w1, w2, 6);
    return res.json({
      available: false,
      reason: 'This identity is already taken.',
      username,
      suggestions
    });
  }

  return res.json({
    available: true,
    username,
    word1: w1,
    word2: w2
  });
});

// POST /api/identity/generate
router.post('/generate', async (req, res) => {
  let attempts = 0;
  let found = null;

  while (attempts < 50) {
    attempts++;
    const w1 = capitalizeWord(descriptiveWords[Math.floor(Math.random() * descriptiveWords.length)]);
    const w2 = capitalizeWord(natureWords[Math.floor(Math.random() * natureWords.length)]);
    const username = `${w1}${w2}`;

    if (!(await isUsernameTaken(username))) {
      found = { word1: w1, word2: w2, username };
      break;
    }
  }

  if (!found) {
    return res.status(500).json({ error: 'Failed to generate available identity. Please try again.' });
  }

  return res.json({ success: true, ...found });
});

async function generateAvailableIdentity() {
  let attempts = 0;
  let found = null;

  while (attempts < 50) {
    attempts++;
    const w1 = capitalizeWord(descriptiveWords[Math.floor(Math.random() * descriptiveWords.length)]);
    const w2 = capitalizeWord(natureWords[Math.floor(Math.random() * natureWords.length)]);
    const username = `${w1}${w2}`;

    if (!(await isUsernameTaken(username))) {
      found = { word1: w1, word2: w2, username };
      break;
    }
  }

  if (!found) {
    throw new Error('Failed to generate available identity. Please try again.');
  }

  return found;
}

// POST /api/identity/validate
router.post('/validate', async (req, res) => {
  const cookieValue = req.cookies?.ithink_user;
  if (!cookieValue) {
    return res.json({ valid: true, refreshed: false, user: null });
  }

  let parsedUser = null;
  try {
    // cookie-parser already URL-decodes cookie values, so parse JSON directly
    parsedUser = JSON.parse(cookieValue);
  } catch (err) {
    return res.json({ valid: true, refreshed: false, user: null });
  }

  if (!parsedUser?.id) {
    return res.json({ valid: true, refreshed: false, user: null });
  }

  if (!supabase) {
    return res.json({ valid: true, refreshed: false, user: parsedUser });
  }

  try {
    const userColumns = await detectTableColumns('users', [
      'id', 'username', 'word1', 'word2', 'deleted_at'
    ]);
    const hasDeletedAt = userColumns.columns.has('deleted_at');

    const projection = hasDeletedAt
      ? 'id, username, word1, word2, deleted_at'
      : 'id, username, word1, word2';

    const { data, error } = await supabase
      .from('users')
      .select(projection)
      .eq('id', parsedUser.id)
      .maybeSingle();

    // User no longer exists OR was soft-deleted — clear the stale session and ask for a new identity.
    // We do NOT auto-create a new account here so the visitor can consciously choose a new identity.
    if (error || !data || (hasDeletedAt && data.deleted_at)) {
      clearSessionCookie(res);
      res.clearCookie('ithink_user', { path: '/' });
      return res.json({ valid: false, refreshed: false, user: null });
    }

    return res.json({
      valid: true,
      refreshed: false,
      user: {
        id: data.id,
        username: data.username,
        word1: data.word1,
        word2: data.word2
      }
    });
  } catch (err) {
    // If the query is broken due to a schema mismatch, do NOT silently re-trust a
    // potentially-deleted session. Log the error and log the user out.
    if (err?.code === '42703' || /column .* does not exist/i.test(err?.message || '')) {
      console.warn('[identity] Schema mismatch during validate — clearing session:', err.message);
      clearSessionCookie(res);
      res.clearCookie('ithink_user', { path: '/' });
      return res.json({ valid: false, refreshed: false, user: null });
    }
    console.error('Error validating anonymous identity:', err);
    return res.status(500).json({ error: 'Failed to validate anonymous identity.' });
  }
});

// POST /api/identity/create
router.post('/create', async (req, res) => {
  const { word1, word2 } = req.body || {};

  const v1 = validateWord(word1);
  if (!v1.valid) return res.status(400).json({ error: v1.reason });

  const v2 = validateWord(word2);
  if (!v2.valid) return res.status(400).json({ error: v2.reason });

  const w1 = capitalizeWord(word1);
  const w2 = capitalizeWord(word2);
  const username = `${w1}${w2}`;

  if (await isUsernameTaken(username)) {
    const suggestions = await generateSuggestions(w1, w2, 6);
    return res.status(409).json({
      error: 'This identity is already taken.',
      suggestions
    });
  }

  const clientIp = getClientIp(req);

  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured.' });
    }

    const { data: createdUser, error } = await supabase
      .from('users')
      .insert([{
        username,
        word1: w1,
        word2: w2,
        is_admin: 0,
        ip_address: clientIp
      }])
      .select('id, username, word1, word2')
      .single();

    if (error) {
      throw error;
    }

    setSessionCookie(res, {
      id: createdUser?.id,
      username: createdUser?.username || username,
      word1: createdUser?.word1 || w1,
      word2: createdUser?.word2 || w2,
      isAdmin: false
    });

    return res.json({
      success: true,
      user: {
        id: createdUser?.id,
        username: createdUser?.username || username,
        word1: createdUser?.word1 || w1,
        word2: createdUser?.word2 || w2
      }
    });
  } catch (err) {
    console.error('Error creating user identity:', err);
    return res.status(500).json({ error: 'Failed to create identity. Please try again.' });
  }
});

export default router;
