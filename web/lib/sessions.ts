/** Sesi login: token acak di cookie, hanya hash-nya yang disimpan di database. */
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";
import type { User } from "./users";

const SESSION_DAYS = 30;
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function createSession(userId: number): string {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400_000);
  getDb().prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(hashToken(token), userId, expires.toISOString(), now.toISOString());
  return token;
}

export function getSessionUser(token: string | undefined | null): User | null {
  if (!token) return null;
  const row = getDb()
    .prepare(`SELECT u.id, u.email, u.name, u.slug, u.role, u.bio, u.avatar, s.expires_at
              FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`)
    .get(hashToken(token)) as (User & { expires_at: string }) | undefined;
  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) {
    deleteSession(token);
    return null;
  }
  const { expires_at: _, ...user } = row;
  return user;
}

export function deleteSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(hashToken(token));
}

export function tooManyAttempts(key: string): boolean {
  const db = getDb();
  const since = Date.now() - WINDOW_MS;
  db.prepare("DELETE FROM login_attempts WHERE at < ?").run(since);
  const n = (db.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at >= ?").get(key, since) as { n: number }).n;
  return n >= MAX_ATTEMPTS;
}

export function recordFailure(key: string) {
  getDb().prepare("INSERT INTO login_attempts (key, at) VALUES (?, ?)").run(key, Date.now());
}

export function clearFailures(key: string) {
  getDb().prepare("DELETE FROM login_attempts WHERE key = ?").run(key);
}
