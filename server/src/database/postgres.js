const fs = require('fs');

const UNIQUE_VIOLATION = '23505';
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

// libpq-style SSL query parameters would override the explicit, verified `ssl` option
// below (node-postgres gives connection-string values precedence), so they are removed.
const SSL_QUERY_PARAMS = ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'sslpassword', 'uselibpqcompat'];

function stripSslParams(databaseUrl) {
  const url = new URL(databaseUrl);
  for (const name of SSL_QUERY_PARAMS) {
    url.searchParams.delete(name);
  }
  return url.toString();
}

function describeDatabase(databaseUrl, sslMode) {
  try {
    const url = new URL(databaseUrl);
    return `PostgreSQL database "${decodeURIComponent(url.pathname.replace(/^\//, '')) || 'postgres'}" (SSL ${
      sslMode === 'disable' ? 'disabled' : 'verified'
    })`;
  } catch {
    return 'PostgreSQL database';
  }
}

function readCa({ sslCa, sslCaFile }) {
  if (sslCa) {
    return sslCa.replace(/\\n/g, '\n');
  }
  if (sslCaFile) {
    return fs.readFileSync(sslCaFile, 'utf8');
  }
  return undefined;
}

function buildPoolConfig(options) {
  const {
    databaseUrl,
    sslMode = 'require',
    sslCa,
    sslCaFile,
    poolMax = 10,
    connectionTimeoutMs = 10000,
    idleTimeoutMs = 30000,
    statementTimeoutMs = 15000,
  } = options;

  const config = {
    connectionString: stripSslParams(databaseUrl),
    max: poolMax,
    connectionTimeoutMillis: connectionTimeoutMs,
    idleTimeoutMillis: idleTimeoutMs,
    statement_timeout: statementTimeoutMs,
    application_name: 'herbalclinic-api',
  };

  if (sslMode === 'disable') {
    config.ssl = false;
  } else {
    const ca = readCa({ sslCa, sslCaFile });
    config.ssl = ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
  }
  return config;
}

function isUniqueViolation(error) {
  return Boolean(error) && error.code === UNIQUE_VIOLATION;
}

function wrapClient(client) {
  return {
    async query(sql, params = []) {
      return (await client.query(sql, params)).rows;
    },
    async queryOne(sql, params = []) {
      return (await client.query(sql, params)).rows[0] ?? null;
    },
    async execute(sql, params = []) {
      return { rowCount: (await client.query(sql, params)).rowCount };
    },
  };
}

function createPostgresDatabase(options) {
  const { Pool } = require('pg');
  const { searchPath, logger = console } = options;
  if (searchPath !== undefined && !SAFE_IDENTIFIER.test(searchPath)) {
    throw new Error('Invalid PostgreSQL schema name.');
  }

  const pool = new Pool(buildPoolConfig(options));
  // Idle clients can fail when the server restarts; log without connection details and
  // let the pool replace them instead of crashing the process.
  pool.on('error', error => {
    logger.error(`PostgreSQL idle client error (${error.code || error.name || 'unknown'})`);
  });
  if (searchPath) {
    pool.on('connect', client => {
      client.query(`SET search_path TO "${searchPath}"`).catch(() => {});
    });
  }

  const executor = wrapClient(pool);

  return {
    dialect: 'postgres',
    pool,
    ...executor,
    async transaction(work) {
      const client = await pool.connect();
      let releaseError;
      try {
        await client.query('BEGIN');
        const result = await work(wrapClient(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          // A client that cannot roll back is discarded rather than returned to the pool.
          releaseError = rollbackError;
        }
        throw error;
      } finally {
        client.release(releaseError);
      }
    },
    async ping() {
      await pool.query('SELECT 1');
    },
    isUniqueViolation,
    async close() {
      await pool.end();
    },
  };
}

module.exports = {
  SSL_QUERY_PARAMS,
  buildPoolConfig,
  createPostgresDatabase,
  describeDatabase,
  isUniqueViolation,
  stripSslParams,
};
