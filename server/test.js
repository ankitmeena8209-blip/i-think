import db from './db/schema.js';
import { validateWord, containsProfanity, sanitizeText } from './utils/moderation.js';

console.log('--- Starting Automated Backend Tests for i think ---');

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
} catch (err) {
  console.error('Database check error:', err);
}

// 2. Word validation test
const val1 = validateWord('Silent');
assert(val1.valid === true, 'validateWord("Silent") is valid');

const val2 = validateWord('ab');
assert(val2.valid === false, 'validateWord("ab") fails short length');

const val3 = validateWord('Silent123');
assert(val3.valid === false, 'validateWord("Silent123") fails numbers');

const val4 = validateWord('badword');
assert(val4.valid === false, 'validateWord("badword") fails profanity check');

// 3. Profanity & Sanitization test
assert(containsProfanity('This is a badword example') === true, 'containsProfanity detects badword');
assert(containsProfanity('This is a peaceful thought') === false, 'containsProfanity allows clean text');

const sanitized = sanitizeText('<script>alert(1)</script>');
assert(!sanitized.includes('<script>'), 'sanitizeText escapes script tags');

// 4. User creation & Thought publishing test
try {
  const testW1 = 'Test';
  const testW2 = 'Runner';
  const testUser = 'TestRunner';

  // Cleanup test user if exists
  db.prepare('DELETE FROM users WHERE username = ?').run(testUser);

  const res = db.prepare('INSERT INTO users (username, word1, word2, ip_address) VALUES (?, ?, ?, ?)').run(testUser, testW1, testW2, '127.0.0.1');
  const userId = res.lastInsertRowid;
  assert(userId > 0, 'User inserted into database');

  const thoughtRes = db.prepare('INSERT INTO thoughts (user_id, username, content, ip_address) VALUES (?, ?, ?, ?)').run(userId, testUser, 'A quiet thought for automated testing.', '127.0.0.1');
  assert(thoughtRes.lastInsertRowid > 0, 'Thought inserted into database');

  const thoughts = db.prepare('SELECT * FROM thoughts WHERE username = ?').all(testUser);
  assert(thoughts.length === 1 && thoughts[0].content === 'A quiet thought for automated testing.', 'Thought retrieved successfully');

  // Clean up
  db.prepare('DELETE FROM thoughts WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
} catch (err) {
  console.error('User & Thought test error:', err);
}

console.log(`\nTest Summary: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log('🎉 All automated backend tests passed successfully!');
  process.exit(0);
} else {
  console.error('⚠️ Some tests failed.');
  process.exit(1);
}
