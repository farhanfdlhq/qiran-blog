/** Komentar pembaca dengan moderasi. */
import { getDb } from "./db";
import { nowIso } from "./time";

export type CommentStatus = "pending" | "approved" | "spam";
export type Comment = { id: number; post_id: number; name: string; body: string; status: CommentStatus; created_at: string };

const MIN_FILL_MS = 3000;

/** Mengembalikan null kalau aman, "spam" kalau terdeteksi spam, atau pesan kesalahan untuk pembaca. */
export function checkComment(input: { name: string; body: string; website?: string; startedAt?: number }, now = Date.now()): string | null {
  if (input.website) return "spam"; // honeypot: kolom tersembunyi, hanya diisi bot
  if (!input.startedAt || now - input.startedAt < MIN_FILL_MS) return "spam";
  const name = input.name.trim();
  const body = input.body.trim();
  if (!name) return "Nama wajib diisi.";
  if (name.length > 60) return "Nama terlalu panjang.";
  if (!body) return "Komentar masih kosong.";
  if (body.length > 2000) return "Komentar maksimal 2000 karakter.";
  if ((body.match(/https?:\/\//gi) ?? []).length > 2) return "spam";
  return null;
}

export function addComment(input: { postId: number; name: string; body: string; ipHash: string }): Comment {
  const db = getDb();
  const info = db.prepare("INSERT INTO comments (post_id, name, body, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(input.postId, input.name.trim().slice(0, 60), input.body.trim().slice(0, 2000), input.ipHash, nowIso());
  return db.prepare("SELECT id, post_id, name, body, status, created_at FROM comments WHERE id = ?").get(info.lastInsertRowid) as Comment;
}

export function recentCommentsFrom(ipHash: string, minutes = 10): number {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  return (getDb().prepare("SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at >= ?").get(ipHash, since) as { n: number }).n;
}

export function listApproved(postId: number): Comment[] {
  return getDb().prepare("SELECT id, post_id, name, body, status, created_at FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at").all(postId) as Comment[];
}

export function setStatus(id: number, status: CommentStatus) {
  getDb().prepare("UPDATE comments SET status = ? WHERE id = ?").run(status, id);
}

export function deleteComment(id: number) {
  getDb().prepare("DELETE FROM comments WHERE id = ?").run(id);
}

export function getComment(id: number): (Comment & { author_id: number | null }) | null {
  return (getDb().prepare("SELECT c.id, c.post_id, c.name, c.body, c.status, c.created_at, p.author_id FROM comments c JOIN posts p ON p.id = c.post_id WHERE c.id = ?").get(id) as Comment & { author_id: number | null }) ?? null;
}

export function listForModeration(user: { id: number; role: string }, status: CommentStatus) {
  const where = user.role === "admin" ? "" : "AND p.author_id = @uid";
  return getDb()
    .prepare(`SELECT c.id, c.post_id, c.name, c.body, c.status, c.created_at, p.title AS post_title, p.slug AS post_slug
              FROM comments c JOIN posts p ON p.id = c.post_id WHERE c.status = @status ${where} ORDER BY c.created_at DESC LIMIT 200`)
    .all({ status, uid: user.id }) as (Comment & { post_title: string; post_slug: string })[];
}

export function countPending(user: { id: number; role: string }): number {
  const where = user.role === "admin" ? "" : "AND p.author_id = @uid";
  return (getDb().prepare(`SELECT COUNT(*) AS n FROM comments c JOIN posts p ON p.id = c.post_id WHERE c.status = 'pending' ${where}`).get({ uid: user.id }) as { n: number }).n;
}
