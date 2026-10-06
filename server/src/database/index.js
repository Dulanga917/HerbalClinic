const { createSqliteDatabase, defaultSqlitePath } = require('./sqlite');
const { createPostgresDatabase, describeDatabase } = require('./postgres');

function openDatabase(databaseConfig, options = {}) {
  if (databaseConfig.client === 'postgres') {
    return createPostgresDatabase({ ...databaseConfig, ...options });
  }
  return createSqliteDatabase({ filename: databaseConfig.sqlitePath || defaultSqlitePath() });
}

function describeDatabaseConfig(databaseConfig) {
  return databaseConfig.client === 'postgres'
    ? describeDatabase(databaseConfig.databaseUrl, databaseConfig.sslMode)
    : 'local SQLite database';
}

module.exports = { openDatabase, describeDatabaseConfig };
