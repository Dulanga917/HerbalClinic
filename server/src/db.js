const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const DatabaseSync = require('node:sqlite').DatabaseSync;
const { validateEmail, validateName, validatePassword } = require('./passwordPolicy');

const BCRYPT_ROUNDS = 12;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let db;

function nowIso() {
  return new Date().toISOString();
}

function getDbPath() {
  if (process.env.SQLITE_PATH) {
    return process.env.SQLITE_PATH;
  }
  const dataDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'herbalclinic.sqlite');
}

function initDb(dbPath = getDbPath()) {
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_dosha (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      dosha TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scan_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dosha TEXT,
      confidence INTEGER,
      image_reference TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_scan_records_user_id ON scan_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);

  return db;
}

function getDb() {
  if (!db) {
    initDb();
  }
  return db;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicUser(row) {
  const scanCount = getDb()
    .prepare('SELECT COUNT(*) AS count FROM scan_records WHERE user_id = ?')
    .get(row.id).count;

  const dosha = getDb()
    .prepare('SELECT dosha, confidence FROM user_dosha WHERE user_id = ?')
    .get(row.id);

  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    dosha: dosha?.dosha ?? null,
    doshaConfidence: dosha?.confidence ?? null,
    scanCount,
  };
}

async function registerUser({ name, email, password }) {
  const nameResult = validateName(name);
  if (!nameResult.ok) {
    throw Object.assign(new Error(nameResult.message), { status: 400 });
  }
  const emailResult = validateEmail(email);
  if (!emailResult.ok) {
    throw Object.assign(new Error(emailResult.message), { status: 400 });
  }
  const passwordResult = validatePassword(password);
  if (!passwordResult.ok) {
    throw Object.assign(new Error(passwordResult.message), { status: 400 });
  }

  const existing = getDb()
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(emailResult.value);
  if (existing) {
    throw Object.assign(new Error('An account with this email already exists.'), {
      status: 409,
    });
  }

  const passwordHash = await bcrypt.hash(passwordResult.value, BCRYPT_ROUNDS);
  const timestamp = nowIso();
  const result = getDb()
    .prepare(
      `INSERT INTO users (name, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(nameResult.value, emailResult.value, passwordHash, timestamp, timestamp);

  return createSession(Number(result.lastInsertRowid));
}

async function loginUser({ email, password }) {
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);
  const dummyHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

  const user = emailResult.ok
    ? getDb().prepare('SELECT * FROM users WHERE email = ?').get(emailResult.value)
    : null;

  const hashToCheck = user?.password_hash || dummyHash;
  const matches = passwordResult.ok
    ? await bcrypt.compare(passwordResult.value, hashToCheck)
    : await bcrypt.compare('invalid-password-check', dummyHash);

  if (!user || !matches) {
    throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
  }

  return createSession(user.id);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  getDb()
    .prepare(
      `INSERT INTO sessions (user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(userId, hashToken(token), expiresAt, timestamp);

  const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(userId);
  return { token, user: publicUser(user) };
}

function getUserByToken(token) {
  if (!token) {
    return null;
  }

  const session = getDb()
    .prepare(
      `SELECT sessions.id AS id, sessions.user_id AS user_id, sessions.expires_at AS expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?`,
    )
    .get(hashToken(token));

  if (!session) {
    return null;
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    getDb().prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    return null;
  }

  const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  return publicUser(user);
}

function logoutToken(token) {
  if (!token) {
    return;
  }
  getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

function saveScanRecord({ userId, dosha, confidence, imageReference }) {
  const timestamp = nowIso();
  const result = getDb()
    .prepare(
      `INSERT INTO scan_records (user_id, dosha, confidence, image_reference, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(userId, dosha ?? null, confidence ?? null, imageReference ?? null, timestamp);

  if (dosha) {
    getDb()
      .prepare(
        `INSERT INTO user_dosha (user_id, dosha, confidence, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           dosha = excluded.dosha,
           confidence = excluded.confidence,
           updated_at = excluded.updated_at`,
      )
      .run(userId, dosha, confidence ?? 0, timestamp);
  }

  const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(userId);
  return {
    scanId: Number(result.lastInsertRowid),
    user: publicUser(user),
  };
}

function getScanRecordsForUser(userId) {
  return getDb()
    .prepare(
      `SELECT id, dosha, confidence, image_reference, created_at
       FROM scan_records
       WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
    .all(userId);
}

async function seedDevUserIfRequested() {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  if (String(process.env.SEED_DEV_USER).toLowerCase() !== 'true') {
    return;
  }

  const emailResult = validateEmail(process.env.SEED_DEV_EMAIL);
  const passwordResult = validatePassword(process.env.SEED_DEV_PASSWORD);
  const nameResult = validateName(process.env.SEED_DEV_NAME || 'Development User');

  if (!emailResult.ok || !passwordResult.ok || !nameResult.ok) {
    throw new Error(
      'SEED_DEV_USER is enabled but SEED_DEV_EMAIL / SEED_DEV_PASSWORD are missing or invalid.',
    );
  }

  const existing = getDb()
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(emailResult.value);
  if (existing) {
    return;
  }

  await registerUser({
    name: nameResult.value,
    email: emailResult.value,
    password: passwordResult.value,
  });
}

function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

module.exports = {
  initDb,
  getDb,
  registerUser,
  loginUser,
  getUserByToken,
  logoutToken,
  saveScanRecord,
  getScanRecordsForUser,
  seedDevUserIfRequested,
  closeDb,
  publicUser,
};
