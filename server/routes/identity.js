import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/schema.js';
import { validateWord, capitalizeWord } from '../utils/moderation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const descriptiveWords = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/words_descriptive.json'), 'utf-8')
);
const natureWords = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/words_nature.json'), 'utf-8')
);

const router = express.Router();

// Helper to check if a username exists in DB
async function isUsernameTaken(username) {
  const row = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  return !!row;
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

  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  try {
    const result = await db.prepare(`
      INSERT INTO users (username, word1, word2, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(username, w1, w2, clientIp);

    const userId = result.lastInsertRowid;
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    await db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(sessionToken, userId, expiresAt);

    // Set secure HttpOnly cookie
    res.cookie('ithink_session', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });

    return res.json({
      success: true,
      user: { id: userId, username, word1: w1, word2: w2 }
    });
  } catch (err) {
    console.error('Error creating user identity:', err);
    return res.status(500).json({ error: 'Failed to create identity. Please try again.' });
  }
});

export default router;
