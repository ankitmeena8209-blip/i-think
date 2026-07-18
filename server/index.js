import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import identityRoutes from './routes/identity.js';
import thoughtsRoutes from './routes/thoughts.js';
import contactRoutes from './routes/contact.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/thoughts', thoughtsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Serve static assets in production if dist directory exists (local node server mode)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start standalone server if run directly (e.g. node server/index.js)
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;
  
  function startServer(port) {
    const server = app.listen(port, () => {
      console.log(`\n[i think] Server is live and listening on http://localhost:${port}`);
      console.log(`[i think] TELEGRAM_BOT_TOKEN set: ${Boolean(process.env.TELEGRAM_BOT_TOKEN)}`);
      console.log(`[i think] TELEGRAM_CHAT_ID set: ${Boolean(process.env.TELEGRAM_CHAT_ID)}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[i think] Port ${port} is in use. Trying port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('[i think] Server error:', err);
      }
    });
  }

  startServer(DEFAULT_PORT);
}

export default app;
