const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validateEmail, validateName, validatePassword } = require('./passwordPolicy');
const { loadDatabaseConfig } = require('./config');
const { openDatabase } = require('./database');
const { createSqliteDatabase, defaultSqlitePath } = require('./database/sqlite');
const { assertSchemaCurrent } = require('./database/migrations');

const BCRYPT_ROUNDS = 12;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const HEALTH_CHECK_TIMEOUT_MS = 3000;

let database;

function nowIso() {
  return new Date().toISOString();
}

// PostgreSQL returns BIGINT ids as strings and TIMESTAMPTZ values as Date objects;
// normalise both so API responses look the same on either database.
function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function closeActiveDatabase() {
  const active = database;
  database = undefined;
  if (!active) {
    return Promise.resolve();
  }
  if (active.closeSync) {
    active.closeSync();
    return Promise.resolve();
  }
  return active.close();
}

/** Opens the local SQLite database (development and tests) and makes it active. */
function initDb(dbPath = defaultSqlitePath()) {
  closeActiveDatabase();
  database = createSqliteDatabase({ filename: dbPath });
  return database.raw;
}

/** Makes an already-open database driver active (used for PostgreSQL). */
function useDatabase(instance) {
  if (database && database !== instance) {
    closeActiveDatabase();
  }
  database = instance;
  return database;
}

function getDatabase() {
  if (!database) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('The database is not connected.');
    }
    initDb();
  }
  return database;
}

/** Raw node:sqlite handle for SQLite-specific tooling and tests. */
function getDb() {
  const active = getDatabase();
  if (active.dialect !== 'sqlite') {
    throw new Error('getDb() is only available for the SQLite driver.');
  }
  return active.raw;
}

async function connectDatabase(databaseConfig = loadDatabaseConfig()) {
  const instance = openDatabase(databaseConfig);
  try {
    if (instance.dialect === 'postgres') {
      await instance.ping();
      await assertSchemaCurrent(instance);
    }
  } catch (error) {
    await instance.close().catch(() => {});
    throw error;
  }
  return useDatabase(instance);
}

async function checkDatabaseHealth() {
  let timer;
  try {
    await Promise.race([
      getDatabase().ping(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Database health check timed out.')), HEALTH_CHECK_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function closeDb() {
  return closeActiveDatabase();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function publicUser(row, executor = getDatabase()) {
  const countRow = await executor.queryOne(
    'SELECT COUNT(*) AS count FROM scan_records WHERE user_id = $1',
    [row.id],
  );
  const dosha = await executor.queryOne(
    'SELECT dosha, confidence FROM user_dosha WHERE user_id = $1',
    [row.id],
  );

  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    dosha: dosha?.dosha ?? null,
    doshaConfidence: dosha?.confidence ?? null,
    scanCount: Number(countRow.count),
  };
}

function duplicateEmailError() {
  return Object.assign(new Error('An account with this email already exists.'), { status: 409 });
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

  const db = getDatabase();
  const existing = await db.queryOne('SELECT id FROM users WHERE email = $1', [emailResult.value]);
  if (existing) {
    throw duplicateEmailError();
  }

  const passwordHash = await bcrypt.hash(passwordResult.value, BCRYPT_ROUNDS);
  try {
    return await db.transaction(async tx => {
      const timestamp = nowIso();
      const inserted = await tx.queryOne(
        `INSERT INTO users (name, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [nameResult.value, emailResult.value, passwordHash, timestamp, timestamp],
      );
      return createSession(inserted.id, tx);
    });
  } catch (error) {
    // Two simultaneous sign-ups for one email: the database UNIQUE constraint decides.
    if (db.isUniqueViolation(error)) {
      throw duplicateEmailError();
    }
    throw error;
  }
}

async function loginUser({ email, password }) {
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);
  const dummyHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

  const user = emailResult.ok
    ? await getDatabase().queryOne(
        'SELECT id, name, email, password_hash FROM users WHERE email = $1',
        [emailResult.value],
      )
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

async function createSession(userId, executor = getDatabase()) {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await executor.execute(
    `INSERT INTO sessions (user_id, token_hash, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, hashToken(token), expiresAt, timestamp],
  );

  const user = await executor.queryOne('SELECT id, name, email FROM users WHERE id = $1', [userId]);
  return { token, user: await publicUser(user, executor) };
}

async function getUserByToken(token) {
  if (!token) {
    return null;
  }

  const db = getDatabase();
  const session = await db.queryOne(
    `SELECT sessions.id AS id, sessions.user_id AS user_id, sessions.expires_at AS expires_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1`,
    [hashToken(token)],
  );

  if (!session) {
    return null;
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await db.execute('DELETE FROM sessions WHERE id = $1', [session.id]);
    return null;
  }

  const user = await db.queryOne('SELECT id, name, email FROM users WHERE id = $1', [session.user_id]);
  return publicUser(user, db);
}

async function logoutToken(token) {
  if (!token) {
    return;
  }
  await getDatabase().execute('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

async function saveScanRecord({ userId, dosha, confidence, imageReference }) {
  return getDatabase().transaction(async tx => {
    const timestamp = nowIso();
    const inserted = await tx.queryOne(
      `INSERT INTO scan_records (user_id, dosha, confidence, image_reference, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, dosha ?? null, confidence ?? null, imageReference ?? null, timestamp],
    );

    if (dosha) {
      await tx.execute(
        `INSERT INTO user_dosha (user_id, dosha, confidence, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           dosha = excluded.dosha,
           confidence = excluded.confidence,
           updated_at = excluded.updated_at`,
        [userId, dosha, confidence ?? 0, timestamp],
      );
    }

    const user = await tx.queryOne('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    return {
      scanId: Number(inserted.id),
      user: await publicUser(user, tx),
    };
  });
}

async function getScanRecordsForUser(userId) {
  const rows = await getDatabase().query(
    `SELECT id, dosha, confidence, image_reference, created_at
     FROM scan_records
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC`,
    [userId],
  );
  return rows.map(row => ({
    id: Number(row.id),
    dosha: row.dosha,
    confidence: row.confidence,
    image_reference: row.image_reference,
    created_at: toIso(row.created_at),
  }));
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

  const existing = await getDatabase().queryOne('SELECT id FROM users WHERE email = $1', [
    emailResult.value,
  ]);
  if (existing) {
    return;
  }

  await registerUser({
    name: nameResult.value,
    email: emailResult.value,
    password: passwordResult.value,
  });
}

module.exports = {
  BCRYPT_ROUNDS,
  initDb,
  useDatabase,
  getDatabase,
  getDb,
  connectDatabase,
  checkDatabaseHealth,
  registerUser,
  loginUser,
  getUserByToken,
  logoutToken,
  saveScanRecord,
  getScanRecordsForUser,
  seedDevUserIfRequested,
  closeDb,
  publicUser,
  hashToken,
};
