const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');

const dbFile = path.join(os.tmpdir(), `hc-verify-${process.pid}.sqlite`);
process.env.SQLITE_PATH = dbFile;
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;

// Run with: node --experimental-sqlite scripts/e2e-security-check.js
const SRC = path.join(__dirname, '..', 'src') + path.sep;
const ENV_EXAMPLE = path.join(__dirname, '..', '..', '.env.example');
const TINY_JPEG_BASE64 = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(32, 1),
]).toString('base64');
const { app } = require(SRC + 'index.js');
const dbm = require(SRC + 'db.js');

const results = [];
const rec = (name, pass, note = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}${note ? ' :: ' + note : ''}`);
};
const rand = () => 'Pw!' + crypto.randomBytes(9).toString('hex');
const sha = t => crypto.createHash('sha256').update(t).digest('hex');

let base;
async function call(method, p, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(base + p, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, headers: res.headers };
}

function rawGet(p, origin) {
  return new Promise((resolve, reject) => {
    const u = new URL(base + p);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname, method: 'GET', headers: { Origin: origin } },
      res => { res.resume(); res.on('end', () => resolve(res.headers)); },
    );
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  dbm.initDb(dbFile);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;

  const pwA = rand();
  const pwB = rand();
  const emailA = `a.${crypto.randomBytes(4).toString('hex')}@example.test`;
  const emailB = `b.${crypto.randomBytes(4).toString('hex')}@example.test`;

  // --- schema ---
  const tables = dbm.getDb().prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  for (const t of ['users', 'user_dosha', 'scan_records', 'sessions']) {
    rec(`DB table exists: ${t}`, tables.includes(t));
  }
  const fk = t => dbm.getDb().prepare(`PRAGMA foreign_key_list(${t})`).all();
  rec('FK scan_records.user_id -> users (CASCADE)', fk('scan_records').some(r => r.table === 'users' && r.from === 'user_id' && r.on_delete === 'CASCADE'));
  rec('FK user_dosha.user_id -> users (CASCADE)', fk('user_dosha').some(r => r.table === 'users' && r.on_delete === 'CASCADE'));
  rec('FK sessions.user_id -> users (CASCADE)', fk('sessions').some(r => r.table === 'users' && r.on_delete === 'CASCADE'));
  const fkPragma = dbm.getDb().prepare('PRAGMA foreign_keys').get();
  rec('PRAGMA foreign_keys is ON', Object.values(fkPragma)[0] === 1);
  const colsUsers = dbm.getDb().prepare('PRAGMA table_info(users)').all().map(c => c.name);
  rec('users columns', ['id', 'name', 'email', 'password_hash', 'created_at', 'updated_at'].every(c => colsUsers.includes(c)));
  const colsDosha = dbm.getDb().prepare('PRAGMA table_info(user_dosha)').all().map(c => c.name);
  rec('user_dosha columns', ['id', 'user_id', 'dosha', 'confidence', 'updated_at'].every(c => colsDosha.includes(c)));
  const colsScan = dbm.getDb().prepare('PRAGMA table_info(scan_records)').all().map(c => c.name);
  rec('scan_records columns', ['id', 'user_id', 'dosha', 'confidence', 'image_reference', 'created_at'].every(c => colsScan.includes(c)));
  const srcDb = fs.readFileSync(SRC + 'db.js', 'utf8');
  rec('db.js has no ${} interpolation (parameterized SQL)', !srcDb.includes('${'), `interpolations=${(srcDb.match(/\$\{/g) || []).length}`);

  // --- register ---
  let r = await call('POST', '/api/v1/auth/register', { name: 'Verify A', email: emailA, password: pwA });
  rec('Register valid user -> 201 + session issued', r.status === 201 && !!r.json?.token && r.json?.user?.email === emailA, `status=${r.status}`);
  const tokenA0 = r.json?.token;
  const idA = Number(r.json?.user?.id);
  rec('Register response leaks no password/hash', !/password|\$2[aby]\$/i.test(JSON.stringify(r.json?.user || {})));

  const row = dbm.getDb().prepare('SELECT password_hash FROM users WHERE id = ?').get(idA);
  rec('Stored value is not the plaintext password', row.password_hash !== pwA);
  rec('Stored value is a bcrypt hash ($2*)', /^\$2[aby]\$\d\d\$/.test(row.password_hash));
  rec('bcrypt cost factor >= 12', Number(row.password_hash.split('$')[2]) >= 12, `cost=${row.password_hash.split('$')[2]}`);

  dbm.getDb().exec('PRAGMA wal_checkpoint(TRUNCATE)');
  let leaked = false;
  for (const f of [dbFile, dbFile + '-wal']) {
    if (fs.existsSync(f)) {
      const buf = fs.readFileSync(f);
      if (buf.includes(Buffer.from(pwA)) || (tokenA0 && buf.includes(Buffer.from(tokenA0)))) leaked = true;
    }
  }
  rec('Plaintext password / raw session token absent from DB file bytes', !leaked);
  const sess = dbm.getDb().prepare('SELECT token_hash FROM sessions WHERE user_id = ?').get(idA);
  rec('Session token stored only as SHA-256 hash', sess.token_hash === sha(tokenA0));

  r = await call('POST', '/api/v1/auth/register', { name: 'Short', email: `s.${emailA}`, password: '1234567' });
  rec('Register with 7-char password rejected (400)', r.status === 400 && /at least 8/i.test(r.json?.error || ''), `status=${r.status}`);
  r = await call('POST', '/api/v1/auth/register', { name: 'Dup', email: emailA, password: rand() });
  rec('Duplicate email rejected (409)', r.status === 409, `status=${r.status}`);
  r = await call('POST', '/api/v1/auth/register', { name: 'Dup', email: emailA.toUpperCase(), password: rand() });
  rec('Duplicate email (case-insensitive) rejected (409)', r.status === 409, `status=${r.status}`);
  let uniqueThrown = false;
  try {
    dbm.getDb().prepare('INSERT INTO users (name,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)').run('x', emailA, 'h', 't', 't');
  } catch (e) { uniqueThrown = /UNIQUE/i.test(e.message); }
  rec('UNIQUE constraint on users.email enforced at DB level', uniqueThrown);

  r = await call('POST', '/api/v1/auth/register', { name: "Robert'); DROP TABLE users;--", email: `inj.${emailA}`, password: rand() });
  const stillThere = dbm.getDb().prepare("SELECT name FROM sqlite_master WHERE name='users'").get();
  rec('SQL-injection style name stored literally; users table intact', r.status === 201 && !!stillThere);

  // --- login ---
  r = await call('POST', '/api/v1/auth/login', { email: emailA, password: pwA });
  rec('Login with correct password -> 200', r.status === 200 && !!r.json?.token, `status=${r.status}`);
  const tokenA = r.json?.token;
  r = await call('POST', '/api/v1/auth/login', { email: emailA, password: rand() });
  const wrongMsg = r.json?.error;
  rec('Login with wrong password rejected (401)', r.status === 401, `status=${r.status}`);
  r = await call('POST', '/api/v1/auth/login', { email: `nobody.${emailA}`, password: rand() });
  rec('Unknown email returns same 401 + message (no user enumeration)', r.status === 401 && r.json?.error === wrongMsg);
  r = await call('POST', '/api/v1/auth/login', { email: "' OR 1=1 --", password: rand() });
  rec('SQLi in login email rejected', r.status === 401);

  r = await call('GET', '/api/v1/me', undefined, tokenA);
  rec('/me with valid session returns the right user', r.status === 200 && r.json?.user?.email === emailA);

  // --- logout ---
  r = await call('POST', '/api/v1/auth/logout', undefined, tokenA);
  rec('Logout -> 200', r.status === 200);
  r = await call('GET', '/api/v1/me', undefined, tokenA);
  rec('Token rejected after logout (401)', r.status === 401);

  // --- restart / restoration ---
  r = await call('POST', '/api/v1/auth/login', { email: emailA, password: pwA });
  const tokenR = r.json?.token;
  dbm.closeDb();
  dbm.initDb(dbFile);
  r = await call('GET', '/api/v1/me', undefined, tokenR);
  rec('Session restored after DB/server restart', r.status === 200 && r.json?.user?.email === emailA);

  // --- expiry / invalid ---
  dbm.getDb().prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(new Date(Date.now() - 1000).toISOString(), sha(tokenR));
  r = await call('GET', '/api/v1/me', undefined, tokenR);
  rec('Expired session rejected (401)', r.status === 401);
  const left = dbm.getDb().prepare('SELECT COUNT(*) c FROM sessions WHERE token_hash = ?').get(sha(tokenR)).c;
  rec('Expired session row purged on use', left === 0);
  r = await call('GET', '/api/v1/me', undefined, 'not-a-real-token');
  rec('Garbage token rejected (401)', r.status === 401);
  r = await call('GET', '/api/v1/me');
  rec('Missing Authorization header rejected (401)', r.status === 401);

  // --- isolation ---
  r = await call('POST', '/api/v1/auth/login', { email: emailA, password: pwA });
  const tA = r.json.token;
  r = await call('POST', '/api/v1/auth/register', { name: 'Verify B', email: emailB, password: pwB });
  const tB = r.json.token;
  const idB = Number(r.json.user.id);
  r = await call('POST', '/api/v1/scans', { dosha: 'Vata', confidence: 81, imageReference: 'a.jpg' }, tA);
  rec('User A can save a scan (201)', r.status === 201, `status=${r.status}`);
  r = await call('POST', '/api/v1/scans', { dosha: 'Pitta', confidence: 64, imageReference: 'b.jpg' }, tB);
  rec('User B can save a scan (201)', r.status === 201);
  r = await call('POST', '/api/v1/scans', { dosha: 'Kapha', confidence: 50, userId: idB, user_id: idB }, tA);
  const aScans = dbm.getScanRecordsForUser(idA);
  const bScans = dbm.getScanRecordsForUser(idB);
  rec('A never sees B scans (A rows are all A)', aScans.length === 2 && aScans.every(s => ['Vata', 'Kapha'].includes(s.dosha)));
  rec('B only sees B scans', bScans.length === 1 && bScans[0].dosha === 'Pitta');
  rec('Client-supplied userId in body is ignored (no impersonation)', !bScans.some(s => s.dosha === 'Kapha'));
  r = await call('GET', '/api/v1/scans');
  rec('GET /api/v1/scans requires auth (401 without token)', r.status === 401);
  r = await call('GET', '/api/v1/scans', undefined, tA);
  rec('GET /scans is isolated to user A', r.status === 200 && r.json?.scans?.length === 2 && r.json.scans.every(s => ['Vata', 'Kapha'].includes(s.dosha)));
  r = await call('GET', '/api/v1/scans', undefined, tB);
  rec('GET /scans is isolated to user B', r.status === 200 && r.json?.scans?.length === 1 && r.json.scans[0].dosha === 'Pitta');
  r = await call('GET', '/api/v1/me', undefined, tB);
  rec('/me scanCount is per-user (B=1)', r.json?.user?.scanCount === 1);

  let fkThrown = false;
  try {
    dbm.getDb().prepare('INSERT INTO scan_records (user_id,dosha,confidence,image_reference,created_at) VALUES (?,?,?,?,?)').run(999999, 'Vata', 1, 'x', 't');
  } catch (e) { fkThrown = /FOREIGN KEY/i.test(e.message); }
  rec('FK enforced: scan for nonexistent user rejected', fkThrown);

  // --- server-side input validation on scans ---
  const beforeCount = dbm.getScanRecordsForUser(idA).length;
  r = await call('POST', '/api/v1/scans', { dosha: '<script>alert(1)</script>', confidence: 99999, imageReference: 'x'.repeat(100000) }, tA);
  const accepted = r.status === 201;
  rec('Scan input validation (bad dosha/confidence/100KB ref rejected)', !accepted, accepted ? `ACCEPTED status=${r.status} (no server-side validation)` : `status=${r.status}`);
  r = await call('POST', '/api/v1/scans', { dosha: { a: 1 }, confidence: 'abc' }, tA);
  rec('Scan with wrong types returns 4xx (not 5xx)', r.status >= 400 && r.status < 500, `status=${r.status}`);
  void beforeCount;

  // --- cascade ---
  dbm.getDb().prepare('DELETE FROM users WHERE id = ?').run(idB);
  const orphanScans = dbm.getDb().prepare('SELECT COUNT(*) c FROM scan_records WHERE user_id = ?').get(idB).c;
  const orphanSess = dbm.getDb().prepare('SELECT COUNT(*) c FROM sessions WHERE user_id = ?').get(idB).c;
  rec('ON DELETE CASCADE removes scans + sessions of deleted user', orphanScans === 0 && orphanSess === 0);

  // --- Gemini proxy gating ---
  r = await call('POST', '/api/v1/skin-issue', { imageBase64: 'AAAA' });
  rec('Gemini endpoint requires auth (401 without token)', r.status === 401);
  r = await call('POST', '/api/v1/skin-issue', {}, tA);
  rec('Gemini endpoint validates body (400 without image)', r.status === 400);
  r = await call('POST', '/api/v1/skin-issue', { imageBase64: 'AAAA' }, tA);
  rec('Gemini endpoint rejects a non-image payload (400, no upstream call)', r.status === 400, `status=${r.status}`);
  r = await call('POST', '/api/v1/skin-issue', { imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' }, tA);
  rec('With no GEMINI_API_KEY in env the server fails closed (5xx, no upstream call)', r.status >= 500, `status=${r.status} msg="${r.json?.error}"`);
  rec('Error body does not echo any key material', !/AIza|AQ\./.test(JSON.stringify(r.json || {})));
  rec(
    'Missing key returns the stable GEMINI_UNAVAILABLE contract with no internals',
    r.status === 503 &&
      r.json?.code === 'GEMINI_UNAVAILABLE' &&
      !/GEMINI_API_KEY|configured|stack|\bat \w+ \(/i.test(JSON.stringify(r.json || {})),
    `status=${r.status} code=${r.json?.code}`,
  );

  // --- hardening observations ---
  const statuses = [];
  for (let i = 0; i < 8; i++) {
    const x = await call('POST', '/api/v1/auth/login', { email: emailA, password: rand() });
    statuses.push(x.status);
  }
  rec('Login brute-force throttling (expect some 429)', statuses.includes(429), `statuses=${[...new Set(statuses)].join(',')}`);
  const hdr = await rawGet('/health', 'https://evil.example');
  rec('CORS restricted (does not reflect arbitrary Origin)', hdr['access-control-allow-origin'] !== 'https://evil.example', `ACAO=${hdr['access-control-allow-origin']}`);
  rec('X-Powered-By disabled', !hdr['x-powered-by']);
  rec('Security headers present (e.g. X-Content-Type-Options)', !!hdr['x-content-type-options']);

  // --- dev seed gating ---
  const usersBefore = dbm.getDb().prepare('SELECT COUNT(*) c FROM users').get().c;
  process.env.SEED_DEV_USER = 'true';
  process.env.NODE_ENV = 'production';
  process.env.SEED_DEV_EMAIL = `seed.${emailA}`;
  process.env.SEED_DEV_PASSWORD = rand();
  await dbm.seedDevUserIfRequested();
  const usersProd = dbm.getDb().prepare('SELECT COUNT(*) c FROM users').get().c;
  rec('Dev seed does nothing when NODE_ENV=production', usersProd === usersBefore);
  process.env.NODE_ENV = 'development';
  delete process.env.SEED_DEV_EMAIL;
  let seedThrew = false;
  try { await dbm.seedDevUserIfRequested(); } catch { seedThrew = true; }
  rec('Dev seed refuses to run without explicit email/password env', seedThrew);
  process.env.SEED_DEV_EMAIL = `seed.${emailA}`;
  await dbm.seedDevUserIfRequested();
  const seeded = dbm.getDb().prepare('SELECT password_hash FROM users WHERE email = ?').get(`seed.${emailA}`);
  rec('Dev seed (dev only, env-driven) stores a bcrypt hash', !!seeded && /^\$2[aby]\$/.test(seeded.password_hash));
  process.env.SEED_DEV_USER = 'false';
  const defaultEnvSeed = fs.readFileSync(ENV_EXAMPLE, 'utf8').includes('SEED_DEV_USER=false');
  rec('.env.example ships with SEED_DEV_USER=false', defaultEnvSeed);

  server.close();
  dbm.closeDb();
  for (const f of [dbFile, dbFile + '-wal', dbFile + '-shm']) { try { fs.unlinkSync(f); } catch {} }
  const failed = results.filter(x => !x.pass);
  console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed; failed: ${failed.map(f => f.name).join(' || ') || 'none'}`);
  process.exit(0);
})().catch(e => { console.error('SCRIPT ERROR', e.message); process.exit(1); });
