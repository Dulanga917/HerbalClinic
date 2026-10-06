const fs = require('fs');
const path = require('path');

const SQLITE_SCHEMA = `
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
`;

function defaultSqlitePath() {
  if (process.env.SQLITE_PATH) {
    return process.env.SQLITE_PATH;
  }
  const dataDir = path.join(__dirname, '..', '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'herbalclinic.sqlite');
}

// Queries are written once with PostgreSQL-style $1..$n placeholders; SQLite accepts
// the equivalent numbered form ?1..?n with positional binding.
function toSqlitePlaceholders(sql) {
  return sql.replace(/\$(\d+)/g, '?$1');
}

function isUniqueViolation(error) {
  return Boolean(error) && /UNIQUE constraint failed/i.test(String(error.message || ''));
}

function createSqliteDatabase({ filename = defaultSqlitePath(), readOnly = false } = {}) {
  // Loaded lazily so PostgreSQL deployments never touch the experimental module.
  const { DatabaseSync } = require('node:sqlite');
  const raw = readOnly ? new DatabaseSync(filename, { readOnly: true }) : new DatabaseSync(filename);
  if (!readOnly) {
    raw.exec('PRAGMA journal_mode = WAL');
    raw.exec('PRAGMA foreign_keys = ON');
    raw.exec(SQLITE_SCHEMA);
  }

  const statements = new Map();
  const prepare = sql => {
    let statement = statements.get(sql);
    if (!statement) {
      statement = raw.prepare(toSqlitePlaceholders(sql));
      statements.set(sql, statement);
    }
    return statement;
  };

  const executor = {
    async query(sql, params = []) {
      return prepare(sql).all(...params);
    },
    async queryOne(sql, params = []) {
      return prepare(sql).get(...params) ?? null;
    },
    async execute(sql, params = []) {
      const result = prepare(sql).run(...params);
      return { rowCount: Number(result.changes) };
    },
  };

  let inTransaction = false;

  return {
    dialect: 'sqlite',
    raw,
    ...executor,
    // node:sqlite is synchronous, so a callback that only awaits these executor calls
    // completes inside one macrotask and no other request can interleave with it.
    async transaction(work) {
      if (inTransaction) {
        throw new Error('Nested transactions are not supported.');
      }
      inTransaction = true;
      raw.exec('BEGIN');
      try {
        const result = await work(executor);
        raw.exec('COMMIT');
        return result;
      } catch (error) {
        if (raw.isTransaction) {
          raw.exec('ROLLBACK');
        }
        throw error;
      } finally {
        inTransaction = false;
      }
    },
    async ping() {
      raw.prepare('SELECT 1').get();
    },
    isUniqueViolation,
    async close() {
      statements.clear();
      raw.close();
    },
    closeSync() {
      statements.clear();
      raw.close();
    },
  };
}

module.exports = {
  SQLITE_SCHEMA,
  createSqliteDatabase,
  defaultSqlitePath,
  toSqlitePlaceholders,
};
