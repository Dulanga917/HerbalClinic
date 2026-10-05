const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbPath = path.join(os.tmpdir(), `herbalclinic-test-${process.pid}.sqlite`);
process.env.SQLITE_PATH = dbPath;

const {
  initDb,
  closeDb,
  registerUser,
  loginUser,
  getUserByToken,
  logoutToken,
  saveScanRecord,
  getScanRecordsForUser,
} = require('./db');

test.beforeEach(() => {
  closeDb();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  initDb(dbPath);
});

test.after(() => {
  closeDb();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});

test('stores a password hash instead of plaintext', async () => {
  const password = 'correct-horse';
  const { user } = await registerUser({
    name: 'Test User',
    email: 'test.user@example.com',
    password,
  });

  const row = require('./db')
    .getDb()
    .prepare('SELECT password_hash FROM users WHERE id = ?')
    .get(Number(user.id));

  assert.ok(row.password_hash);
  assert.notEqual(row.password_hash, password);
  assert.ok(row.password_hash.startsWith('$2'));
  assert.equal(JSON.stringify(row).includes(password), false);
});

test('authenticates with the hashed password and restores a session', async () => {
  await registerUser({
    name: 'Test User',
    email: 'test.user@example.com',
    password: 'correct-horse',
  });

  const { token, user } = await loginUser({
    email: 'test.user@example.com',
    password: 'correct-horse',
  });

  assert.equal(user.email, 'test.user@example.com');
  assert.equal(getUserByToken(token).id, user.id);
});

test('rejects an incorrect password without storing it', async () => {
  await registerUser({
    name: 'Test User',
    email: 'test.user@example.com',
    password: 'correct-horse',
  });

  await assert.rejects(
    () =>
      loginUser({
        email: 'test.user@example.com',
        password: 'wrong-password',
      }),
    /Invalid email or password/,
  );
});

test('associates scans with the authenticated user only', async () => {
  const first = await registerUser({
    name: 'Ada',
    email: 'ada@example.com',
    password: 'password1',
  });
  const second = await registerUser({
    name: 'Bob',
    email: 'bob@example.com',
    password: 'password1',
  });

  saveScanRecord({
    userId: Number(first.user.id),
    dosha: 'Vata',
    confidence: 81,
    imageReference: 'photo.jpg',
  });

  const adaScans = getScanRecordsForUser(Number(first.user.id));
  const bobScans = getScanRecordsForUser(Number(second.user.id));

  assert.equal(adaScans.length, 1);
  assert.equal(adaScans[0].dosha, 'Vata');
  assert.equal(bobScans.length, 0);
});

test('logout invalidates the session token', async () => {
  const { token } = await registerUser({
    name: 'Test User',
    email: 'logout.user@example.com',
    password: 'password1',
  });

  logoutToken(token);
  assert.equal(getUserByToken(token), null);
});
