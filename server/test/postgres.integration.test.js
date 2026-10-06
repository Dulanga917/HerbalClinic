// PostgreSQL integration tests: the real Express app and repository code, the production
// `pg` driver and the real SQL migrations, against PGlite (local PostgreSQL compiled to
// WebAssembly) or TEST_DATABASE_URL. These do not prove anything about a hosted provider's
// networking, TLS certificates or connection pooler; see server/README.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;
delete process.env.DATABASE_URL;

const { createTestDatabase } = require('./helpers/postgresTestDatabase');
const { listen } = require('./helpers/http');
const db = require('../src/db');
const { createApp } = require('../src/index');
const { loadConfig } = require('../src/config');
const { createPostgresDatabase } = require('../src/database/postgres');
const { MIGRATIONS_DIR, runMigrations, assertSchemaCurrent } = require('../src/database/migrations');

const silentLogger = { error: () => {} };
const randomEmail = () => `pg.${crypto.randomBytes(5).toString('hex')}@example.test`;
const randomPassword = () => `Pw-${crypto.randomBytes(9).toString('hex')}`;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const GENERIC_ERROR = 'Something went wrong. Please try again.';

let tdb;
let api;

const geminiStub = {
  analyseSkinIssue: async () => ({ status: 'no_clear_concern' }),
  getHerbalRecommendations: async () => [],
  getDailyTip: async () => 'Drink warm water.',
};

function connectActive(target = tdb.target) {
  return db.connectDatabase({
    client: 'postgres',
    databaseUrl: target.databaseUrl,
    sslMode: target.sslMode,
    searchPath: target.searchPath,
    poolMax: 5,
    logger: silentLogger,
  });
}

async function register(overrides = {}) {
  const credentials = { name: 'PG User', email: randomEmail(), password: randomPassword(), ...overrides };
  const res = await api.request('POST', '/api/v1/auth/register', { body: credentials });
  return { ...credentials, res, token: res.body?.token, user: res.body?.user };
}

function assertNoInternals(text) {
  for (const fragment of [
    'relation',
    'does not exist',
    'syntax',
    '42P01',
    'ECONNREFUSED',
    'postgres',
    'password_hash',
    tdb.target.databaseUrl,
    new URL(tdb.target.databaseUrl).port,
    'stack',
    ...(tdb.target.searchPath ? [tdb.target.searchPath] : []),
  ]) {
    assert.equal(text.includes(fragment), false, `response leaked "${fragment}"`);
  }
}

test.before(async () => {
  tdb = await createTestDatabase();
  console.log(`# PostgreSQL backend: ${tdb.kind}`);
  await runMigrations(tdb.database);
  await connectActive();
  api = await listen(
    createApp({
      config: loadConfig({ NODE_ENV: 'test' }),
      gemini: geminiStub,
      rateLimits: {
        register: { limit: 1000 },
        loginIp: { limit: 1000 },
        loginAccount: { limit: 1000 },
        api: { limit: 10000 },
      },
    }),
  );
});

test.after(async () => {
  if (api) {
    await api.close();
  }
  await db.closeDb().catch(() => {});
  if (tdb) {
    await tdb.cleanup();
  }
});

test('migrations create the schema faithfully (types, constraints, cascade, RLS)', async () => {
  const pg = tdb.database;
  const tables = (
    await pg.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema() ORDER BY table_name`,
    )
  ).map(row => row.table_name);
  assert.deepEqual(tables, ['scan_records', 'schema_migrations', 'sessions', 'user_dosha', 'users']);

  const columns = new Map(
    (
      await pg.query(
        `SELECT table_name, column_name, data_type, is_nullable, is_identity
         FROM information_schema.columns WHERE table_schema = current_schema()`,
      )
    ).map(row => [`${row.table_name}.${row.column_name}`, row]),
  );
  const expectType = (column, type, nullable = 'NO') => {
    assert.equal(columns.get(column)?.data_type, type, column);
    assert.equal(columns.get(column)?.is_nullable, nullable, `${column} nullability`);
  };
  for (const table of ['users', 'user_dosha', 'scan_records', 'sessions']) {
    expectType(`${table}.id`, 'bigint');
    assert.equal(columns.get(`${table}.id`).is_identity, 'YES');
  }
  expectType('users.name', 'text');
  expectType('users.email', 'text');
  expectType('users.password_hash', 'text');
  expectType('users.created_at', 'timestamp with time zone');
  expectType('users.updated_at', 'timestamp with time zone');
  expectType('user_dosha.user_id', 'bigint');
  expectType('user_dosha.confidence', 'integer');
  expectType('scan_records.user_id', 'bigint');
  expectType('scan_records.dosha', 'text', 'YES');
  expectType('scan_records.confidence', 'integer', 'YES');
  expectType('scan_records.image_reference', 'text', 'YES');
  expectType('sessions.token_hash', 'text');
  expectType('sessions.expires_at', 'timestamp with time zone');

  const indexes = await pg.query(
    'SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema()',
  );
  const uniqueOn = column =>
    indexes.some(row => /UNIQUE/i.test(row.indexdef) && row.indexdef.includes(`(${column})`));
  assert.ok(uniqueOn('email'), 'users.email is unique');
  assert.ok(uniqueOn('token_hash'), 'sessions.token_hash is unique');
  assert.ok(
    indexes.some(row => /UNIQUE/i.test(row.indexdef) && row.indexdef.includes('user_dosha') && row.indexdef.includes('(user_id)')),
    'user_dosha.user_id is unique',
  );
  const names = indexes.map(row => row.indexname);
  assert.ok(names.includes('idx_scan_records_user_id'));
  assert.ok(names.includes('idx_sessions_user_id'));

  const foreignKeys = await pg.query(
    `SELECT rc.delete_rule FROM information_schema.referential_constraints rc
     WHERE rc.constraint_schema = current_schema()`,
  );
  assert.equal(foreignKeys.length, 3);
  assert.ok(foreignKeys.every(row => row.delete_rule === 'CASCADE'));

  const rls = await pg.query(
    `SELECT c.relname, c.relrowsecurity FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema() AND c.relkind = 'r'`,
  );
  assert.equal(rls.length, 5);
  assert.ok(rls.every(row => row.relrowsecurity === true), 'row level security enabled on every table');

  const versions = (await pg.query('SELECT version FROM schema_migrations')).map(row => row.version);
  assert.deepEqual(versions, ['001_initial_schema']);
  assert.deepEqual(await runMigrations(pg), { applied: [], total: 1 });
  await assertSchemaCurrent(pg);
});

test('a failing migration is rolled back, not recorded, and releases the lock', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-migrations-'));
  try {
    fs.copyFileSync(path.join(MIGRATIONS_DIR, '001_initial_schema.sql'), path.join(dir, '001_initial_schema.sql'));
    fs.writeFileSync(
      path.join(dir, '002_broken_probe.sql'),
      'CREATE TABLE broken_probe (id INTEGER);\nSELECT * FROM table_that_does_not_exist;\n',
    );
    await assert.rejects(() => runMigrations(tdb.database, { dir }), error => error.code === '42P01');

    const probe = await tdb.database.queryOne("SELECT to_regclass('broken_probe') AS name");
    assert.equal(probe.name, null, 'partial migration was rolled back');
    const versions = (await tdb.database.query('SELECT version FROM schema_migrations')).map(row => row.version);
    assert.deepEqual(versions, ['001_initial_schema']);
    await assert.rejects(() => assertSchemaCurrent(tdb.database, { dir }), /out of date \(missing 002_broken_probe\)/);
    assert.deepEqual(await runMigrations(tdb.database), { applied: [], total: 1 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the API refuses to start against an unmigrated PostgreSQL database', async () => {
  const empty = await tdb.newTarget();
  await assert.rejects(() => connectActive(empty), /Run "npm run db:migrate" first/);
  const health = await api.request('GET', '/health');
  assert.equal(health.status, 200, 'the active connection is untouched');
});

test('registration stores a bcrypt (cost 12) hash and a hashed session token', async () => {
  const { res, token, user, password, email } = await register({ email: 'Mixed.Case@Example.TEST' });
  assert.equal(res.status, 201);
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(user.email, 'mixed.case@example.test');
  assert.equal(typeof user.id, 'string');
  assert.deepEqual(
    { dosha: user.dosha, doshaConfidence: user.doshaConfidence, scanCount: user.scanCount },
    { dosha: null, doshaConfidence: null, scanCount: 0 },
  );
  assert.equal(res.text.includes(password), false);
  assert.equal(res.text.includes('password_hash'), false);
  assert.equal(res.text.includes('$2'), false);

  const row = await tdb.database.queryOne('SELECT password_hash, created_at FROM users WHERE email = $1', [
    email.toLowerCase(),
  ]);
  assert.notEqual(row.password_hash, password);
  assert.match(row.password_hash, /^\$2[aby]\$12\$/);
  assert.equal(await bcrypt.compare(password, row.password_hash), true);
  assert.ok(row.created_at instanceof Date && !Number.isNaN(row.created_at.getTime()));

  const sessions = await tdb.database.query('SELECT token_hash FROM sessions WHERE user_id = $1', [user.id]);
  assert.deepEqual(sessions.map(s => s.token_hash), [sha256(token)]);
  assert.equal(await tdb.database.queryOne('SELECT id FROM sessions WHERE token_hash = $1', [token]), null);
});

test('duplicate emails are rejected (409), including case variants and at the database level', async () => {
  const first = await register();
  assert.equal(first.res.status, 201);
  const again = await register({ email: first.email });
  assert.equal(again.res.status, 409);
  assert.equal(again.res.body.error, 'An account with this email already exists.');
  const upper = await register({ email: first.email.toUpperCase() });
  assert.equal(upper.res.status, 409);

  await assert.rejects(
    () =>
      tdb.database.execute(
        'INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())',
        ['Dup', first.email, '$2b$12$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyzABCDE'],
      ),
    error => error.code === '23505',
  );
});

test('two simultaneous sign-ups for one email produce exactly one account', async () => {
  const email = randomEmail();
  const results = await Promise.all([register({ email }), register({ email })]);
  assert.deepEqual(results.map(r => r.res.status).sort(), [201, 409]);
  const count = await tdb.database.queryOne('SELECT COUNT(*) AS count FROM users WHERE email = $1', [email]);
  assert.equal(Number(count.count), 1);
});

test('login succeeds with the right password and fails uniformly otherwise', async () => {
  const account = await register();
  const ok = await api.request('POST', '/api/v1/auth/login', {
    body: { email: account.email, password: account.password },
  });
  assert.equal(ok.status, 200);
  assert.match(ok.body.token, /^[a-f0-9]{64}$/);
  assert.notEqual(ok.body.token, account.token);
  assert.equal(ok.body.user.id, account.user.id);

  const wrong = await api.request('POST', '/api/v1/auth/login', {
    body: { email: account.email, password: `${account.password}x` },
  });
  const unknown = await api.request('POST', '/api/v1/auth/login', {
    body: { email: randomEmail(), password: account.password },
  });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, { error: 'Invalid email or password.' });
  assert.deepEqual(unknown.body, wrong.body);
});

test('valid sessions authenticate; missing or unknown tokens get SESSION_INVALID', async () => {
  const account = await register();
  const me = await api.request('GET', '/api/v1/me', { token: account.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, account.email);

  for (const token of [crypto.randomBytes(32).toString('hex'), 'garbage', undefined]) {
    const res = await api.request('GET', '/api/v1/me', { token });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'SESSION_INVALID');
  }
});

test('expired sessions are rejected with SESSION_INVALID and purged', async () => {
  const account = await register();
  await tdb.database.execute(
    "UPDATE sessions SET expires_at = now() - interval '1 minute' WHERE token_hash = $1",
    [sha256(account.token)],
  );
  const res = await api.request('GET', '/api/v1/me', { token: account.token });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'SESSION_INVALID');
  const left = await tdb.database.queryOne('SELECT id FROM sessions WHERE token_hash = $1', [sha256(account.token)]);
  assert.equal(left, null);
});

test('logout revokes only that session', async () => {
  const account = await register();
  const login = await api.request('POST', '/api/v1/auth/login', {
    body: { email: account.email, password: account.password },
  });
  const out = await api.request('POST', '/api/v1/auth/logout', { token: login.body.token });
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { ok: true });

  const revoked = await api.request('GET', '/api/v1/me', { token: login.body.token });
  assert.equal(revoked.status, 401);
  assert.equal(revoked.body.code, 'SESSION_INVALID');
  const other = await api.request('GET', '/api/v1/me', { token: account.token });
  assert.equal(other.status, 200);
});

test('scan history is owned by the signed-in user and isolated between users', async () => {
  const a = await register({ name: 'Alice' });
  const b = await register({ name: 'Bob' });

  const first = await api.request('POST', '/api/v1/scans', {
    token: a.token,
    body: { dosha: 'Vata', confidence: 81, imageReference: 'scan-a1.jpg', userId: Number(b.user.id) },
  });
  assert.equal(first.status, 201);
  assert.equal(typeof first.body.scanId, 'number');
  assert.equal(first.body.user.id, a.user.id, 'client-supplied userId is ignored');
  const second = await api.request('POST', '/api/v1/scans', {
    token: a.token,
    body: { dosha: 'Pitta', confidence: 87.6 },
  });
  assert.equal(second.status, 201);
  assert.equal(second.body.user.dosha, 'Pitta');
  assert.equal(second.body.user.doshaConfidence, 88);
  assert.equal(second.body.user.scanCount, 2);
  const bScan = await api.request('POST', '/api/v1/scans', {
    token: b.token,
    body: { dosha: 'Kapha', confidence: 64 },
  });
  assert.equal(bScan.status, 201);

  const aList = await api.request('GET', '/api/v1/scans', { token: a.token });
  const bList = await api.request('GET', '/api/v1/scans', { token: b.token });
  assert.equal(aList.status, 200);
  assert.deepEqual(aList.body.scans.map(s => s.dosha), ['Pitta', 'Vata'], 'newest first');
  assert.deepEqual(bList.body.scans.map(s => s.dosha), ['Kapha']);
  const [latest, oldest] = aList.body.scans;
  assert.equal(typeof latest.id, 'number');
  assert.equal(latest.confidence, 88);
  assert.equal(latest.imageReference, null);
  assert.equal(oldest.imageReference, 'scan-a1.jpg');
  assert.match(latest.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.deepEqual(Object.keys(latest).sort(), ['confidence', 'createdAt', 'dosha', 'id', 'imageReference']);

  const owners = await tdb.database.query('SELECT DISTINCT user_id FROM scan_records WHERE user_id IN ($1, $2)', [
    a.user.id,
    b.user.id,
  ]);
  assert.equal(owners.length, 2);
  const dosha = await tdb.database.query('SELECT dosha, confidence FROM user_dosha WHERE user_id = $1', [a.user.id]);
  assert.deepEqual(dosha, [{ dosha: 'Pitta', confidence: 88 }], 'one upserted dosha row per user');

  const meA = await api.request('GET', '/api/v1/me', { token: a.token });
  const meB = await api.request('GET', '/api/v1/me', { token: b.token });
  assert.equal(meA.body.user.scanCount, 2);
  assert.equal(meB.body.user.scanCount, 1);
  assert.equal(meB.body.user.dosha, 'Kapha');

  const anonymous = await api.request('GET', '/api/v1/scans');
  assert.equal(anonymous.status, 401);
});

test('SQL injection attempts are stored or rejected as plain values', async () => {
  const name = "Robert'); DROP TABLE users; --";
  const injected = await register({ name });
  assert.equal(injected.res.status, 201);
  const stored = await tdb.database.queryOne('SELECT name FROM users WHERE id = $1', [injected.user.id]);
  assert.equal(stored.name, name);

  for (const email of ["' OR '1'='1' --", "x@example.test' OR 1=1 --"]) {
    const res = await api.request('POST', '/api/v1/auth/login', { body: { email, password: 'anything-123' } });
    assert.ok([400, 401].includes(res.status), `status ${res.status}`);
    assert.equal(res.body.token, undefined);
  }
  const forged = await api.request('GET', '/api/v1/me', { token: "' OR '1'='1" });
  assert.equal(forged.status, 401);

  const intact = await tdb.database.queryOne("SELECT to_regclass('users') AS users, to_regclass('sessions') AS sessions");
  assert.ok(intact.users && intact.sessions);
});

test('transactions roll back on failure and never leak pooled connections', async () => {
  const active = db.getDatabase();
  const email = randomEmail();
  await assert.rejects(
    () =>
      active.transaction(async tx => {
        await tx.execute(
          'INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())',
          ['Rollback', email, '$2b$12$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyzABCDE'],
        );
        throw new Error('fail after insert');
      }),
    /fail after insert/,
  );
  assert.equal(await active.queryOne('SELECT id FROM users WHERE email = $1', [email]), null);

  await assert.rejects(
    () => db.saveScanRecord({ userId: 987654321, dosha: 'Vata', confidence: 50, imageReference: null }),
    error => error.code === '23503',
  );
  assert.equal(await active.queryOne('SELECT id FROM scan_records WHERE user_id = $1', [987654321]), null);

  for (let i = 0; i < 12; i += 1) {
    await assert.rejects(() => active.transaction(async tx => tx.execute('SELECT * FROM missing_table_probe')));
  }
  const { pool } = active;
  assert.ok(pool.totalCount <= 5, `pool grew to ${pool.totalCount}`);
  assert.equal(pool.waitingCount, 0);
  assert.equal(pool.idleCount, pool.totalCount, 'every client was released');
  await active.ping();
});

test('deleting a user cascades to their scans, dosha and sessions', async () => {
  const account = await register();
  await api.request('POST', '/api/v1/scans', { token: account.token, body: { dosha: 'Vata', confidence: 70 } });
  await tdb.database.execute('DELETE FROM users WHERE id = $1', [account.user.id]);
  for (const table of ['scan_records', 'user_dosha', 'sessions']) {
    const row = await tdb.database.queryOne(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id = $1`, [
      account.user.id,
    ]);
    assert.equal(Number(row.count), 0, table);
  }
  const res = await api.request('GET', '/api/v1/me', { token: account.token });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'SESSION_INVALID');
});

test('/health reports a reachable PostgreSQL database as healthy', async () => {
  const res = await api.request('GET', '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true, status: 'ok' });
});

test('database errors become generic 5xx responses, never SESSION_INVALID, and logs carry only a code', async () => {
  const account = await register();
  const empty = await tdb.newTarget();
  const logged = [];
  const originalError = console.error;
  const originalEnv = process.env.NODE_ENV;
  console.error = (...args) => logged.push(args.join(' '));
  process.env.NODE_ENV = 'development';
  try {
    // A reachable PostgreSQL database with no tables: every query raises 42P01 naming the table.
    db.useDatabase(tdb.openTarget(empty));

    const checks = [
      await api.request('POST', '/api/v1/auth/register', {
        body: { name: 'Broken', email: randomEmail(), password: randomPassword() },
      }),
      await api.request('POST', '/api/v1/auth/login', {
        body: { email: account.email, password: account.password },
      }),
      await api.request('GET', '/api/v1/me', { token: account.token }),
      await api.request('GET', '/api/v1/scans', { token: account.token }),
      await api.request('POST', '/api/v1/auth/logout', { token: account.token }),
    ];
    for (const res of checks) {
      assert.equal(res.status, 500);
      assert.deepEqual(res.body, { error: GENERIC_ERROR });
      assertNoInternals(res.text);
    }
    assert.ok(logged.length >= checks.length);
    for (const line of logged) {
      assert.match(line, /^Request failed \([A-Za-z0-9_]+\)$/);
    }
  } finally {
    console.error = originalError;
    process.env.NODE_ENV = originalEnv;
    await connectActive();
  }

  const restored = await api.request('GET', '/api/v1/me', { token: account.token });
  assert.equal(restored.status, 200, 'the saved token still works once the database is back');
});

test('an unreachable database keeps tokens valid (5xx) and /health reports unavailable', async () => {
  const account = await register();
  const originalError = console.error;
  console.error = () => {};
  try {
    db.useDatabase(
      createPostgresDatabase({
        databaseUrl: 'postgresql://nobody:nothing@127.0.0.1:1/none',
        sslMode: 'disable',
        connectionTimeoutMs: 2000,
        logger: silentLogger,
      }),
    );
    const me = await api.request('GET', '/api/v1/me', { token: account.token });
    assert.equal(me.status, 500);
    assert.deepEqual(me.body, { error: GENERIC_ERROR });
    assert.equal(me.text.includes('SESSION_INVALID'), false);
    assertNoInternals(me.text);

    const health = await api.request('GET', '/health');
    assert.equal(health.status, 503);
    assert.deepEqual(health.body, { ok: false, status: 'unavailable' });
  } finally {
    console.error = originalError;
    await connectActive();
  }
  const restored = await api.request('GET', '/api/v1/me', { token: account.token });
  assert.equal(restored.status, 200);
});
