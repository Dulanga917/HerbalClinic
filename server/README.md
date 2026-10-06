# HerbalClinic API

Backend for authentication, persistence, and Gemini proxying.

The Gemini API key and the database connection string live only in the server environment (`.env` locally, environment variables when hosted). Never put either in the mobile app; the app only talks to this API over HTTPS.

## Run and test

```powershell
npm install
npm start             # node --experimental-sqlite src/index.js
npm test              # unit + API security tests (SQLite)
npm run verify:e2e    # end-to-end auth / DB / hardening checks against the real app (SQLite)
npm run test:postgres # PostgreSQL integration + migration-tool tests (PGlite, see below)
```

## Database

| Environment | Database | How it is chosen |
| --- | --- | --- |
| Development / tests | Local SQLite file (`server/data/herbalclinic.sqlite`, or `SQLITE_PATH`) | `DATABASE_URL` empty |
| Production | PostgreSQL (planned: Supabase) | `DATABASE_URL` set; **required** when `NODE_ENV=production` (the API refuses to start without it) |

The repository code (`src/db.js`) is the same for both. SQL is written once with `$1..$n` parameters; the drivers in `src/database/` adapt it. Every query is parameterised.

**Schema.** PostgreSQL tables come from versioned SQL files in `migrations/`, applied only by:

```powershell
npm run db:migrate    # applies pending migrations to DATABASE_URL, then exits
```

The API never migrates on startup; it checks that every migration has been applied and refuses to start otherwise. Migrations run one transaction per file under an advisory lock, so a failed migration leaves nothing behind and two runs cannot overlap. The schema enables row level security on every table with no policies, and revokes access from Supabase's `anon` / `authenticated` roles, so only the API's own database user (the table owner) can read or write data.

**TLS.** `DATABASE_SSL=require` (default) encrypts *and verifies* the server certificate (`rejectUnauthorized: true`). `sslmode`/`sslrootcert` parameters in `DATABASE_URL` are ignored so they cannot weaken this. For providers whose certificate is not publicly trusted (Supabase), supply the CA with `DATABASE_SSL_CA` (PEM text, `\n` for line breaks) or `DATABASE_SSL_CA_FILE` (path). `DATABASE_SSL=disable` exists for local PostgreSQL only and is refused in production.

**Logging.** Startup prints only the database name and whether TLS is verified. Database errors are logged as a code (e.g. `Request failed (42P01)`) and returned to clients as a generic 5xx. A database outage never produces `SESSION_INVALID`, so the app keeps its saved token. `GET /health` returns only `{ ok, status }` (`200 ok` / `503 unavailable`).

**Development account.** `SEED_DEV_USER` creates an account only in the local SQLite database and never when `NODE_ENV=production`. A hosted PostgreSQL database never gets a known login.

### Copying existing SQLite data to PostgreSQL (optional, one-off)

```powershell
# 1. Stop the local API so the SQLite file is not being written.
# 2. Point DATABASE_URL at the target and apply the schema.
npm run db:migrate
# 3. Dry run: validates the copy inside a transaction, then rolls it back.
npm run db:copy-sqlite -- --sqlite data/herbalclinic.sqlite
# 4. Copy for real.
npm run db:copy-sqlite -- --sqlite data/herbalclinic.sqlite --confirm
```

- The SQLite file is opened read-only and never modified.
- Users, scan history and dosha profiles are copied in **one PostgreSQL transaction**; any error rolls everything back. bcrypt hashes are copied byte-for-byte, so existing passwords keep working. Timestamps are preserved (zone-less legacy values are read as UTC). PostgreSQL assigns new ids; relationships are remapped.
- A user whose email already exists in PostgreSQL is **skipped with all of their data**, never merged or overwritten. Re-running the copy therefore creates no duplicates.
- **Sessions are not copied.** Every user signs in again after the move. This avoids carrying long-lived tokens into the new system.
- The tool prints counts only, never emails, hashes, tokens or the connection string.

## Test layers

| Command | Database | What it proves |
| --- | --- | --- |
| `npm test` | Real SQLite (Node's built-in `node:sqlite`) | Unit tests (config, TLS options, migrations, seed guard, health) and API security tests |
| `npm run verify:e2e` | Real SQLite | End-to-end auth, sessions, isolation and hardening against the real app |
| `npm run test:postgres` | PGlite: the PostgreSQL engine compiled to WebAssembly, served over the PostgreSQL wire protocol, used through the production `pg` driver | Schema/migrations, auth, sessions, isolation, transactions, error sanitisation and the migration tools on real PostgreSQL SQL semantics |

PGlite is a dev dependency only; production never loads it. It does not exercise TLS, the network, a connection pooler or a hosted provider. To run the same suite against a disposable PostgreSQL server you control (never production), set `TEST_DATABASE_URL` (plus `TEST_DATABASE_SSL=disable` for a local server without TLS); each run uses throwaway schemas that are dropped afterwards.

Deployment steps for Supabase + Render: see [`../DEPLOYMENT.md`](../DEPLOYMENT.md).

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
