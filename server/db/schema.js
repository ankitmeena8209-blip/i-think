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
 * Ensures admin account in DB is synced with ADMIN_USER & ADMIN_PASS environment variables.
 * Automatically updates old admin username and password hash in DB if environment variables change.
 */
function seedInitialAdmin() {
  const adminUsername = process.env.ADMIN_USER || process.env.ADMIN_USERNAME || 'im_ankiit';
  const adminPassword = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD || '82090760107200ankitbeingfrzi';

  const newHash = bcrypt.hashSync(adminPassword, 10);

  // Check if any admin account currently exists (by username or is_admin flag)
  const existingAdmin = db.prepare('SELECT id, username, password_hash, is_admin FROM users WHERE is_admin = 1 OR username = ?').get(adminUsername);

  if (existingAdmin) {
    // Update existing admin account with the latest ADMIN_USER and ADMIN_PASS from environment
    db.prepare(`
      UPDATE users 
      SET username = ?, is_admin = 1, password_hash = ?
      WHERE id = ?
    `).run(adminUsername, newHash, existingAdmin.id);
    console.log(`[i think DB] Admin Account (ID: ${existingAdmin.id}) synced with environment variables: username="${adminUsername}".`);
  } else {
    // Create new admin account
    console.log(`[i think DB] Creating new Admin Account for "${adminUsername}"...`);
    db.prepare(`
      INSERT INTO users (username, word1, word2, is_admin, password_hash, ip_address)
      VALUES (?, 'Admin', 'User', 1, ?, '127.0.0.1')
    `).run(adminUsername, newHash);
    console.log('[i think DB] Admin Account created securely with environment credentials.');
  }
}

seedInitialAdmin();

export default db;
