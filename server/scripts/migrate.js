#!/usr/bin/env node
// Applies pending SQL migrations from server/migrations to the PostgreSQL database in
// DATABASE_URL. Run explicitly (`npm run db:migrate`); the API never migrates on startup.
const { loadEnvFiles } = require('../src/env');
const { loadDatabaseConfig } = require('../src/config');
const { createPostgresDatabase, describeDatabase } = require('../src/database/postgres');
const { runMigrations } = require('../src/database/migrations');

async function main() {
  loadEnvFiles();
  const databaseConfig = loadDatabaseConfig(process.env);
  if (databaseConfig.client !== 'postgres') {
    throw new Error('DATABASE_URL is not set. Migrations only apply to PostgreSQL.');
  }

  console.log(`Migrating ${describeDatabase(databaseConfig.databaseUrl, databaseConfig.sslMode)}`);
  const database = createPostgresDatabase({ ...databaseConfig, poolMax: 1 });
  try {
    const { applied, total } = await runMigrations(database);
    if (applied.length === 0) {
      console.log(`Schema is up to date (${total} migration${total === 1 ? '' : 's'}).`);
    } else {
      console.log(`Applied ${applied.length} migration(s): ${applied.join(', ')}`);
    }
  } finally {
    await database.close().catch(() => {});
  }
}

main().catch(error => {
  console.error('Migration failed; no partial migration was recorded.');
  // Driver errors are reported by code only: their messages can name the host or user.
  console.error(error.code ? `Database error (${error.code})` : error.message);
  process.exit(1);
});
