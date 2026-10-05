# HerbalClinic API

Backend for authentication, SQLite persistence, and Gemini proxying.

The Gemini API key must live only in `.env` (server side). Never put it in the mobile app.

## Run and test

```powershell
npm install
npm start          # node --experimental-sqlite src/index.js
npm test           # unit + API security tests
npm run verify:e2e # end-to-end auth / DB / hardening checks against the real app
```

## Hardening

| Area | Behavior |
| --- | --- |
| Login throttling | Failed sign-ins: 5 per 15 min per IP + email, 10 per 15 min per IP. Successful sign-ins are not counted. Excess requests get `429`. |
| Registration | 10 requests per hour per IP. |
| Gemini endpoints | 10 requests per minute per signed-in user. |
| General API | 300 requests per 15 min per IP. |
| CORS | Only origins in `CORS_ALLOWED_ORIGINS` (dev defaults: local Metro/API on localhost). Other browser origins get `403`. Native app requests carry no `Origin` and are unaffected. |
| Headers | Helmet defaults plus `Content-Security-Policy: default-src 'none'`, HSTS, `no-referrer`, `nosniff`, `Cache-Control: no-store`. `X-Powered-By` is removed. |
| Transport | With `ENFORCE_HTTPS=true` (default in production) non-HTTPS requests get `426`, except `/health`. Set `TRUST_PROXY` to the number of proxy hops so `X-Forwarded-Proto` is honoured. |
| Input | JSON bodies are capped at 100 KB (9 MB for `/skin-issue`). Scans accept only known doshas, a 0-100 confidence and a safe file reference. Uploads must be base64 JPEG/PNG/WebP (checked by file signature, max 6 MB). Gemini prompt inputs are length- and character-restricted. |
| Errors | 5xx responses never include internal details. Malformed JSON returns a generic `400`. |

Rate-limit counters live in process memory. Run a single instance, or move the limiter to a shared store, before scaling horizontally.
