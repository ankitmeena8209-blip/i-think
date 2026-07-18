import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine Database File Path
// On Vercel serverless environment, the root filesystem is read-only, so /tmp is used as an ephemeral fallback.
// Locally, the database is stored persistently in server/db/ithink.db.
const isVercel = process.env.VERCEL === '1' || process.env.NOW_BUILDER;
const dbDir = isVercel ? '/tmp' : path.join(__dirname);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'ithink.db');
console.log(`[i think DB] Opening SQLite Database at: ${dbPath}`);

const db = new Database(dbPath);

// Enable WAL mode for high performance
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  // Ignore WAL pragma if in constrained environment
}

// Ensure all schema tables exist WITHOUT dropping existing data
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

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending_retry',
    delivered_to_telegram INTEGER DEFAULT 0,
    user_agent TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_thoughts_username ON thoughts(username);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact_messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
`);

// Safe Migrations: Add new columns if missing without affecting existing user rows
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
} catch (e) { /* Column already exists */ }

/**
 * Seed Initial Admin Account
 * Ensures admin account configured via ADMIN_USER & ADMIN_PASS environment variables exists.
 */
function seedInitialAdmin() {
  const adminUsername = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASS;

  if (!adminUsername || !adminPassword) {
    console.warn('[i think DB] ADMIN_USER or ADMIN_PASS environment variables are not set. Skipping initial admin seeding.');
    return;
  }

  const existingAdmin = db.prepare('SELECT id, password_hash, is_admin FROM users WHERE username = ?').get(adminUsername);
  
  if (!existingAdmin) {
    console.log(`[i think DB] Initializing Admin Account for "${adminUsername}"...`);
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    db.prepare(`
      INSERT INTO users (username, word1, word2, is_admin, password_hash, ip_address)
      VALUES (?, ?, ?, 1, ?, '127.0.0.1')
    `).run(adminUsername, 'Admin', 'User', passwordHash);

    console.log('[i think DB] Initial Admin Account created securely with bcrypt password hash.');
  } else if (!existingAdmin.password_hash || !existingAdmin.is_admin) {
    console.log(`[i think DB] Updating Admin Account "${adminUsername}" with initial bcrypt password hash...`);
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    db.prepare(`
      UPDATE users SET is_admin = 1, password_hash = ? WHERE username = ?
    `).run(passwordHash, adminUsername);
  }
}

seedInitialAdmin();

export default db;
