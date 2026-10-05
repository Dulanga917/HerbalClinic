const fs = require('fs');
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

const rootEnv = path.join(__dirname, '..', '..', '.env');
const serverEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}
if (fs.existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv, override: true });
}

const {
  initDb,
  seedDevUserIfRequested,
  registerUser,
  loginUser,
  getUserByToken,
  logoutToken,
  saveScanRecord,
  getScanRecordsForUser,
} = require('./db');
const defaultGemini = require('./gemini');
const { loadConfig } = require('./config');
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
const JSON_BODY_LIMIT = '100kb';
const IMAGE_BODY_LIMIT = '9mb';

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function requireAuth(req, res, next) {
  const user = getUserByToken(getBearerToken(req));
  if (!user) {
    res.status(401).json({ error: 'Please sign in again.' });
    return;
  }
  req.user = user;
  next();
}

function handleError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  const message =
    status >= 500
      ? 'Something went wrong. Please try again.'
      : error.message || 'Request failed.';
  res.status(status).json({ error: message });
}

function badRequest(res, message) {
  res.status(400).json({ error: message });
}

function createApp({ config = loadConfig(), gemini = defaultGemini, rateLimits } = {}) {
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

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // The image route needs a larger body limit, so it is parsed before the default parser.
  const imageParser = express.json({ limit: IMAGE_BODY_LIMIT });
  const defaultParser = express.json({ limit: JSON_BODY_LIMIT });
  app.use((req, res, next) =>
    req.path === '/api/v1/skin-issue' ? imageParser(req, res, next) : defaultParser(req, res, next),
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

  app.post('/api/v1/auth/logout', (req, res) => {
    try {
      logoutToken(getBearerToken(req));
      res.json({ ok: true });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/v1/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.post('/api/v1/scans', requireAuth, (req, res) => {
    try {
      const input = validateScanInput(req.body);
      if (!input.ok) {
        badRequest(res, input.message);
        return;
      }
      const result = saveScanRecord({
        userId: Number(req.user.id),
        ...input.value,
      });
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/v1/scans', requireAuth, (req, res) => {
    const scans = getScanRecordsForUser(Number(req.user.id)).map(row => ({
      id: row.id,
      dosha: row.dosha,
      confidence: row.confidence,
      imageReference: row.image_reference,
      createdAt: row.created_at,
    }));
    res.json({ scans });
  });

  app.post('/api/v1/skin-issue', requireAuth, limiters.ai, async (req, res) => {
    try {
      const input = validateImageUpload(req.body);
      if (!input.ok) {
        badRequest(res, input.message);
        return;
      }
      const analysis = await gemini.analyseSkinIssue(input.value);
      res.json({ analysis });
    } catch (error) {
      if (/API_KEY_INVALID|API key not valid/i.test(String(error.message))) {
        handleError(
          res,
          Object.assign(
            new Error(
              'The server Gemini API key is invalid. Create a new key, store it in the server environment, and restart the API.',
            ),
            { status: 502 },
          ),
        );
        return;
      }
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
      const tip = await gemini.getDailyTip(input.value.dosha);
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
  initDb();
  await seedDevUserIfRequested();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HerbalClinic API listening on port ${PORT}`);
  });
}

if (require.main === module) {
  start().catch(error => {
    console.error('Failed to start API');
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { app, createApp, start };
