import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel, the filesystem is read-only except /tmp
const isVercel = process.env.VERCEL === '1' || process.env.NOW_BUILDER;
const dbDir = isVercel ? '/tmp' : path.join(__dirname);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'ithink.db');
const db = new Database(dbPath);

// Enable WAL mode for local performance if not memory
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  // Ignore WAL pragma if in constrained serverless env
}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    word1 TEXT NOT NULL,
    word2 TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_thoughts_username ON thoughts(username);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`);

// Migration helper for existing DBs
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
} catch (e) { /* Column already exists */ }

/**
 * Seed Initial Admin Account
 * Username: being_frzi
 * Initial Password: 95717650747200ankit
 * Only created if an admin account does not already exist.
 */
function seedInitialAdmin() {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ? OR is_admin = 1').get('being_frzi');
  
  if (!existingAdmin) {
    console.log('[i think] Initializing Admin Account for "being_frzi"...');
    const initialPassword = '95717650747200ankit';
    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(initialPassword, saltRounds);

    db.prepare(`
      INSERT INTO users (username, word1, word2, is_admin, password_hash, ip_address)
      VALUES (?, ?, ?, 1, ?, '127.0.0.1')
    `).run('being_frzi', 'Being', 'Frzi', passwordHash);

    console.log('[i think] Initial Admin Account created securely with bcrypt password hash.');
  }
}

seedInitialAdmin();

export default db;
