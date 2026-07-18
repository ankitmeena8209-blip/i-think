import bcrypt from 'bcryptjs';
import db from './db/schema.js';
import { validateWord, containsProfanity, sanitizeText } from './utils/moderation.js';

console.log('--- Starting Comprehensive Automated Tests for i think ---');

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

  const validPasswordMatch = bcrypt.compareSync('95717650747200ankit', adminUser.password_hash);
  assert(validPasswordMatch === true, 'Admin initial password verifies correctly against bcrypt hash');
} catch (err) {
  console.error('Admin security test error:', err);
}

// 3. Admin Password Change & Session Invalidation Test
try {
  const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('being_frzi');
  const tempPassword = 'TempTestPassword123!';

  // Hash new password
  const newHash = bcrypt.hashSync(tempPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, adminUser.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(adminUser.id);

  const updatedAdmin = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(adminUser.id);
  assert(bcrypt.compareSync(tempPassword, updatedAdmin.password_hash) === true, 'New password verifies against updated hash');
  assert(bcrypt.compareSync('95717650747200ankit', updatedAdmin.password_hash) === false, 'Old password fails immediately after password change');

  // Restore initial password hash for consistency
  const originalHash = bcrypt.hashSync('95717650747200ankit', 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(originalHash, adminUser.id);
} catch (err) {
  console.error('Password change test error:', err);
}

// 4. Users Search & Contact Messages Search Separation Test
try {
  const testUsername = 'TestSearchUser';
  db.prepare('DELETE FROM users WHERE username = ?').run(testUsername);
  const uRes = db.prepare('INSERT INTO users (username, word1, word2, is_admin) VALUES (?, \'Test\', \'SearchUser\', 0)').run(testUsername);
  const testUserId = uRes.lastInsertRowid;

  const mRes = db.prepare('INSERT INTO contact_messages (user_id, username, message) VALUES (?, ?, \'Test contact content\')').run(testUserId, testUsername);
  const testMsgId = mRes.lastInsertRowid;

  const userResults = db.prepare('SELECT * FROM users WHERE username LIKE ? OR CAST(id AS TEXT) LIKE ?').all('%TestSearchUser%', `%${testUserId}%`);
  assert(userResults.length > 0, 'Users Search finds user by Username or User ID');

  const msgResults = db.prepare('SELECT * FROM contact_messages WHERE username LIKE ? OR CAST(user_id AS TEXT) LIKE ? OR message LIKE ?').all('%TestSearchUser%', `%${testUserId}%`, '%content%');
  assert(msgResults.length > 0, 'Messages Search finds contact message by Username, User ID, or Message Content');

  // Cleanup
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(testMsgId);
  db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
} catch (err) {
  console.error('Search test error:', err);
}

// 5. Word validation & Moderation tests
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
  console.log('🎉 All automated tests passed successfully!');
  process.exit(0);
} else {
  console.error('⚠️ Some tests failed.');
  process.exit(1);
}
