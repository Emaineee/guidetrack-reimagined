const encoder = new TextEncoder();
const iterations = 600_000;
const lifetime = 8 * 60 * 60;
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const random = count => crypto.getRandomValues(new Uint8Array(count));
const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const saltBytes = salt => Uint8Array.from(salt.match(/../g), byte => parseInt(byte, 16));

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes(salt), iterations }, key, 256));
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
