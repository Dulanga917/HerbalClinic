// Tests for the explicit migration tooling (scripts/migrate.js and
// scripts/migrateSqliteToPostgres.js) against PGlite or TEST_DATABASE_URL.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;

const { createTestDatabase } = require('./helpers/postgresTestDatabase');
const db = require('../src/db');
const { createSqliteDatabase } = require('../src/database/sqlite');
const { runMigrations } = require('../src/database/migrations');
const { MigrationError, formatReport, migrateSqliteToPostgres, parseArgs } = require('../scripts/migrateSqliteToPostgres');

const SCRIPTS = path.join(__dirname, '..', 'scripts');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-sqlite-migration-'));
const fileHash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const listDir = () => fs.readdirSync(tmpDir).sort();

let tdb;
const source = { path: path.join(tmpDir, 'source.sqlite'), accounts: [] };

async function buildSource() {
  db.initDb(source.path);
  for (const [name, email] of [
    ['Asha', 'asha@example.test'],
    ['Bilal', 'bilal@example.test'],
    ['Chen', 'chen@example.test'],
  ]) {
    const password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
    const { token, user } = await db.registerUser({ name, email, password });
    source.accounts.push({ name, email, password, token, sqliteId: Number(user.id) });
  }
  const [asha, bilal] = source.accounts;
  await db.saveScanRecord({ userId: asha.sqliteId, dosha: 'Vata', confidence: 81, imageReference: 'a1.jpg' });
  await db.saveScanRecord({ userId: asha.sqliteId, dosha: 'Pitta', confidence: 90, imageReference: null });
  await db.saveScanRecord({ userId: bilal.sqliteId, dosha: 'Kapha', confidence: 64, imageReference: 'b1.jpg' });

  const raw = db.getDb();
  // Legacy-looking data: a zone-less timestamp and an orphaned row written with FKs off.
  raw.prepare("UPDATE scan_records SET created_at = '2024-01-02 03:04:05' WHERE image_reference = 'b1.jpg'").run();
  raw.exec('PRAGMA foreign_keys = OFF');
  raw
    .prepare(
      "INSERT INTO scan_records (user_id, dosha, confidence, image_reference, created_at) VALUES (999, 'Vata', 50, NULL, '2024-05-06T07:08:09.000Z')",
    )
    .run();
  raw.exec('PRAGMA foreign_keys = ON');
  await db.closeDb();
}

function readSourceRows() {
  const reader = createSqliteDatabase({ filename: source.path, readOnly: true });
  try {
    return {
      users: reader.raw.prepare('SELECT * FROM users ORDER BY id').all(),
      scans: reader.raw.prepare('SELECT * FROM scan_records ORDER BY id').all(),
    };
  } finally {
    reader.closeSync();
  }
}

function runScript(script, args, env) {
  return new Promise(resolve => {
    execFile(
      process.execPath,
      ['--experimental-sqlite', '--no-warnings', path.join(SCRIPTS, script), ...args],
      {
        env: {
          PATH: process.env.PATH,
          SYSTEMROOT: process.env.SYSTEMROOT,
          HERBALCLINIC_SKIP_ENV_FILES: 'true',
          NODE_ENV: 'development',
          ...env,
        },
      },
      (error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr, all: stdout + stderr }),
    );
  });
}

function assertNoSensitiveOutput(text, { databaseUrl } = {}) {
  for (const account of source.accounts) {
    assert.equal(text.includes(account.email), false, 'email printed');
    assert.equal(text.includes(account.password), false, 'password printed');
    assert.equal(text.includes(account.token), false, 'session token printed');
  }
  assert.equal(/\$2[aby]\$/.test(text), false, 'bcrypt hash printed');
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    assert.equal(text.includes(databaseUrl), false, 'DATABASE_URL printed');
    assert.equal(text.includes(`${url.username}:${url.password}@`), false, 'credentials printed');
    assert.equal(text.includes(`:${url.port}`), false, 'port printed');
  }
}

test.before(async () => {
  await buildSource();
  tdb = await createTestDatabase();
  console.log(`# PostgreSQL backend: ${tdb.kind}`);
  await runMigrations(tdb.database);
});

test.after(async () => {
  await db.closeDb().catch(() => {});
  if (tdb) {
    await tdb.cleanup();
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('a dry run validates everything and writes nothing', async () => {
  const before = fileHash(source.path);
  const report = await migrateSqliteToPostgres({ sqlitePath: source.path, target: tdb.database });
  assert.equal(report.dryRun, true);
  assert.deepEqual(report.users, { source: 3, migrated: 3, skippedExistingEmail: 0 });
  assert.deepEqual(report.scanRecords, { source: 4, migrated: 3, skippedExistingUser: 0, skippedOrphaned: 1 });
  const count = await tdb.database.queryOne('SELECT COUNT(*) AS count FROM users');
  assert.equal(Number(count.count), 0);
  assert.equal(fileHash(source.path), before);
});

test('the copy preserves hashes, relationships and timestamps, skips existing emails and never copies sessions', async () => {
  const sourceBefore = fileHash(source.path);
  const filesBefore = listDir();
  const original = readSourceRows();
  const [asha, bilal, chen] = source.accounts;

  // Someone already registered Chen's email on the new server: that account must win untouched.
  const existingHash = '$2b$12$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyzABCDE';
  const existing = await tdb.database.queryOne(
    "INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES ('Chen (new)', $1, $2, now(), now()) RETURNING id",
    [chen.email, existingHash],
  );

  const report = await migrateSqliteToPostgres({ sqlitePath: source.path, target: tdb.database, dryRun: false });
  assert.equal(report.dryRun, false);
  assert.deepEqual(report.users, { source: 3, migrated: 2, skippedExistingEmail: 1 });
  assert.deepEqual(report.scanRecords, { source: 4, migrated: 3, skippedExistingUser: 0, skippedOrphaned: 1 });
  assert.deepEqual(report.userDosha, { source: 2, migrated: 2, skippedExistingUser: 0, skippedOrphaned: 0 });
  assert.deepEqual(report.sessions, { source: 3, migrated: 0 });
  assertNoSensitiveOutput(formatReport(report));

  for (const account of [asha, bilal]) {
    const sourceUser = original.users.find(u => u.email === account.email);
    const copied = await tdb.database.queryOne('SELECT * FROM users WHERE email = $1', [account.email]);
    assert.equal(copied.password_hash, sourceUser.password_hash, 'bcrypt hash copied byte-for-byte');
    assert.equal(copied.name, sourceUser.name);
    assert.equal(copied.created_at.toISOString(), sourceUser.created_at);
    assert.equal(copied.updated_at.toISOString(), sourceUser.updated_at);

    const canonical = rows => rows.map(row => JSON.stringify(row)).sort();
    const copiedScans = await tdb.database.query(
      'SELECT dosha, confidence, image_reference, created_at FROM scan_records WHERE user_id = $1',
      [copied.id],
    );
    const sourceScans = original.scans
      .filter(s => s.user_id === sourceUser.id)
      .map(s => ({
        dosha: s.dosha,
        confidence: s.confidence,
        image_reference: s.image_reference,
        created_at: s.created_at === '2024-01-02 03:04:05' ? '2024-01-02T03:04:05.000Z' : s.created_at,
      }));
    assert.equal(copiedScans.length, sourceScans.length);
    assert.deepEqual(
      canonical(copiedScans.map(s => ({ ...s, created_at: s.created_at.toISOString() }))),
      canonical(sourceScans),
    );
    const sessions = await tdb.database.queryOne('SELECT COUNT(*) AS count FROM sessions WHERE user_id = $1', [copied.id]);
    assert.equal(Number(sessions.count), 0);
  }

  const chenRow = await tdb.database.queryOne('SELECT id, name, password_hash FROM users WHERE email = $1', [chen.email]);
  assert.equal(String(chenRow.id), String(existing.id));
  assert.equal(chenRow.password_hash, existingHash);
  assert.equal(chenRow.name, 'Chen (new)');

  // The copied account works through the real repository code on PostgreSQL;
  // the old SQLite session token does not.
  db.useDatabase(tdb.openTarget(tdb.target));
  const login = await db.loginUser({ email: asha.email, password: asha.password });
  assert.equal(login.user.email, asha.email);
  assert.equal(login.user.scanCount, 2);
  assert.equal(login.user.dosha, 'Pitta');
  assert.equal(await db.getUserByToken(asha.token), null);
  await assert.rejects(() => db.loginUser({ email: asha.email, password: 'wrong-password-1' }), /Invalid email or password/);

  assert.equal(fileHash(source.path), sourceBefore, 'source SQLite file unchanged');
  assert.deepEqual(listDir(), filesBefore, 'no files created next to the source');
});

test('re-running the copy does not create duplicates', async () => {
  const count = async () =>
    tdb.database.queryOne(
      'SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM scan_records) AS scans, (SELECT COUNT(*) FROM user_dosha) AS doshas',
    );
  const before = await count();
  const report = await migrateSqliteToPostgres({ sqlitePath: source.path, target: tdb.database, dryRun: false });
  assert.deepEqual(report.users, { source: 3, migrated: 0, skippedExistingEmail: 3 });
  assert.equal(report.scanRecords.migrated, 0);
  assert.equal(report.scanRecords.skippedExistingUser, 3);
  assert.deepEqual(await count(), before);
});

test('a failure part-way through rolls back every change', async () => {
  const badPath = path.join(tmpDir, 'overflow.sqlite');
  const bad = createSqliteDatabase({ filename: badPath });
  const hash = require('bcryptjs').hashSync('Overflow-pass-1', 4);
  bad.raw
    .prepare("INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES ('Over', 'overflow@example.test', ?, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z')")
    .run(hash);
  // Valid in SQLite, out of range for PostgreSQL INTEGER: fails after the user row is inserted.
  bad.raw
    .prepare("INSERT INTO scan_records (user_id, dosha, confidence, created_at) VALUES (1, 'Vata', 99999999999, '2025-01-01T00:00:00.000Z')")
    .run();
  bad.closeSync();

  const before = await tdb.database.queryOne('SELECT COUNT(*) AS count FROM users');
  await assert.rejects(
    () => migrateSqliteToPostgres({ sqlitePath: badPath, target: tdb.database, dryRun: false }),
    error => error.code === '22003',
  );
  const after = await tdb.database.queryOne('SELECT COUNT(*) AS count FROM users');
  assert.equal(after.count, before.count);
  assert.equal(await tdb.database.queryOne("SELECT id FROM users WHERE email = 'overflow@example.test'"), null);
});

test('invalid sources are refused before anything is written, without echoing values', async () => {
  const plainPath = path.join(tmpDir, 'plaintext.sqlite');
  const plain = createSqliteDatabase({ filename: plainPath });
  plain.raw
    .prepare("INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES ('P', 'plain@example.test', 'hunter2-plaintext', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')")
    .run();
  plain.closeSync();

  let message = '';
  try {
    await migrateSqliteToPostgres({ sqlitePath: plainPath, target: tdb.database, dryRun: false });
  } catch (error) {
    assert.ok(error instanceof MigrationError);
    message = error.message;
  }
  assert.equal(message, 'SQLite user #1 does not have a bcrypt password hash.');
  assert.equal(await tdb.database.queryOne("SELECT id FROM users WHERE email = 'plain@example.test'"), null);

  await assert.rejects(
    () => migrateSqliteToPostgres({ sqlitePath: path.join(tmpDir, 'missing.sqlite'), target: tdb.database }),
    /The SQLite file was not found/,
  );
  assert.equal(fs.existsSync(path.join(tmpDir, 'missing.sqlite')), false, 'a missing source is not created');
  await assert.rejects(
    () => migrateSqliteToPostgres({ sqlitePath: source.path, target: { dialect: 'sqlite' } }),
    /must be PostgreSQL/,
  );
  assert.throws(() => parseArgs(['--sqlite', 'x', 'postgresql://u:p@h/db']), /Unknown argument\. Run with --help/);
});

test('the CLI defaults to a dry run and prints counts only', async () => {
  const target = await tdb.newTarget();
  const fresh = tdb.openTarget(target);
  await runMigrations(fresh);
  const env = {
    DATABASE_URL: target.databaseUrl,
    DATABASE_SSL: target.sslMode,
  };

  const dry = await runScript('migrateSqliteToPostgres.js', ['--sqlite', source.path], env);
  assert.equal(dry.code, 0, dry.all);
  assert.match(dry.stdout, /DRY RUN/);
  assert.match(dry.stdout, /Re-run with --confirm/);
  assert.match(dry.stdout, /Sessions: +3 in SQLite, not copied/);
  assertNoSensitiveOutput(dry.all, { databaseUrl: target.databaseUrl });
  assert.equal(Number((await fresh.queryOne('SELECT COUNT(*) AS count FROM users')).count), 0);

  const real = await runScript('migrateSqliteToPostgres.js', ['--sqlite', source.path, '--confirm'], env);
  assert.equal(real.code, 0, real.all);
  assert.match(real.stdout, /Copy committed/);
  assertNoSensitiveOutput(real.all, { databaseUrl: target.databaseUrl });
  assert.equal(Number((await fresh.queryOne('SELECT COUNT(*) AS count FROM users')).count), 3);

  const noSource = await runScript('migrateSqliteToPostgres.js', [], env);
  assert.equal(noSource.code, 1);
  assert.match(noSource.stderr, /Pass the SQLite file with --sqlite/);

  const unreachable = 'postgresql://hc_user:n0t-a-real-Pa55word@127.0.0.1:1/none';
  const down = await runScript('migrateSqliteToPostgres.js', ['--sqlite', source.path], {
    DATABASE_URL: unreachable,
    DATABASE_SSL: 'disable',
  });
  assert.equal(down.code, 1);
  assert.match(down.stderr, /rolled back/);
  assert.match(down.stderr, /Database error \(ECONNREFUSED\)/);
  assertNoSensitiveOutput(down.all, { databaseUrl: unreachable });

  const noUrl = await runScript('migrateSqliteToPostgres.js', ['--sqlite', source.path], {});
  assert.equal(noUrl.code, 1);
  assert.match(noUrl.stderr, /DATABASE_URL is not set/);
});

test('db:migrate applies the schema explicitly, is idempotent and hides the connection string', async () => {
  const target = await tdb.newTarget();
  const env = { DATABASE_URL: target.databaseUrl, DATABASE_SSL: target.sslMode };

  const first = await runScript('migrate.js', [], env);
  assert.equal(first.code, 0, first.all);
  assert.match(first.stdout, /Applied 1 migration\(s\): 001_initial_schema/);
  const second = await runScript('migrate.js', [], env);
  assert.equal(second.code, 0, second.all);
  assert.match(second.stdout, /Schema is up to date \(1 migration\)/);
  for (const run of [first, second]) {
    assertNoSensitiveOutput(run.all, { databaseUrl: target.databaseUrl });
  }

  const insecure = await runScript('migrate.js', [], {
    DATABASE_URL: target.databaseUrl,
    DATABASE_SSL: 'disable',
    NODE_ENV: 'production',
  });
  assert.equal(insecure.code, 1);
  assert.match(insecure.stderr, /DATABASE_SSL=disable is not allowed in production/);

  const missing = await runScript('migrate.js', [], {});
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /DATABASE_URL is not set/);
});
