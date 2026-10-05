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

module.exports = { loadConfig, DEV_CORS_ORIGINS };
