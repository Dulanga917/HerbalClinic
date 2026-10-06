const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');

process.env.NODE_ENV = 'test';

const { loadConfig, loadDatabaseConfig, checkStartupConfig } = require('../config');
const { buildPoolConfig, createPostgresDatabase, describeDatabase, stripSslParams } = require('./postgres');
const { toSqlitePlaceholders } = require('./sqlite');
const { MIGRATIONS_DIR, listMigrations, runMigrations } = require('./migrations');

// Obviously fake connection details; the tests assert none of them leak into messages.
const SECRET_PASSWORD = 'n0t-a-real-Pa55word';
const FAKE_URL = `postgresql://hc_user:${SECRET_PASSWORD}@db.internal.example.test:5432/herbalclinic`;

function assertNoSecrets(text) {
  assert.equal(text.includes(SECRET_PASSWORD), false, 'password leaked');
  assert.equal(text.includes('hc_user'), false, 'username leaked');
  assert.equal(text.includes('db.internal.example.test'), false, 'host leaked');
}

test('without DATABASE_URL development and tests use local SQLite', () => {
  assert.deepEqual(loadDatabaseConfig({ NODE_ENV: 'development' }), { client: 'sqlite', sqlitePath: undefined });
  assert.equal(loadDatabaseConfig({}).client, 'sqlite');
  assert.equal(loadDatabaseConfig({ SQLITE_PATH: 'x.sqlite' }).sqlitePath, 'x.sqlite');
});

test('production refuses to start without DATABASE_URL instead of falling back to SQLite', () => {
  assert.throws(() => loadDatabaseConfig({ NODE_ENV: 'production' }), /DATABASE_URL is required/);
  assert.throws(() => loadDatabaseConfig({ NODE_ENV: 'production', DATABASE_URL: '   ' }), /DATABASE_URL is required/);
});

test('DATABASE_URL is validated without echoing it', () => {
  const bad = [
    `mysql://hc_user:${SECRET_PASSWORD}@db.internal.example.test/herbalclinic`,
    `https://hc_user:${SECRET_PASSWORD}@db.internal.example.test/herbalclinic`,
    `hc_user:${SECRET_PASSWORD}@db.internal.example.test`,
    'postgresql://',
  ];
  for (const DATABASE_URL of bad) {
    let message = '';
    try {
      loadDatabaseConfig({ NODE_ENV: 'production', DATABASE_URL });
    } catch (error) {
      message = error.message;
    }
    assert.match(message, /DATABASE_URL is not a valid PostgreSQL connection URL/);
    assertNoSecrets(message);
  }
});

test('the .env.example DATABASE_URL placeholder is refused with a clear message', () => {
  const placeholder = 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE';
  for (const NODE_ENV of ['development', 'production']) {
    assert.throws(() => loadDatabaseConfig({ NODE_ENV, DATABASE_URL: placeholder }), /\.env\.example placeholder/);
  }
  for (const file of ['../../../.env.example', '../../.env.example']) {
    const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(text, /^DATABASE_URL=postgresql:\/\/USER:PASSWORD@HOST:PORT\/DATABASE$/m);
    assert.match(text, /^GEMINI_API_KEY=$/m);
    assert.match(text, /^SEED_DEV_USER=false$/m);
  }
});

test('a valid DATABASE_URL selects PostgreSQL with verified SSL by default', () => {
  const config = loadDatabaseConfig({ NODE_ENV: 'production', DATABASE_URL: FAKE_URL });
  assert.equal(config.client, 'postgres');
  assert.equal(config.sslMode, 'require');
  assert.equal(config.poolMax, 10);
  assert.equal(loadDatabaseConfig({ DATABASE_URL: FAKE_URL.replace('postgresql:', 'postgres:') }).client, 'postgres');
});

test('SSL can only be disabled outside production; unknown modes are rejected', () => {
  assert.throws(
    () => loadDatabaseConfig({ NODE_ENV: 'production', DATABASE_URL: FAKE_URL, DATABASE_SSL: 'disable' }),
    /not allowed in production/,
  );
  assert.equal(
    loadDatabaseConfig({ NODE_ENV: 'development', DATABASE_URL: FAKE_URL, DATABASE_SSL: 'disable' }).sslMode,
    'disable',
  );
  assert.throws(
    () => loadDatabaseConfig({ NODE_ENV: 'development', DATABASE_URL: FAKE_URL, DATABASE_SSL: 'no-verify' }),
    /DATABASE_SSL must be/,
  );
});

test('DATABASE_POOL_MAX must be a whole number between 1 and 50', () => {
  assert.equal(loadDatabaseConfig({ DATABASE_URL: FAKE_URL, DATABASE_POOL_MAX: '5' }).poolMax, 5);
  for (const value of ['0', '51', '2.5', 'many']) {
    assert.throws(() => loadDatabaseConfig({ DATABASE_URL: FAKE_URL, DATABASE_POOL_MAX: value }), /DATABASE_POOL_MAX/);
  }
});

test('pool config verifies certificates and ignores sslmode overrides in the URL', () => {
  const config = buildPoolConfig({
    databaseUrl: `${FAKE_URL}?sslmode=no-verify&sslrootcert=/tmp/x&uselibpqcompat=true&application_name=x`,
  });
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal(config.connectionString.includes('sslmode'), false);
  assert.equal(config.connectionString.includes('sslrootcert'), false);
  assert.equal(config.connectionString.includes('uselibpqcompat'), false);
  assert.equal(config.connectionString.includes('application_name=x'), true);
  assert.equal(config.max, 10);
  assert.equal(config.statement_timeout, 15000);
  assert.ok(config.connectionTimeoutMillis > 0);
  assert.equal(stripSslParams(`${FAKE_URL}?ssl=false`).includes('ssl='), false);
  assert.equal(config.options, undefined);
  assert.equal(buildPoolConfig({ databaseUrl: FAKE_URL, searchPath: 'hc_test_1' }).options, '-c search_path=hc_test_1');
});

test('a custom CA (e.g. the Supabase root certificate) keeps verification on', () => {
  const pem = '-----BEGIN CERTIFICATE-----\\nAAAA\\n-----END CERTIFICATE-----';
  const fromEnv = buildPoolConfig({ databaseUrl: FAKE_URL, sslCa: pem });
  assert.equal(fromEnv.ssl.rejectUnauthorized, true);
  assert.equal(fromEnv.ssl.ca, '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----');

  const caFile = path.join(require('os').tmpdir(), `hc-ca-${process.pid}.pem`);
  fs.writeFileSync(caFile, 'CA-FROM-FILE');
  try {
    const fromFile = buildPoolConfig({ databaseUrl: FAKE_URL, sslCaFile: caFile });
    assert.deepEqual(fromFile.ssl, { rejectUnauthorized: true, ca: 'CA-FROM-FILE' });
  } finally {
    fs.unlinkSync(caFile);
  }

  assert.equal(buildPoolConfig({ databaseUrl: FAKE_URL, sslMode: 'disable' }).ssl, false);
});

test('database descriptions for logs never include credentials or host', () => {
  const description = describeDatabase(FAKE_URL, 'require');
  assert.equal(description, 'PostgreSQL database "herbalclinic" (SSL verified)');
  assertNoSecrets(description);
  assert.equal(describeDatabase('not a url', 'require'), 'PostgreSQL database');
});

test('the PostgreSQL driver rejects unsafe schema names before connecting', () => {
  assert.throws(
    () => createPostgresDatabase({ databaseUrl: FAKE_URL, searchPath: 'public"; DROP TABLE users; --' }),
    /Invalid PostgreSQL schema name/,
  );
});

test('SQL migrations refuse to run against SQLite', async () => {
  await assert.rejects(() => runMigrations({ dialect: 'sqlite' }), /PostgreSQL only/);
});

test('SQLite placeholder conversion keeps positional binding', () => {
  assert.equal(
    toSqlitePlaceholders('SELECT * FROM t WHERE a = $1 AND b = $2 OR c = $10'),
    'SELECT * FROM t WHERE a = ?1 AND b = ?2 OR c = ?10',
  );
});

test('migration files are ordered and the schema mirrors the SQLite tables', () => {
  const migrations = listMigrations();
  assert.ok(migrations.length >= 1);
  assert.equal(migrations[0].version, '001_initial_schema');
  const versions = migrations.map(m => m.version);
  assert.deepEqual([...versions].sort(), versions);
  assert.ok(fs.existsSync(MIGRATIONS_DIR));

  const sql = migrations[0].sql;
  for (const table of ['users', 'user_dosha', 'scan_records', 'sessions']) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(`));
    assert.match(sql, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
  }
  assert.match(sql, /email TEXT NOT NULL UNIQUE/);
  assert.match(sql, /token_hash TEXT NOT NULL UNIQUE/);
  assert.equal((sql.match(/ON DELETE CASCADE/g) || []).length, 3);
  assert.doesNotMatch(sql, /\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b|\bINSERT\b/i);
});

test('production startup checks fail safely and only warn about optional settings', () => {
  const prod = loadConfig({ NODE_ENV: 'production', TRUST_PROXY: '1' });
  assert.deepEqual(checkStartupConfig(prod, { GEMINI_API_KEY: 'set' }), []);

  const warnings = checkStartupConfig(prod, { SEED_DEV_USER: 'true' });
  assert.ok(warnings.some(w => w.includes('GEMINI_UNAVAILABLE')));
  assert.ok(warnings.some(w => w.includes('SEED_DEV_USER is ignored')));

  const noProxy = loadConfig({ NODE_ENV: 'production' });
  assert.throws(() => checkStartupConfig(noProxy, { GEMINI_API_KEY: 'set' }), /TRUST_PROXY/);

  const dev = loadConfig({ NODE_ENV: 'development' });
  assert.throws(() => checkStartupConfig(dev, { RENDER: 'true' }), /NODE_ENV must be "production"/);
  assert.deepEqual(checkStartupConfig(dev, {}), []);
  const devPg = checkStartupConfig(dev, { DATABASE_URL: FAKE_URL, SEED_DEV_USER: 'true' });
  assert.ok(devPg.some(w => w.includes('NODE_ENV is not "production"')));
  assert.ok(devPg.some(w => w.includes('SEED_DEV_USER only applies to the local SQLite database')));
  for (const warning of [...warnings, ...devPg]) {
    assertNoSecrets(warning);
  }
});

test('the development account is never seeded into PostgreSQL', async () => {
  const db = require('../db');
  const calls = [];
  const fakePostgres = {
    dialect: 'postgres',
    queryOne: async sql => {
      calls.push(sql);
      return null;
    },
    query: async sql => {
      calls.push(sql);
      return [];
    },
    execute: async sql => {
      calls.push(sql);
      return { rowCount: 1 };
    },
    transaction: async () => {
      calls.push('transaction');
    },
    close: async () => {},
  };
  const overrides = {
    NODE_ENV: 'development',
    SEED_DEV_USER: 'true',
    SEED_DEV_EMAIL: 'seed.user@example.test',
    SEED_DEV_PASSWORD: 'Seed-password-123',
  };
  const saved = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]));
  try {
    db.useDatabase(fakePostgres);
    Object.assign(process.env, overrides);
    await db.seedDevUserIfRequested();
    assert.deepEqual(calls, []);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await db.closeDb();
  }
});

test('/health reports only a healthy or unavailable status', async () => {
  const { createApp } = require('../index');
  const request = app =>
    new Promise((resolve, reject) => {
      const server = app.listen(0, '127.0.0.1', () => {
        http
          .get({ hostname: '127.0.0.1', port: server.address().port, path: '/health' }, res => {
            let body = '';
            res.on('data', chunk => (body += chunk));
            res.on('end', () => server.close(() => resolve({ status: res.statusCode, body })));
          })
          .on('error', reject);
      });
    });
  const config = loadConfig({ NODE_ENV: 'test' });

  const healthy = await request(createApp({ config, healthCheck: async () => true }));
  assert.equal(healthy.status, 200);
  assert.deepEqual(JSON.parse(healthy.body), { ok: true, status: 'ok' });

  const failing = await request(
    createApp({
      config,
      healthCheck: async () => {
        throw Object.assign(new Error(`connect ECONNREFUSED db.internal.example.test ${SECRET_PASSWORD}`), {
          code: 'ECONNREFUSED',
        });
      },
    }),
  );
  assert.equal(failing.status, 503);
  assert.deepEqual(JSON.parse(failing.body), { ok: false, status: 'unavailable' });
  assertNoSecrets(failing.body);
});
