#!/usr/bin/env node
// One-off copy of a local HerbalClinic SQLite database into the PostgreSQL database in
// DATABASE_URL. Never runs automatically. See server/README.md before using it.
//
// Usage:
//   node --experimental-sqlite scripts/migrateSqliteToPostgres.js --sqlite <file>            (dry run)
//   node --experimental-sqlite scripts/migrateSqliteToPostgres.js --sqlite <file> --confirm  (copy)
//
// - The SQLite file is opened read-only and is never modified.
// - Everything is copied in one PostgreSQL transaction; any failure rolls it all back.
// - Users whose email already exists in PostgreSQL are skipped with all their data
//   (never merged or overwritten), so re-running does not create duplicates.
// - Sessions are not copied: every user signs in again after the move.
// - Only counts are printed; never emails, password hashes, tokens or DATABASE_URL.
const fs = require('fs');
const path = require('path');
const { assertSchemaCurrent } = require('../src/database/migrations');

const REQUIRED_SOURCE_TABLES = ['users', 'user_dosha', 'scan_records', 'sessions'];
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const NAIVE_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
const DRY_RUN_ROLLBACK = Symbol('dry-run-rollback');

const USAGE = `Copies a HerbalClinic SQLite database into the PostgreSQL database in DATABASE_URL.

  --sqlite <file>  SQLite database to read (opened read-only, never modified)
  --confirm        Commit the copy. Without it the copy is validated and rolled back.`;

/** Errors whose messages are written by this script and are safe to print. */
class MigrationError extends Error {}

function parseArgs(argv) {
  const args = { sqlitePath: undefined, confirm: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--sqlite') {
      args.sqlitePath = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--sqlite=')) {
      args.sqlitePath = arg.slice('--sqlite='.length);
    } else if (arg === '--confirm') {
      args.confirm = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new MigrationError('Unknown argument. Run with --help for usage.');
    }
  }
  return args;
}

function toTimestamp(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new MigrationError(`${label} has a missing timestamp.`);
  }
  // The API always stored ISO-8601 UTC strings; zone-less values are treated as UTC.
  const text = NAIVE_TIMESTAMP.test(value) ? `${value.replace(' ', 'T')}Z` : value;
  const ms = Date.parse(text);
  if (Number.isNaN(ms)) {
    throw new MigrationError(`${label} has an invalid timestamp.`);
  }
  return new Date(ms).toISOString();
}

function toConfidence(value, label, { required = false } = {}) {
  if (value === null || value === undefined) {
    if (required) {
      throw new MigrationError(`${label} has no confidence value.`);
    }
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new MigrationError(`${label} has an invalid confidence value.`);
  }
  return Math.round(number);
}

async function readSource(sqlitePath) {
  const resolved = path.resolve(sqlitePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new MigrationError('The SQLite file was not found.');
  }

  const { createSqliteDatabase } = require('../src/database/sqlite');
  const source = createSqliteDatabase({ filename: resolved, readOnly: true });
  try {
    const tables = new Set(
      (await source.query("SELECT name FROM sqlite_master WHERE type = 'table'")).map(row => row.name),
    );
    const missing = REQUIRED_SOURCE_TABLES.filter(name => !tables.has(name));
    if (missing.length > 0) {
      throw new MigrationError(`The SQLite file is not a HerbalClinic database (missing ${missing.join(', ')}).`);
    }

    const users = (
      await source.query(
        'SELECT id, name, email, password_hash, created_at, updated_at FROM users ORDER BY id',
      )
    ).map(row => {
      const label = `SQLite user #${row.id}`;
      if (typeof row.email !== 'string' || row.email.trim() === '' || typeof row.name !== 'string') {
        throw new MigrationError(`${label} has a missing name or email.`);
      }
      if (typeof row.password_hash !== 'string' || !BCRYPT_HASH.test(row.password_hash)) {
        throw new MigrationError(`${label} does not have a bcrypt password hash.`);
      }
      return {
        id: Number(row.id),
        name: row.name,
        email: row.email,
        passwordHash: row.password_hash,
        createdAt: toTimestamp(row.created_at, label),
        updatedAt: toTimestamp(row.updated_at, label),
      };
    });

    const doshas = (
      await source.query('SELECT id, user_id, dosha, confidence, updated_at FROM user_dosha ORDER BY id')
    ).map(row => {
      const label = `SQLite user_dosha #${row.id}`;
      return {
        userId: Number(row.user_id),
        dosha: String(row.dosha),
        confidence: toConfidence(row.confidence, label, { required: true }),
        updatedAt: toTimestamp(row.updated_at, label),
      };
    });

    const scans = (
      await source.query(
        'SELECT id, user_id, dosha, confidence, image_reference, created_at FROM scan_records ORDER BY id',
      )
    ).map(row => {
      const label = `SQLite scan #${row.id}`;
      return {
        userId: Number(row.user_id),
        dosha: row.dosha ?? null,
        confidence: toConfidence(row.confidence, label),
        imageReference: row.image_reference ?? null,
        createdAt: toTimestamp(row.created_at, label),
      };
    });

    const sessionCount = Number((await source.queryOne('SELECT COUNT(*) AS count FROM sessions')).count);
    return { users, doshas, scans, sessionCount };
  } finally {
    source.closeSync();
  }
}

function emptyReport(data, dryRun) {
  return {
    dryRun,
    users: { source: data.users.length, migrated: 0, skippedExistingEmail: 0 },
    scanRecords: { source: data.scans.length, migrated: 0, skippedExistingUser: 0, skippedOrphaned: 0 },
    userDosha: { source: data.doshas.length, migrated: 0, skippedExistingUser: 0, skippedOrphaned: 0 },
    sessions: { source: data.sessionCount, migrated: 0 },
  };
}

/**
 * Copies users, scan history and dosha profiles from a SQLite file into `target`
 * (a PostgreSQL driver from src/database/postgres.js) and returns row counts.
 */
async function migrateSqliteToPostgres({ sqlitePath, target, dryRun = true }) {
  if (!sqlitePath) {
    throw new MigrationError('Pass the SQLite file with --sqlite <file>.');
  }
  if (!target || target.dialect !== 'postgres') {
    throw new MigrationError('The migration target must be PostgreSQL.');
  }

  const data = await readSource(sqlitePath);
  await assertSchemaCurrent(target);

  const report = emptyReport(data, dryRun);
  const sourceUserIds = new Set(data.users.map(user => user.id));

  try {
    await target.transaction(async tx => {
      // Blocks sign-ups during the copy so a new account cannot race an imported email.
      await tx.execute('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');

      const newIds = new Map();
      for (const user of data.users) {
        const existing = await tx.queryOne('SELECT id FROM users WHERE email = $1', [user.email]);
        if (existing) {
          report.users.skippedExistingEmail += 1;
          continue;
        }
        const inserted = await tx.queryOne(
          `INSERT INTO users (name, email, password_hash, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [user.name, user.email, user.passwordHash, user.createdAt, user.updatedAt],
        );
        newIds.set(user.id, inserted.id);
        report.users.migrated += 1;
      }

      const ownerOf = (row, counts) => {
        if (newIds.has(row.userId)) {
          return newIds.get(row.userId);
        }
        if (sourceUserIds.has(row.userId)) {
          counts.skippedExistingUser += 1;
        } else {
          counts.skippedOrphaned += 1;
        }
        return null;
      };

      for (const scan of data.scans) {
        const userId = ownerOf(scan, report.scanRecords);
        if (userId === null) {
          continue;
        }
        await tx.execute(
          `INSERT INTO scan_records (user_id, dosha, confidence, image_reference, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, scan.dosha, scan.confidence, scan.imageReference, scan.createdAt],
        );
        report.scanRecords.migrated += 1;
      }

      for (const dosha of data.doshas) {
        const userId = ownerOf(dosha, report.userDosha);
        if (userId === null) {
          continue;
        }
        await tx.execute(
          `INSERT INTO user_dosha (user_id, dosha, confidence, updated_at)
           VALUES ($1, $2, $3, $4)`,
          [userId, dosha.dosha, dosha.confidence, dosha.updatedAt],
        );
        report.userDosha.migrated += 1;
      }

      // Read back what was written before committing.
      for (const user of data.users) {
        if (!newIds.has(user.id)) {
          continue;
        }
        const stored = await tx.queryOne('SELECT password_hash FROM users WHERE id = $1', [newIds.get(user.id)]);
        if (!stored || stored.password_hash !== user.passwordHash) {
          throw new MigrationError(`Verification failed for SQLite user #${user.id}.`);
        }
      }
      const ids = [...newIds.values()].map(String);
      if (ids.length > 0) {
        const counts = await tx.queryOne(
          `SELECT
             (SELECT COUNT(*) FROM scan_records WHERE user_id = ANY($1::bigint[])) AS scans,
             (SELECT COUNT(*) FROM user_dosha WHERE user_id = ANY($1::bigint[])) AS doshas`,
          [ids],
        );
        if (
          Number(counts.scans) !== report.scanRecords.migrated ||
          Number(counts.doshas) !== report.userDosha.migrated
        ) {
          throw new MigrationError('Verification failed: copied row counts do not match.');
        }
      }

      if (dryRun) {
        throw DRY_RUN_ROLLBACK;
      }
    });
  } catch (error) {
    if (error !== DRY_RUN_ROLLBACK) {
      throw error;
    }
  }

  return report;
}

function formatReport(report) {
  const { users, scanRecords, userDosha, sessions } = report;
  return [
    report.dryRun ? 'DRY RUN: validated and rolled back; nothing was written.' : 'Copy committed.',
    `Users:        ${users.source} in SQLite, ${users.migrated} ${report.dryRun ? 'would be ' : ''}copied, ${users.skippedExistingEmail} skipped (email already in PostgreSQL)`,
    `Scan records: ${scanRecords.source} in SQLite, ${scanRecords.migrated} ${report.dryRun ? 'would be ' : ''}copied, ${scanRecords.skippedExistingUser} skipped (owner skipped), ${scanRecords.skippedOrphaned} skipped (no owner)`,
    `Dosha rows:   ${userDosha.source} in SQLite, ${userDosha.migrated} ${report.dryRun ? 'would be ' : ''}copied, ${userDosha.skippedExistingUser} skipped (owner skipped), ${userDosha.skippedOrphaned} skipped (no owner)`,
    `Sessions:     ${sessions.source} in SQLite, not copied (users sign in again)`,
  ].join('\n');
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const { loadEnvFiles } = require('../src/env');
  const { loadDatabaseConfig } = require('../src/config');
  const { createPostgresDatabase, describeDatabase } = require('../src/database/postgres');

  loadEnvFiles();
  const databaseConfig = loadDatabaseConfig(process.env);
  if (databaseConfig.client !== 'postgres') {
    throw new MigrationError('DATABASE_URL is not set. Point it at the PostgreSQL database to copy into.');
  }
  if (!args.sqlitePath) {
    throw new MigrationError('Pass the SQLite file with --sqlite <file>.');
  }

  console.log(`Source: ${path.basename(args.sqlitePath)} (read-only)`);
  console.log(`Target: ${describeDatabase(databaseConfig.databaseUrl, databaseConfig.sslMode)}`);
  const target = createPostgresDatabase({ ...databaseConfig, poolMax: 1 });
  try {
    const report = await migrateSqliteToPostgres({
      sqlitePath: args.sqlitePath,
      target,
      dryRun: !args.confirm,
    });
    console.log(formatReport(report));
    if (report.dryRun) {
      console.log('Re-run with --confirm to copy.');
    }
  } finally {
    await target.close().catch(() => {});
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(error => {
    console.error('Migration failed; all PostgreSQL changes were rolled back.');
    // Driver errors carry a code and are reported by code only: their messages can contain
    // connection details or row values. Messages written by this app never contain secrets.
    console.error(error && error.code ? `Database error (${error.code})` : error.message);
    process.exit(1);
  });
}

module.exports = { MigrationError, formatReport, migrateSqliteToPostgres, parseArgs };
