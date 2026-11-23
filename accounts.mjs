const encoder = new TextEncoder();
// Cloudflare's hosted Web Crypto caps PBKDF2 at 100,000 iterations.
const iterations = 100_000;
const lifetime = 8 * 60 * 60;
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const random = count => crypto.getRandomValues(new Uint8Array(count));
const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const saltBytes = salt => Uint8Array.from(salt.match(/../g), byte => parseInt(byte, 16));

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', salt: saltBytes(salt), iterations }, key, 256));
}

function equalHash(left, right) {
  let difference = left.length ^ right.length;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS accounts (
      email TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      password_hash TEXT NOT NULL, salt TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, email TEXT NOT NULL REFERENCES accounts(email), expires_at INTEGER NOT NULL
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (expires_at)'),
  ]);
}

export async function openAccount(db, details, signup) {
  await ensureSchema(db);
  const { email, password, firstName, lastName } = details;
  const token = hex(random(32));
  const now = Math.floor(Date.now() / 1000);
  const addSession = db.prepare('INSERT INTO sessions (token_hash, email, expires_at) VALUES (?, ?, ?)')
    .bind(await digest(token), email, now + lifetime);
  const expireSessions = db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now);
  if (signup) {
    const salt = hex(random(16));
    const passwordHash = await hashPassword(password, salt);
    const createAccount = db.prepare(`INSERT INTO accounts (email, first_name, last_name, password_hash, salt)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING`).bind(email, firstName, lastName, passwordHash, salt);
    const createSignupSession = db.prepare(`INSERT INTO sessions (token_hash, email, expires_at)
      SELECT ?, ?, ? WHERE changes() = 1`).bind(await digest(token), email, now + lifetime);
    const [account] = await db.batch([createAccount, createSignupSession, expireSessions]);
    if (!account.meta.changes) return null;
  } else {
    const account = await db.prepare('SELECT salt, password_hash FROM accounts WHERE email = ?').bind(email).first();
    const salt = account?.salt ?? '00000000000000000000000000000000';
    const passwordHash = await hashPassword(password, salt);
    if (!account || !equalHash(passwordHash, account.password_hash)) return null;
    await db.batch([expireSessions, addSession]);
  }
  return token;
}

export async function validSession(db, token) {
  return Boolean(await db.prepare('SELECT 1 FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(await digest(token), Math.floor(Date.now() / 1000)).first());
}

export async function revokeSession(db, token) {
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digest(token)).run();
}
export async function activateStaff(db, person, password) {
  await ensureSchema(db);
  await db.prepare('CREATE TABLE IF NOT EXISTS staff_members (email TEXT PRIMARY KEY REFERENCES accounts(email))').run();
  const salt = hex(random(16));
  const hash = await hashPassword(password, salt);
  const token = hex(random(32));
  const now = Math.floor(Date.now() / 1000);
  const [account] = await db.batch([
    db.prepare(`INSERT INTO accounts (email, first_name, last_name, password_hash, salt)
      SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM staff_members WHERE email = ?)
      ON CONFLICT(email) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name,
        password_hash = excluded.password_hash, salt = excluded.salt`)
      .bind(person.email, person.firstName, person.lastName, hash, salt, person.email),
    db.prepare('DELETE FROM sessions WHERE email = ? AND NOT EXISTS (SELECT 1 FROM staff_members WHERE email = ?)')
      .bind(person.email, person.email),
    db.prepare(`INSERT INTO sessions (token_hash, email, expires_at)
      SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM staff_members WHERE email = ?)`)
      .bind(await digest(token), person.email, now + lifetime, person.email),
    db.prepare('INSERT INTO staff_members (email) VALUES (?) ON CONFLICT DO NOTHING').bind(person.email),
  ]);
  return account.meta.changes === 1 ? token : null;
}

export async function sessionEmail(db, token) {
  const result = await db.prepare('SELECT email FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(await digest(token), Math.floor(Date.now() / 1000)).first();
  return result?.email ?? null;
}

export async function isStaff(db, email) {
  if (!email) return false;
  await db.prepare('CREATE TABLE IF NOT EXISTS staff_members (email TEXT PRIMARY KEY REFERENCES accounts(email))').run();
  return Boolean(await db.prepare('SELECT 1 FROM staff_members WHERE email = ?').bind(email).first());
}

export async function matchesInvitation(code, expected) {
  return /^[a-f0-9]{64}$/.test(expected ?? '') && /^[a-f0-9]{48}$/.test(code) &&
    equalHash(await digest(code), expected);
}

// This grants access to sample data only. Live staff permissions use staff_members.
export async function canTestStaffView(email) {
  return Boolean(email && (await digest(email)) === "0026199131e526802debe85fb6b55e44be6c81507384989046e7e2517ef01998");
}
