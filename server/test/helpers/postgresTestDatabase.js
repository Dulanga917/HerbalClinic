const crypto = require('crypto');
const { createPostgresDatabase } = require('../../src/database/postgres');

// PostgreSQL integration tests run against one of:
//   - TEST_DATABASE_URL: a disposable PostgreSQL server you control (never production).
//     Each empty target is a throwaway schema, dropped afterwards.
//   - otherwise PGlite: the real PostgreSQL engine compiled to WebAssembly, served
//     in-process over the PostgreSQL wire protocol so the production `pg` driver is used.
//     PGlite runs every socket connection in one shared session (session settings such as
//     search_path are not per connection), so each empty target is a fresh PGlite instance.
//     PGlite has no TLS support, so it runs with SSL disabled.

const silentLogger = { error: () => {} };

async function startPglite() {
  const { PGlite } = require('@electric-sql/pglite');
  const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
  const pglite = await PGlite.create();
  const server = new PGLiteSocketServer({ db: pglite, host: '127.0.0.1', port: 0, maxConnections: 20 });
  await server.start();
  const { port } = server.server.address();
  return {
    databaseUrl: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`,
    sslMode: 'disable',
    // The in-memory engine is left for process exit: closing it while sockets are still
    // disconnecting makes the socket server touch a closed instance.
    stop: () => server.stop(),
  };
}

async function createTestDatabase({ poolMax = 5 } = {}) {
  const externalUrl = process.env.TEST_DATABASE_URL;
  const externalSsl = process.env.TEST_DATABASE_SSL === 'disable' ? 'disable' : 'require';
  const backends = [];
  const schemas = [];
  const opened = [];
  const admin = externalUrl
    ? createPostgresDatabase({ databaseUrl: externalUrl, sslMode: externalSsl, poolMax: 1, logger: silentLogger })
    : null;

  /** A new, empty PostgreSQL database target: { databaseUrl, sslMode, searchPath }. */
  async function newTarget() {
    if (externalUrl) {
      const schema = `hc_test_${crypto.randomBytes(6).toString('hex')}`;
      await admin.execute(`CREATE SCHEMA "${schema}"`);
      schemas.push(schema);
      return { databaseUrl: externalUrl, sslMode: externalSsl, searchPath: schema };
    }
    const backend = await startPglite();
    backends.push(backend);
    return { databaseUrl: backend.databaseUrl, sslMode: backend.sslMode, searchPath: undefined };
  }

  function openTarget(target, overrides = {}) {
    const database = createPostgresDatabase({
      databaseUrl: target.databaseUrl,
      sslMode: target.sslMode,
      searchPath: target.searchPath,
      poolMax,
      logger: silentLogger,
      ...overrides,
    });
    opened.push(database);
    return database;
  }

  const target = await newTarget();
  return {
    kind: externalUrl
      ? 'external PostgreSQL (TEST_DATABASE_URL)'
      : 'PGlite (PostgreSQL compiled to WebAssembly, local, in-process)',
    target,
    database: openTarget(target),
    newTarget,
    openTarget,
    async cleanup() {
      for (const database of opened) {
        await database.close().catch(() => {});
      }
      if (admin) {
        for (const schema of schemas) {
          await admin.execute(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
        }
        await admin.close().catch(() => {});
      }
      for (const backend of backends) {
        await backend.stop().catch(() => {});
      }
    },
  };
}

module.exports = { createTestDatabase };
