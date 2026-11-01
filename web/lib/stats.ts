/** Statistik pembaca tanpa cookie: pengunjung dikenali dengan hash harian yang tidak bisa dibalik. */
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";
import { getSetting, setSetting } from "./settings";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless|lighthouse/i;

function today(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10); // tanggal WIB
}

function salt(): string {
  let s = getSetting("stats_salt");
  if (!s) {
    s = randomBytes(16).toString("hex");
    setSetting("stats_salt", s);
  }
  return s;
}

export function hashVisitor(ip: string, ua: string, day = today()): string {
  return createHash("sha256").update(`${salt()}|${day}|${ip}|${ua}`).digest("hex").slice(0, 24);
}

export function recordView(postId: number, ip: string, ua: string) {
  if (!ua || BOT.test(ua)) return;
  const day = today();
  getDb().prepare("INSERT OR IGNORE INTO views (post_id, day, visitor) VALUES (?, ?, ?)").run(postId, day, hashVisitor(ip, ua, day));
}

export function viewCount(postId: number): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM views WHERE post_id = ?").get(postId) as { n: number }).n;
}

export function dailyViews(days = 30, authorId?: number) {
  const since = new Date(Date.now() + 7 * 3600_000 - days * 86400_000).toISOString().slice(0, 10);
  const where = authorId ? "AND p.author_id = @author" : "";
  return getDb()
    .prepare(`SELECT v.day, COUNT(*) AS n FROM views v JOIN posts p ON p.id = v.post_id WHERE v.day >= @since ${where} GROUP BY v.day ORDER BY v.day`)
    .all({ since, author: authorId }) as { day: string; n: number }[];
}

export function topPosts(limit = 10, authorId?: number) {
  const where = authorId ? "WHERE p.author_id = @author" : "";
  return getDb()
    .prepare(`SELECT p.id, p.title, p.slug, COUNT(v.visitor) AS n FROM posts p LEFT JOIN views v ON v.post_id = p.id ${where}
              GROUP BY p.id HAVING n > 0 ORDER BY n DESC LIMIT ${limit}`)
    .all({ author: authorId }) as { id: number; title: string; slug: string; n: number }[];
}

export function ipHash(ip: string): string {
  return createHash("sha256").update(`${salt()}|ip|${ip}`).digest("hex").slice(0, 24);
}
