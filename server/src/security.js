const cors = require('cors');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const MINUTE = 60 * 1000;

const DEFAULT_RATE_LIMITS = {
  loginIp: { windowMs: 15 * MINUTE, limit: 10 },
  loginAccount: { windowMs: 15 * MINUTE, limit: 5 },
  register: { windowMs: 60 * MINUTE, limit: 10 },
  api: { windowMs: 15 * MINUTE, limit: 300 },
  ai: { windowMs: MINUTE, limit: 10 },
};

function tooManyRequests(message) {
  return { error: message };
}

function limiter({ windowMs, limit }, message, extra = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooManyRequests(message),
    ...extra,
  });
}

function createRateLimiters(overrides = {}) {
  const settings = {};
  for (const key of Object.keys(DEFAULT_RATE_LIMITS)) {
    settings[key] = { ...DEFAULT_RATE_LIMITS[key], ...(overrides[key] || {}) };
  }

  const authMessage = 'Too many attempts. Please wait a few minutes and try again.';

  return {
    api: limiter(settings.api, 'Too many requests. Please slow down and try again shortly.'),
    // Only failed sign-ins count, so normal use is never throttled, but guessing is.
    loginIp: limiter(settings.loginIp, authMessage, { skipSuccessfulRequests: true }),
    loginAccount: limiter(settings.loginAccount, authMessage, {
      skipSuccessfulRequests: true,
      keyGenerator: req => {
        const email =
          typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        return `${ipKeyGenerator(req.ip)}|${email.slice(0, 254)}`;
      },
    }),
    register: limiter(settings.register, authMessage),
    ai: limiter(settings.ai, 'Too many analysis requests. Please wait a minute and try again.', {
      keyGenerator: req => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip)),
    }),
  };
}

function createCors(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return cors({
    origin(origin, callback) {
      // Native clients send no Origin header; CORS only governs browsers.
      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(Object.assign(new Error('Origin not allowed.'), { status: 403 }));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });
}

function createSecurityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    hsts: { maxAge: 15552000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  });
}

function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  next();
}

function requireHttps(req, res, next) {
  if (req.secure || req.path === '/health') {
    next();
    return;
  }
  res.status(426).json({ error: 'HTTPS is required.' });
}

module.exports = {
  DEFAULT_RATE_LIMITS,
  createRateLimiters,
  createCors,
  createSecurityHeaders,
  noStore,
  requireHttps,
};
