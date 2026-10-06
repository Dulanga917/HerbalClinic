# HerbalClinic production deployment (Supabase PostgreSQL + Render)

> **Status: prepared, not executed.** No Supabase project, Render service, production
> database or published APK exists yet. Follow these steps when you are ready.

```
Android app ──HTTPS──▶ Render (Node/Express API) ──TLS──▶ Supabase PostgreSQL
                                                 └──────▶ Gemini API
```

The mobile app only ever talks to the API. It never receives the database URL, database
password, Supabase keys or the Gemini key, and it does not use the Supabase client SDK or
Supabase Auth. HerbalClinic keeps its own accounts (bcrypt, cost 12) and hashed session
tokens in its own tables.

## Secrets and where they live

| Value | Where it goes | Never |
| --- | --- | --- |
| Database password / `DATABASE_URL` | Render environment variable; your password manager | Git, the mobile app, logs, chat, screenshots |
| Supabase server root certificate | Render secret file | (public, but keep it with the config) |
| `GEMINI_API_KEY` (a **new** key) | Render environment variable | Git, the mobile app |
| Release keystore + passwords | Outside the repo; Gradle properties / env vars | Git |

Supabase's `anon`, `service_role` and other API keys are **not needed** by HerbalClinic.
Do not add them anywhere.

## 1. Create the Supabase project

1. Create a project in the region closest to where the Render service will run.
2. Generate a strong database password and store it in a password manager.
3. Optional hardening: in **Database settings → SSL configuration**, enable *Enforce SSL
   on incoming connections*.

## 2. Get the connection string (Session pooler)

Render only makes outbound **IPv4** connections, while Supabase's direct connection
(`db.<ref>.supabase.co`) is IPv6 unless you buy the IPv4 add-on. Use the **Session
pooler** string from the project's **Connect** panel:

```
postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-<N>-<REGION>.pooler.supabase.com:5432/postgres
```

- Use **session** mode (port 5432), not transaction mode (6543): the migration runner
  holds a session-level advisory lock, and the API sets per-connection timeouts.
- Replace `<PASSWORD>` and URL-encode special characters (`@` → `%40`, `#` → `%23`, …).
- Do not add `sslmode`/`sslrootcert` to the URL; the API ignores them and always
  verifies the certificate (see step 3).

## 3. Download the server root certificate

In **Database settings → SSL configuration**, download the server root certificate.
Supabase certificates are not signed by a public CA, so the API needs this file to verify
the server. Without it, connections fail with `SELF_SIGNED_CERT_IN_CHAIN` (by design:
certificate verification is never disabled).

## 4. Apply the schema

From a trusted machine, with the variables set only in that shell (not in a committed file):

```powershell
cd server
$env:DATABASE_URL = '<session pooler URL>'
$env:DATABASE_SSL_CA_FILE = 'C:\path\to\prod-supabase.crt'
npm run db:migrate
Remove-Item Env:DATABASE_URL
```

Expected: `Applied 1 migration(s): 001_initial_schema`. Running it again prints
`Schema is up to date`. The Render start command in step 7 also runs it on every deploy,
which is safe (already-applied migrations are skipped).

The migration enables row level security on every table and revokes access from the
`anon`/`authenticated` roles, so Supabase's auto-generated Data API cannot read
HerbalClinic tables. The API connects as the owning `postgres` role and is unaffected.

## 5. (Optional) Copy existing local SQLite data

Only if you want accounts and scan history from a local `herbalclinic.sqlite`:

```powershell
# Stop the local API first. Keep DATABASE_URL / DATABASE_SSL_CA_FILE set as in step 4.
npm run db:copy-sqlite -- --sqlite data/herbalclinic.sqlite            # dry run, rolls back
npm run db:copy-sqlite -- --sqlite data/herbalclinic.sqlite --confirm  # copy
```

- One transaction; any failure rolls everything back. The SQLite file is opened
  read-only. bcrypt hashes are copied exactly, so passwords keep working.
- Emails that already exist in PostgreSQL are skipped (never merged). Re-running does
  not duplicate data.
- **Sessions are not copied: every user signs in again** after the switch. Tell users
  to expect one sign-in prompt.
- Do not copy a database that contains a development seed account you don't want in
  production; remove that account locally first, or skip this step.

## 6. Create the Render web service

| Setting | Value |
| --- | --- |
| Repository / branch | your HerbalClinic repo, release branch |
| Root directory | `server` |
| Runtime | Node (version from `engines`: `>=22.13.0 <25`) |
| Build command | `npm ci --omit=dev` |
| Start command (free instance) | `npm run db:migrate && npm start` |
| Start command (paid instance) | `npm start`, with **Pre-Deploy Command** `npm run db:migrate` |
| Health check path | `/health` |
| Region | same region as the Supabase project |
| Instances | 1 (rate-limit counters are in memory) |

`--omit=dev` keeps PGlite and other test-only packages out of production.

## 7. Configure environment variables

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (Render also defaults to this at runtime; the API refuses to run on Render otherwise) |
| `DATABASE_URL` | Session pooler URL from step 2 (**secret**) |
| `DATABASE_SSL` | `require` (or leave unset) |
| `DATABASE_SSL_CA_FILE` | `/etc/secrets/supabase-ca.crt`, after adding the certificate as a Render **secret file** named `supabase-ca.crt` |
| `GEMINI_API_KEY` | a new Gemini key (**secret**); empty keeps AI routes on `GEMINI_UNAVAILABLE` |
| `TRUST_PROXY` | `1` (Render's TLS proxy; required, or startup fails with HTTPS enforcement on) |
| `ENFORCE_HTTPS` | leave unset (defaults to `true` in production) |
| `CORS_ALLOWED_ORIGINS` | leave empty (the native app sends no `Origin`) |
| `DATABASE_POOL_MAX` | optional, default `10`; keep within the Supabase pooler limit |
| `SEED_DEV_USER` | do not set (ignored in production anyway) |

`PORT` is provided by Render. Never set `DATABASE_SSL=disable` (refused in production).

## 8. Deploy and check the logs

A healthy start logs:

```
Applied 1 migration(s): 001_initial_schema     (or: Schema is up to date)
Connected to PostgreSQL database "postgres" (SSL verified)
HerbalClinic API listening on port 10000
```

Common failures (the API logs codes, never the URL or password):

| Log | Fix |
| --- | --- |
| `DATABASE_URL is required when NODE_ENV=production.` | set `DATABASE_URL` |
| `Database connection failed (SELF_SIGNED_CERT_IN_CHAIN)` | add the CA secret file and `DATABASE_SSL_CA_FILE` |
| `Database connection failed (ENETUNREACH)` / `(ENOTFOUND)` | use the **Session pooler** host, not the direct `db.<ref>` host |
| `Database connection failed (28P01)` | wrong password, or not URL-encoded |
| `The PostgreSQL schema has not been created. Run "npm run db:migrate" first.` | run step 4 or fix the start command |
| `ENFORCE_HTTPS is on but TRUST_PROXY is false…` | set `TRUST_PROXY=1` |

## 9. Verify the HTTPS endpoint

```powershell
curl.exe https://<service-name>.onrender.com/health
# {"ok":true,"status":"ok"}
```

`/health` returns only `ok` / `unavailable`. Free Render instances sleep when idle; the
first request after a pause can take up to about a minute, and the app shows its normal
connection/Retry handling during that time.

## 10. Point the mobile app at the API

In `src/constants/config.ts` set:

```ts
const PRODUCTION_API_BASE_URL = 'https://<service-name>.onrender.com';
```

This value is public (not a secret). Release builds reject anything that is not
`https://` on a public host (no `http://`, localhost, `10.0.2.2` or LAN addresses) and
fail closed if it is empty. Debug builds keep using `http://127.0.0.1:3001` via
`adb reverse`. Run `npx tsc --noEmit` and `npx jest` after the change.

## 11. Build a signed release

Provide the release keystore outside the repo (see the README "Release builds"
section), then:

```powershell
cd android
.\gradlew.bat assembleRelease   # APK for direct install/testing
.\gradlew.bat bundleRelease     # AAB for Google Play
```

Release builds are never signed with the debug keystore and block cleartext HTTP.

## 12. Test on a phone without adb

1. Run `adb reverse --remove-all`, unplug USB, and turn Wi-Fi off (use mobile data) so
   nothing can reach a development machine.
2. Install the signed release build.
3. Check: register, sign in, sign out and back in, Dosha scan saves and appears in
   history, AI skin guidance (or the `GEMINI_UNAVAILABLE` message if no key), herbal plan,
   Hospitals/Maps, Meditation, and an airplane-mode check (offline guidance shows, the
   saved session is kept, Retry recovers when back online).
4. If you copied SQLite data (step 5), confirm an existing account signs in with its old
   password and sees its history after the one-time sign-in.

## Afterwards

- Rotate the database password or Gemini key immediately if either is ever exposed;
  update the Render variable and redeploy.
- Check Supabase's backup options for your plan before storing real user data.
- Scaling past one Render instance requires moving the rate limiter to a shared store.
