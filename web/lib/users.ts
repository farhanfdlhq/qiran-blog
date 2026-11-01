/** Akun penulis dan admin. */
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./passwords";
import { slugify } from "./text";
import { nowIso } from "./time";

export type Role = "admin" | "author";
export type User = { id: number; email: string; name: string; slug: string; role: Role; bio: string; avatar: string };

const COLS = "id, email, name, slug, role, bio, avatar";

function uniqueUserSlug(base: string, ignoreId?: number): string {
  const db = getDb();
  let slug = base, i = 2;
  while (db.prepare("SELECT 1 FROM users WHERE slug = ? AND id IS NOT ?").get(slug, ignoreId ?? null)) slug = `${base}-${i++}`;
  return slug;
}

export async function createUser(input: { email: string; name: string; role: Role; password: string; bio?: string }): Promise<User> {
  if (input.password.length < 10) throw new Error("Password minimal 10 karakter.");
  const db = getDb();
  const hash = await hashPassword(input.password);
  const slug = uniqueUserSlug(slugify(input.name));
  const info = db
    .prepare("INSERT INTO users (email, name, slug, role, bio, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(input.email.trim().toLowerCase(), input.name.trim(), slug, input.role, input.bio ?? "", hash, nowIso());
  return getUser(Number(info.lastInsertRowid))!;
}

export function getUser(id: number): User | null {
  return (getDb().prepare(`SELECT ${COLS} FROM users WHERE id = ?`).get(id) as User) ?? null;
}

export function getUserBySlug(slug: string): User | null {
  return (getDb().prepare(`SELECT ${COLS} FROM users WHERE slug = ?`).get(slug) as User) ?? null;
}

export function listUsers(): (User & { post_count: number })[] {
  return getDb()
    .prepare(`SELECT ${COLS.split(", ").map((c) => "u." + c).join(", ")}, (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.type='post') AS post_count FROM users u ORDER BY u.role, u.name`)
    .all() as (User & { post_count: number })[];
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const row = getDb().prepare(`SELECT ${COLS}, password_hash FROM users WHERE email = ?`).get(email.trim().toLowerCase()) as (User & { password_hash: string }) | undefined;
  // Tetap hitung hash walau akun tidak ada, supaya waktu respons tidak membocorkan email terdaftar
  const ok = await verifyPassword(password, row?.password_hash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!row || !ok) return null;
  const { password_hash: _, ...user } = row;
  return user;
}

export async function setPassword(userId: number, password: string) {
  if (password.length < 10) throw new Error("Password minimal 10 karakter.");
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashPassword(password), userId);
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function updateProfile(userId: number, data: { name: string; bio: string; avatar?: string; email?: string }) {
  const db = getDb();
  const current = getUser(userId);
  if (!current) throw new Error("Akun tidak ditemukan.");
  const slug = data.name.trim() !== current.name ? uniqueUserSlug(slugify(data.name), userId) : current.slug;
  db.prepare("UPDATE users SET name = ?, slug = ?, bio = ?, avatar = COALESCE(?, avatar), email = COALESCE(?, email) WHERE id = ?")
    .run(data.name.trim(), slug, data.bio.trim(), data.avatar ?? null, data.email?.trim().toLowerCase() ?? null, userId);
}

export function setRole(userId: number, role: Role) {
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
}

export function deleteUser(userId: number) {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(userId);
}

export function countAdmins(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get() as { n: number }).n;
}
