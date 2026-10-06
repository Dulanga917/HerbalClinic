const DEV_CORS_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function parseList(value) {
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin) {
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function parseTrustProxy(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === 'false' || raw === '0') {
    return false;
  }
  const hops = Number(raw);
  if (Number.isInteger(hops) && hops > 0 && hops <= 10) {
    return hops;
  }
  throw new Error('TRUST_PROXY must be "false" or a number of proxy hops between 1 and 10.');
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value).trim().toLowerCase() === 'true';
}

function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';

  const configuredOrigins = parseList(env.CORS_ALLOWED_ORIGINS);
  const allowedOrigins = [];
  for (const origin of configuredOrigins) {
    const normalized = normalizeOrigin(origin);
    if (!normalized) {
      throw new Error(`CORS_ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
    }
    if (isProduction && normalized.startsWith('http://')) {
      throw new Error('CORS_ALLOWED_ORIGINS must use https:// origins in production.');
    }
    allowedOrigins.push(normalized);
  }

  return {
    isProduction,
    corsAllowedOrigins:
      configuredOrigins.length > 0 ? allowedOrigins : isProduction ? [] : DEV_CORS_ORIGINS,
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    enforceHttps: parseBoolean(env.ENFORCE_HTTPS, isProduction),
  };
}

const POSTGRES_PROTOCOLS = ['postgres:', 'postgresql:'];

function parseIntegerInRange(value, fallback, min, max, name) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be a whole number between ${min} and ${max}.`);
  }
  return parsed;
}

function parseSslMode(value, isProduction) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === 'require') {
    return 'require';
  }
  if (raw === 'disable') {
    if (isProduction) {
      throw new Error('DATABASE_SSL=disable is not allowed in production.');
    }
    return 'disable';
  }
  throw new Error('DATABASE_SSL must be "require" or "disable".');
}

// Error messages here never include the connection string, which carries the password.
function loadDatabaseConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const databaseUrl = String(env.DATABASE_URL ?? '').trim();

  if (!databaseUrl) {
    if (isProduction) {
      throw new Error('DATABASE_URL is required when NODE_ENV=production.');
    }
    return { client: 'sqlite', sqlitePath: env.SQLITE_PATH || undefined };
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.');
  }
  if (!POSTGRES_PROTOCOLS.includes(parsed.protocol) || !parsed.hostname) {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.');
  }

  return {
    client: 'postgres',
    databaseUrl,
    sslMode: parseSslMode(env.DATABASE_SSL, isProduction),
    sslCa: env.DATABASE_SSL_CA || undefined,
    sslCaFile: env.DATABASE_SSL_CA_FILE || undefined,
    poolMax: parseIntegerInRange(env.DATABASE_POOL_MAX, 10, 1, 50, 'DATABASE_POOL_MAX'),
  };
}

// Returns non-fatal warnings; throws when the production configuration cannot work safely.
function checkStartupConfig(config, env = process.env) {
  const warnings = [];
  if (!config.isProduction) {
    return warnings;
  }
  if (config.enforceHttps && config.trustProxy === false) {
    throw new Error(
      'ENFORCE_HTTPS is on but TRUST_PROXY is false. Set TRUST_PROXY to the number of TLS-terminating proxy hops (1 on Render).',
    );
  }
  const geminiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
    warnings.push('GEMINI_API_KEY is not set; AI guidance routes will return GEMINI_UNAVAILABLE.');
  }
  if (String(env.SEED_DEV_USER).toLowerCase() === 'true') {
    warnings.push('SEED_DEV_USER is ignored in production; no development account is created.');
  }
  return warnings;
}

module.exports = { loadConfig, loadDatabaseConfig, checkStartupConfig, DEV_CORS_ORIGINS };
