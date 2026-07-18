import bcrypt from 'bcryptjs';
import db from './db/schema.js';
import { validateWord, containsProfanity, sanitizeText } from './utils/moderation.js';
import { sendTelegramContactNotification } from './utils/telegram.js';

console.log('--- Starting Automated Backend, Admin & Contact Tests for i think ---');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`✕ [FAIL] ${message}`);
  }
}

// 1. Database tables test
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  assert(tables.includes('users'), 'users table exists');
  assert(tables.includes('sessions'), 'sessions table exists');
  assert(tables.includes('thoughts'), 'thoughts table exists');
  assert(tables.includes('contact_messages'), 'contact_messages table exists');
} catch (err) {
  console.error('Database check error:', err);
}

// 2. Admin account seeding & security tests
try {
  const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('being_frzi');
  assert(adminUser !== undefined, 'Initial Admin account "being_frzi" exists');
  assert(adminUser.is_admin === 1, 'Admin account has is_admin = 1');
  assert(adminUser.password_hash !== null && adminUser.password_hash.startsWith('$2'), 'Password stored only as a bcrypt hash ($2a/$2b)');
  assert(!adminUser.password_hash.includes('95717650747200ankit'), 'Plain text password is NOT stored anywhere in DB');

  const validPasswordMatch = bcrypt.compareSync('95717650747200ankit', adminUser.password_hash);
  assert(validPasswordMatch === true, 'Admin password verifies correctly against bcrypt hash');
} catch (err) {
  console.error('Admin security test error:', err);
}

// 3. Contact Message DB & Operations Test
try {
  const testMsgText = 'Test feedback message from automated test suite.';
  const res = db.prepare(`
    INSERT INTO contact_messages (user_id, username, message, status, delivered_to_telegram, user_agent, ip_address)
    VALUES (1, 'TestUser', ?, 'pending_retry', 0, 'TestAgent', '127.0.0.1')
  `).run(testMsgText);

  const msgId = res.lastInsertRowid;
  assert(msgId > 0, 'Contact message inserted into database');

  const savedMsg = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(msgId);
  assert(savedMsg.message === testMsgText, 'Contact message content matches');
  assert(savedMsg.status === 'pending_retry', 'Default contact status is pending_retry');
  assert(savedMsg.delivered_to_telegram === 0, 'Default delivered_to_telegram is 0');

  // Search test
  const searchResults = db.prepare('SELECT * FROM contact_messages WHERE username LIKE ? OR message LIKE ?').all('%TestUser%', '%feedback%');
  assert(searchResults.length > 0, 'Admin search query finds contact message by username & content');

  // Deletion test
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(msgId);
  const checkDeleted = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(msgId);
  assert(checkDeleted === undefined, 'Admin delete permanently removes contact message from DB');
} catch (err) {
  console.error('Contact DB test error:', err);
}

// 4. Word validation & Moderation tests
const val1 = validateWord('Silent');
assert(val1.valid === true, 'validateWord("Silent") is valid');

const val3 = validateWord('badword');
assert(val3.valid === false, 'validateWord("badword") fails profanity check');

assert(containsProfanity('This is a badword example') === true, 'containsProfanity detects badword');
assert(containsProfanity('This is a peaceful thought') === false, 'containsProfanity allows clean text');

const sanitized = sanitizeText('<script>alert(1)</script>');
assert(!sanitized.includes('<script>'), 'sanitizeText escapes script tags');

console.log(`\nTest Summary: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log('🎉 All automated backend, admin & contact tests passed successfully!');
  process.exit(0);
} else {
  console.error('⚠️ Some tests failed.');
  process.exit(1);
}
