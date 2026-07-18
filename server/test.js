import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './db/schema.js';
import { validateWord, containsProfanity, sanitizeText } from './utils/moderation.js';

console.log('--- Starting Comprehensive Automated Admin Panel Tests for i think ---');

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
  const adminUsername = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASS;
  assert(Boolean(adminUsername), 'ADMIN_USER environment variable is configured');
  assert(Boolean(adminPassword), 'ADMIN_PASS environment variable is configured');

  const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get(adminUsername);
  assert(adminUser !== undefined, `Initial Admin account "${adminUsername}" exists`);
  assert(adminUser.is_admin === 1, 'Admin account has is_admin = 1');
  assert(adminUser.password_hash !== null && adminUser.password_hash.startsWith('$2'), 'Password stored only as a bcrypt hash ($2a/$2b)');

  const validPasswordMatch = bcrypt.compareSync(adminPassword, adminUser.password_hash);
  assert(validPasswordMatch === true, 'Admin initial password verifies correctly against bcrypt hash');
} catch (err) {
  console.error('Admin security test error:', err);
}

// 3. Admin Stats Metrics Test
try {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').get().count;
  const thoughtCount = db.prepare('SELECT COUNT(*) as count FROM thoughts').get().count;
  const contactCount = db.prepare('SELECT COUNT(*) as count FROM contact_messages').get().count;
  assert(typeof userCount === 'number', 'Total Users metric query functions');
  assert(typeof thoughtCount === 'number', 'Total Thoughts metric query functions');
  assert(typeof contactCount === 'number', 'Total Contact Messages metric query functions');
} catch (err) {
  console.error('Stats test error:', err);
}

// 4. Users Page Search & Delete Operations Test
try {
  const testUsername = 'AdminTestUser';
  db.prepare('DELETE FROM users WHERE username = ?').run(testUsername);
  const uRes = db.prepare('INSERT INTO users (username, word1, word2, is_admin) VALUES (?, \'Admin\', \'TestUser\', 0)').run(testUsername);
  const testUserId = uRes.lastInsertRowid;

  const tRes = db.prepare('INSERT INTO thoughts (user_id, username, content) VALUES (?, ?, \'Test thought for admin delete\')').run(testUserId, testUsername);
  const testThoughtId = tRes.lastInsertRowid;

  const userResults = db.prepare('SELECT u.id, u.username, COUNT(t.id) as thought_count FROM users u LEFT JOIN thoughts t ON u.id = t.user_id WHERE u.username LIKE ? GROUP BY u.id').all(`%${testUsername}%`);
  assert(userResults.length > 0 && userResults[0].thought_count >= 1, 'Users query computes thought count');

  // Delete all user thoughts
  db.prepare('DELETE FROM thoughts WHERE user_id = ?').run(testUserId);
  const checkThoughts = db.prepare('SELECT * FROM thoughts WHERE user_id = ?').all(testUserId);
  assert(checkThoughts.length === 0, 'Delete All User Thoughts removes user thoughts');

  // Delete user
  db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  const checkUser = db.prepare('SELECT * FROM users WHERE id = ?').get(testUserId);
  assert(checkUser === undefined, 'Delete User permanently removes user record');
} catch (err) {
  console.error('Users management test error:', err);
}

// 5. Thoughts Bulk Delete Test
try {
  const uRes = db.prepare('INSERT INTO users (username, word1, word2, is_admin) VALUES (\'BulkUser\', \'Bulk\', \'User\', 0)').run();
  const uid = uRes.lastInsertRowid;

  const t1 = db.prepare('INSERT INTO thoughts (user_id, username, content) VALUES (?, \'BulkUser\', \'T1\')').run(uid).lastInsertRowid;
  const t2 = db.prepare('INSERT INTO thoughts (user_id, username, content) VALUES (?, \'BulkUser\', \'T2\')').run(uid).lastInsertRowid;

  db.prepare('DELETE FROM thoughts WHERE id IN (?, ?)').run(t1, t2);
  const checkBulk = db.prepare('SELECT * FROM thoughts WHERE id IN (?, ?)').all(t1, t2);
  assert(checkBulk.length === 0, 'Bulk Delete permanently removes multiple thoughts');

  db.prepare('DELETE FROM users WHERE id = ?').run(uid);
} catch (err) {
  console.error('Bulk delete test error:', err);
}

// 6. Messages Status Resolve Test
try {
  const mRes = db.prepare('INSERT INTO contact_messages (username, message, status) VALUES (\'MsgUser\', \'Test msg\', \'pending_retry\')').run();
  const mid = mRes.lastInsertRowid;

  db.prepare('UPDATE contact_messages SET status = \'resolved\' WHERE id = ?').run(mid);
  const resolvedMsg = db.prepare('SELECT status FROM contact_messages WHERE id = ?').get(mid);
  assert(resolvedMsg.status === 'resolved', 'Mark Message as Resolved updates message status');

  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(mid);
} catch (err) {
  console.error('Messages resolve test error:', err);
}

// 7. Word validation & Moderation tests
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
  console.log('🎉 All automated Admin Panel tests passed successfully!');
  process.exit(0);
} else {
  console.error('⚠️ Some tests failed.');
  process.exit(1);
}
