import bcrypt from 'bcryptjs';
import db from './db/schema.js';
import { validateWord, containsProfanity, sanitizeText } from './utils/moderation.js';

console.log('--- Starting Automated Backend & Admin Tests for i think ---');

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

// 2. Admin account seeding & security tests
try {
  const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('being_frzi');
  assert(adminUser !== undefined, 'Initial Admin account "being_frzi" exists');
  assert(adminUser.is_admin === 1, 'Admin account has is_admin = 1');
  assert(adminUser.password_hash !== null && adminUser.password_hash.startsWith('$2'), 'Password stored only as a bcrypt hash ($2a/$2b)');
  assert(!adminUser.password_hash.includes('95717650747200ankit'), 'Plain text password is NOT stored anywhere in DB');

  const validPasswordMatch = bcrypt.compareSync('95717650747200ankit', adminUser.password_hash);
  assert(validPasswordMatch === true, 'Admin password verifies correctly against bcrypt hash');

  const invalidPasswordMatch = bcrypt.compareSync('wrongpassword', adminUser.password_hash);
  assert(invalidPasswordMatch === false, 'Invalid password fails bcrypt comparison');
} catch (err) {
  console.error('Admin security test error:', err);
}

// 3. Word validation test
const val1 = validateWord('Silent');
assert(val1.valid === true, 'validateWord("Silent") is valid');

const val2 = validateWord('ab');
assert(val2.valid === false, 'validateWord("ab") fails short length');

const val3 = validateWord('badword');
assert(val3.valid === false, 'validateWord("badword") fails profanity check');

// 4. Profanity & Sanitization test
assert(containsProfanity('This is a badword example') === true, 'containsProfanity detects badword');
assert(containsProfanity('This is a peaceful thought') === false, 'containsProfanity allows clean text');

const sanitized = sanitizeText('<script>alert(1)</script>');
assert(!sanitized.includes('<script>'), 'sanitizeText escapes script tags');

console.log(`\nTest Summary: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log('🎉 All automated backend & admin tests passed successfully!');
  process.exit(0);
} else {
  console.error('⚠️ Some tests failed.');
  process.exit(1);
}
