// Passwords, login sessions and patient link tokens.

import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { db } from './db.js';

const SESSION_HOURS = 8;
export const SESSION_COOKIE = 'sid';

// ---------- Passwords ----------
// scrypt is a deliberately slow hash, which makes guessing passwords from a
// stolen database expensive. Format stored: "scrypt$<salt>$<hash>".

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  // timingSafeEqual avoids leaking how many characters matched.
  return timingSafeEqual(expected, actual);
}

// ---------- Random tokens ----------

export function newToken() {
  return randomBytes(32).toString('base64url'); // 256 bits: impossible to guess
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

// ---------- Sessions ----------

export function createSession(clinicianId) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, clinician_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    clinicianId,
    expires
  );
  return { token, maxAgeMs: SESSION_HOURS * 3600 * 1000 };
}

export function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function clinicianForSession(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT c.id, c.name, c.email, c.language, s.expires_at
         FROM sessions s JOIN clinicians c ON c.id = s.clinician_id
        WHERE s.token_hash = ?`
    )
    .get(hashToken(token));
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, name: row.name, email: row.email, language: row.language || 'en' };
}

// Reads cookies from the request header without an extra library.
export function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

// ---------- Login rate limiting ----------
// At most 10 failed attempts per IP address per 15 minutes. Kept in memory,
// so it resets when the server restarts (fine for a single small server).

const failedLogins = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

export function tooManyFailures(ip) {
  const entry = failedLogins.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW_MS) return false;
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(ip) {
  const entry = failedLogins.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    failedLogins.set(ip, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

export function clearFailures(ip) {
  failedLogins.delete(ip);
}
