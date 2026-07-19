import express from 'express';
import { db } from '../../src/lib/firebase.js';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { getSessionUser } from './auth.js';
import { sanitizeText, containsProfanity, checkRateLimit } from '../utils/moderation.js';

const router = express.Router();

// GET /api/thoughts
router.get('/', async (req, res) => {
  try {
    const sort = req.query.sort === 'top' ? 'top' : 'latest';
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const q = query(
      collection(db, 'thoughts'),
      orderBy('createdAt', 'desc'),
      limit(limitNum)
    );

    const snapshot = await getDocs(q);
    const thoughts = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      let createdAtIso = new Date().toISOString();
      if (data.created_at) {
        createdAtIso = data.created_at;
      } else if (data.createdAt?.toDate) {
        createdAtIso = data.createdAt.toDate().toISOString();
      }

      return {
        id: docSnap.id,
        username: data.username || 'Anonymous',
        content: data.content || '',
        created_at: createdAtIso,
        contentLength: (data.content || '').length
      };
    });

    if (sort === 'top') {
      thoughts.sort((a, b) => b.contentLength - a.contentLength);
    }

    return res.json({ thoughts, hasMore: false, page: 1 });
  } catch (err) {
    console.error('Error fetching thoughts from Firestore in backend:', err);
    return res.json({ thoughts: [], hasMore: false, page: 1 });
  }
});

// POST /api/thoughts
router.post('/', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'You must create an identity to publish thoughts.' });
  }

  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Rate limiting (max 5 thoughts per 60s per user)
  const rateLimit = checkRateLimit(`thought_${user.id}_${clientIp}`, 5, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Slow down! Please wait ${rateLimit.waitSeconds} seconds before posting another thought.`
    });
  }

  const { content } = req.body || {};

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Thought content cannot be empty.' });
  }

  if (content.length > 300) {
    return res.status(400).json({ error: 'Thought exceeds maximum length of 300 characters.' });
  }

  if (containsProfanity(content)) {
    return res.status(400).json({ error: 'Your thought contains offensive or inappropriate language.' });
  }

  const sanitizedContent = sanitizeText(content);
  const nowIso = new Date().toISOString();

  try {
    const docRef = await addDoc(collection(db, 'thoughts'), {
      userId: user.id || user.username,
      user_id: user.id || user.username,
      username: user.username,
      content: sanitizedContent,
      created_at: nowIso,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ip_address: clientIp
    });

    const newThought = {
      id: docRef.id,
      username: user.username,
      content: sanitizedContent,
      created_at: nowIso
    };

    return res.json({ success: true, thought: newThought });
  } catch (err) {
    console.error('Error inserting thought into Firestore:', err);
    return res.status(500).json({ error: 'Failed to publish thought. Please try again.' });
  }
});

export default router;
