const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
const MIGRATION_FILE = /^\d{3}_[a-z0-9_]+\.sql$/;
// Arbitrary application-wide key so two deploys never run migrations concurrently.
const MIGRATION_LOCK_KEY = 482311;
const UNDEFINED_TABLE = '42P01';

function listMigrations(dir = MIGRATIONS_DIR) {
  return fs
    .readdirSync(dir)
    .filter(file => MIGRATION_FILE.test(file))
    .sort()
    .map(file => ({
      version: file.replace(/\.sql$/, ''),
      sql: fs.readFileSync(path.join(dir, file), 'utf8'),
    }));
}

function requirePostgres(database) {
  if (!database || database.dialect !== 'postgres') {
    throw new Error('SQL migrations apply to PostgreSQL only; SQLite creates its schema on startup.');
  }
}

async function runMigrations(database, { dir = MIGRATIONS_DIR } = {}) {
  requirePostgres(database);
  const migrations = listMigrations(dir);
  const client = await database.pool.connect();
  let releaseError;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    try {
      await client.query(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
           version TEXT PRIMARY KEY,
           applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
         )`,
      );
      await client.query('ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY');
      const applied = new Set(
        (await client.query('SELECT version FROM schema_migrations')).rows.map(row => row.version),
      );

      const newlyApplied = [];
      for (const migration of migrations) {
        if (applied.has(migration.version)) {
          continue;
        }
        await client.query('BEGIN');
        try {
          await client.query(migration.sql);
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
        newlyApplied.push(migration.version);
      }
      return { applied: newlyApplied, total: migrations.length };
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    }
  } catch (error) {
    releaseError = error;
    throw error;
  } finally {
    client.release(releaseError);
  }
}

async function assertSchemaCurrent(database, { dir = MIGRATIONS_DIR } = {}) {
  requirePostgres(database);
  let rows;
  try {
    rows = await database.query('SELECT version FROM schema_migrations');
  } catch (error) {
    if (error.code === UNDEFINED_TABLE) {
      throw new Error('The PostgreSQL schema has not been created. Run "npm run db:migrate" first.');
    }
    throw error;
  }
  const applied = new Set(rows.map(row => row.version));
  const missing = listMigrations(dir)
    .map(migration => migration.version)
    .filter(version => !applied.has(version));
  if (missing.length > 0) {
    throw new Error(
      `The PostgreSQL schema is out of date (missing ${missing.join(', ')}). Run "npm run db:migrate".`,
    );
  }
}

module.exports = { MIGRATIONS_DIR, listMigrations, runMigrations, assertSchemaCurrent };
