const express = require('express');
const { loadEnvFiles } = require('./env');

loadEnvFiles();

const {
  connectDatabase,
  checkDatabaseHealth,
  closeDb,
  seedDevUserIfRequested,
  registerUser,
  loginUser,
  getUserByToken,
  logoutToken,
  saveScanRecord,
  getScanRecordsForUser,
} = require('./db');
const { describeDatabaseConfig } = require('./database');
const defaultGemini = require('./gemini');
const {
  GEMINI_UNAVAILABLE,
  GEMINI_UNAVAILABLE_MESSAGE,
  QUOTA_EXCEEDED,
  analyseSkinGuidanceInLanguage,
  geminiUnavailable,
} = require('./aiGuidance');
const { IMAGE_REJECTED, IMAGE_REJECTED_MESSAGE } = require('./imageCheck');
const { loadConfig, loadDatabaseConfig, checkStartupConfig } = require('./config');
const {
  createRateLimiters,
  createCors,
  createSecurityHeaders,
  noStore,
  requireHttps,
} = require('./security');
const {
  validateScanInput,
  validateImageUpload,
  validateRecommendationInput,
  validateDailyTipInput,
} = require('./validation');

const PORT = Number(process.env.PORT || 3001);
const SESSION_INVALID = 'SESSION_INVALID';
const JSON_BODY_LIMIT = '100kb';
const IMAGE_BODY_LIMIT = '9mb';

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

// A database failure here must surface as a 5xx, never SESSION_INVALID, so the app
// keeps its saved token while the server is unavailable.
async function requireAuth(req, res, next) {
  let user;
  try {
    user = await getUserByToken(getBearerToken(req));
  } catch (error) {
    handleError(res, error);
    return;
  }
  if (!user) {
    res.status(401).json({ error: 'Please sign in again.', code: SESSION_INVALID });
    return;
  }
  req.user = user;
  next();
}

function logServerError(error) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  // Only the error class/code is logged: driver messages can echo request values.
  console.error(`Request failed (${(error && (error.code || error.name)) || 'unknown error'})`);
}

function handleError(res, error) {
  if (error && error.code === GEMINI_UNAVAILABLE) {
    if (error.reason === QUOTA_EXCEEDED) {
      if (Number.isInteger(error.retryAfterSeconds) && error.retryAfterSeconds > 0) {
        res.set('Retry-After', String(error.retryAfterSeconds));
      }
      res.status(503).json({ error: GEMINI_UNAVAILABLE_MESSAGE, code: GEMINI_UNAVAILABLE, reason: QUOTA_EXCEEDED });
      return;
    }
    res.status(503).json({ error: GEMINI_UNAVAILABLE_MESSAGE, code: GEMINI_UNAVAILABLE });
    return;
  }
  if (error && error.code === IMAGE_REJECTED) {
    res.status(422).json({ error: IMAGE_REJECTED_MESSAGE, code: IMAGE_REJECTED, imageCheck: error.imageCheck });
    return;
  }
  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (status >= 500) {
    logServerError(error);
  }
  const message =
    status >= 500
      ? 'Something went wrong. Please try again.'
      : error.message || 'Request failed.';
  res.status(status).json({ error: message });
}

function badRequest(res, message) {
  res.status(400).json({ error: message });
}

function createApp({
  config = loadConfig(),
  gemini = defaultGemini,
  rateLimits,
  healthCheck = checkDatabaseHealth,
} = {}) {
  const app = express();
  const limiters = createRateLimiters(rateLimits);

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(createSecurityHeaders());
  app.use(createCors(config.corsAllowedOrigins));
  app.use(noStore);
  if (config.enforceHttps) {
    app.use(requireHttps);
  }

  app.get('/health', async (_req, res) => {
    const healthy = await healthCheck().catch(() => false);
    if (healthy) {
      res.json({ ok: true, status: 'ok' });
      return;
    }
    res.status(503).json({ ok: false, status: 'unavailable' });
  });

  // The image routes need a larger body limit, so they are parsed before the default parser.
  const imageParser = express.json({ limit: IMAGE_BODY_LIMIT });
  const defaultParser = express.json({ limit: JSON_BODY_LIMIT });
  const imageRoutes = new Set(['/api/v1/skin-issue', '/api/v1/skin-image-check']);
  app.use((req, res, next) =>
    imageRoutes.has(req.path) ? imageParser(req, res, next) : defaultParser(req, res, next),
  );
  app.use('/api', (req, res, next) => {
    const hasBody = Number(req.headers['content-length'] || 0) > 0;
    if (req.method === 'POST' && hasBody && !req.is('application/json')) {
      res.status(415).json({ error: 'Content-Type must be application/json.' });
      return;
    }
    next();
  });
  app.use('/api', limiters.api);

  app.post(
    '/api/v1/auth/register',
    limiters.register,
    async (req, res) => {
      try {
        const result = await registerUser(req.body || {});
        res.status(201).json(result);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  app.post(
    '/api/v1/auth/login',
    limiters.loginIp,
    limiters.loginAccount,
    async (req, res) => {
      try {
        const result = await loginUser(req.body || {});
        res.json(result);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  app.post('/api/v1/auth/logout', async (req, res) => {
    try {
      await logoutToken(getBearerToken(req));
      res.json({ ok: true });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/v1/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.post('/api/v1/scans', requireAuth, async (req, res) => {
    try {
      const input = validateScanInput(req.body);
      if (!input.ok) {
        badRequest(res, input.message);
        return;
      }
      const result = await saveScanRecord({
        userId: Number(req.user.id),
        ...input.value,
      });
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/v1/scans', requireAuth, async (req, res) => {
    try {
      const scans = (await getScanRecordsForUser(Number(req.user.id))).map(row => ({
        id: row.id,
        dosha: row.dosha,
        confidence: row.confidence,
        imageReference: row.image_reference,
        createdAt: row.created_at,
      }));
      res.json({ scans });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/v1/skin-issue', requireAuth, limiters.ai, async (req, res) => {
    const startedAt = Date.now();
    let imageBytes = null;
    let mimeType = null;
    let language = null;
    let stage = 'gemini';
    // Metadata only: never the photo, base64 data, token, guidance text, or user details.
    const logOutcome = details =>
      console.log(
        `Skin guidance (${details}, language=${language ?? 'unknown'}, bytes=${imageBytes ?? 'unknown'}, ` +
          `mimeType=${mimeType ?? 'unknown'}, elapsedMs=${Date.now() - startedAt}, at=${new Date().toISOString()})`,
      );
    try {
      const input = validateImageUpload(req.body);
      if (!input.ok) {
        logOutcome('status=400, stage=upload_validation');
        badRequest(res, input.message);
        return;
      }
      imageBytes = Buffer.byteLength(input.value.imageBase64, 'base64');
      mimeType = input.value.mimeType;
      language = input.value.language;
      const checked = await analyseSkinGuidanceInLanguage(gemini, input.value);
      if (!checked) {
        stage = 'unusable_guidance';
        throw geminiUnavailable(new Error('Gemini returned unusable or wrong-language skin guidance.'));
      }
      logOutcome('status=200, stage=guidance');
      res.json({ analysis: checked.guidance, imageCheck: checked.imageCheck });
    } catch (error) {
      const code = (error && error.code) || 'none';
      const status =
        code === GEMINI_UNAVAILABLE ? 503 : code === IMAGE_REJECTED ? 422 : error?.status ?? 500;
      logOutcome(`status=${status}, stage=${stage}, code=${code}, reason=${(error && error.reason) || 'none'}`);
      handleError(res, error);
    }
  });

  // Skin Type Assessment runs on the phone, so its photo is checked here first; the app only
  // classifies (and saves) a photo after this returns isValid: true.
  app.post('/api/v1/skin-image-check', requireAuth, limiters.ai, async (req, res) => {
    const startedAt = Date.now();
    let imageBytes = null;
    let mimeType = null;
    // Metadata only: never the photo, base64 data, token, or user details.
    const logOutcome = details =>
      console.log(
        `Skin image check (${details}, bytes=${imageBytes ?? 'unknown'}, mimeType=${mimeType ?? 'unknown'}, ` +
          `elapsedMs=${Date.now() - startedAt})`,
      );
    try {
      const input = validateImageUpload(req.body);
      if (!input.ok) {
        logOutcome('status=400, stage=upload_validation');
        badRequest(res, input.message);
        return;
      }
      imageBytes = Buffer.byteLength(input.value.imageBase64, 'base64');
      mimeType = input.value.mimeType;
      const imageCheck = await gemini.checkSkinImage({
        imageBase64: input.value.imageBase64,
        mimeType: input.value.mimeType,
      });
      logOutcome(
        `status=200, stage=verdict, isValid=${imageCheck.isValid}, reason=${imageCheck.reason}, ` +
          `category=${imageCheck.imageCategory}`,
      );
      res.json({ imageCheck });
    } catch (error) {
      logOutcome(
        `status=${error && error.code === GEMINI_UNAVAILABLE ? 503 : error?.status ?? 500}, stage=gemini, ` +
          `code=${(error && error.code) || 'none'}, reason=${(error && error.reason) || 'none'}`,
      );
      handleError(res, error);
    }
  });

  app.post(
    '/api/v1/herbal-recommendations',
    requireAuth,
    limiters.ai,
    async (req, res) => {
      try {
        const input = validateRecommendationInput(req.body);
        if (!input.ok) {
          badRequest(res, input.message);
          return;
        }
        const herbs = await gemini.getHerbalRecommendations(
          input.value.condition,
          input.value.dosha,
          input.value.language,
        );
        res.json({ herbs });
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  app.post('/api/v1/daily-tip', requireAuth, limiters.ai, async (req, res) => {
    try {
      const input = validateDailyTipInput(req.body);
      if (!input.ok) {
        badRequest(res, input.message);
        return;
      }
      const tip = await gemini.getDailyTip(input.value.dosha, input.value.language);
      res.json({ tip });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body is too large.' });
      return;
    }
    if (error.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body is not valid JSON.' });
      return;
    }
    handleError(res, error);
  });

  return app;
}

const app = createApp();

async function start() {
  const config = loadConfig();
  for (const warning of checkStartupConfig(config)) {
    console.warn(`Warning: ${warning}`);
  }
  const databaseConfig = loadDatabaseConfig();
  await connectDatabase(databaseConfig);
  console.log(`Connected to ${describeDatabaseConfig(databaseConfig)}`);
  await seedDevUserIfRequested();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`HerbalClinic API listening on port ${PORT}`);
  });

  const shutdown = signal => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      closeDb()
        .catch(() => {})
        .finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (require.main === module) {
  start().catch(error => {
    console.error('Failed to start API');
    // Driver errors carry a code and can name the host or user; configuration errors
    // raised by this app are plain messages that never include secrets.
    console.error(error.code ? `Database connection failed (${error.code})` : error.message);
    process.exit(1);
  });
}

module.exports = { app, createApp, start };
