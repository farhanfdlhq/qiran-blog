/** Tulisan dan halaman: simpan, ambil, daftar, cari. */
import { getDb } from "./db";
import { slugify, plainText, makeExcerpt } from "./text";
import { sanitize } from "./render";
import { nowIso } from "./time";
import type { User } from "./users";

export const PER_PAGE = 30;

export type Tag = { id: number; name: string; slug: string; description: string };
export type Author = { id: number; name: string; slug: string; avatar: string; bio: string };
export type Post = {
  id: number;
  type: "post" | "page";
  title: string;
  slug: string;
  excerpt: string;
  content_json: string | null;
  content_html: string;
  plain_text: string;
  feature_image: string;
  feature_image_alt: string;
  feature_image_caption: string;
  status: "draft" | "published";
  published_at: string | null;
  allow_comments: number;
  author_id: number | null;
  pdf_label: string;
  pdf_subtitle: string;
  references_text: string;
  pdf_cover: number;
  created_at: string;
  updated_at: string;
};
export type PostFull = Post & { tags: Tag[]; author: Author | null };

const VISIBLE = "p.status = 'published' AND p.published_at IS NOT NULL AND p.published_at <= @now";

function hydrate(rows: Post[]): PostFull[] {
  if (!rows.length) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => "?").join(",");
  const tagRows = db
    .prepare(`SELECT pt.post_id, t.id, t.name, t.slug, t.description FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id IN (${marks}) ORDER BY pt.position`)
    .all(...ids) as (Tag & { post_id: number })[];
  const authorIds = [...new Set(rows.map((r) => r.author_id).filter((x): x is number => x != null))];
  const authors = authorIds.length
    ? (db.prepare(`SELECT id, name, slug, avatar, bio FROM users WHERE id IN (${authorIds.map(() => "?").join(",")})`).all(...authorIds) as Author[])
    : [];
  return rows.map((r) => ({
    ...r,
    tags: tagRows.filter((t) => t.post_id === r.id).map(({ post_id: _, ...t }) => t),
    author: authors.find((a) => a.id === r.author_id) ?? null,
  }));
}

/** Teks satu baris tanpa HTML, untuk label dan subjudul PDF. */
function oneLine(v: string, max: number): string {
  return plainText(sanitize(String(v))).replace(/\s+/g, " ").trim().slice(0, max);
}

function existingHtml(id?: number): string {
  if (!id) return "";
  const row = getDb().prepare("SELECT content_html FROM posts WHERE id = ?").get(id) as { content_html: string } | undefined;
  return row?.content_html ?? "";
}

/** Alamat yang dipakai halaman lain di situs, tidak boleh dipakai tulisan */
export const RESERVED_SLUGS = new Set(["admin", "api", "cari", "tag", "author", "page", "uploads", "rss", "sitemap", "robots", "assets", "favicon", "manifest", "logo", "og"]);

function uniqueSlug(base: string, ignoreId?: number): string {
  const db = getDb();
  if (RESERVED_SLUGS.has(base)) base = `${base}-tulisan`;
  let slug = base, i = 2;
  while (db.prepare("SELECT 1 FROM posts WHERE slug = ? AND id IS NOT ?").get(slug, ignoreId ?? null)) slug = `${base}-${i++}`;
  return slug;
}

export function upsertTag(name: string): Tag {
  const db = getDb();
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
  const existing = db.prepare("SELECT * FROM tags WHERE name = ?").get(clean) as Tag | undefined;
  if (existing) return existing;
  let slug = slugify(clean), i = 2;
  const base = slug;
  while (db.prepare("SELECT 1 FROM tags WHERE slug = ?").get(slug)) slug = `${base}-${i++}`;
  const info = db.prepare("INSERT INTO tags (name, slug) VALUES (?, ?)").run(clean, slug);
  return db.prepare("SELECT * FROM tags WHERE id = ?").get(info.lastInsertRowid) as Tag;
}

export type SaveInput = {
  id?: number;
  type?: "post" | "page";
  title: string;
  slug?: string;
  excerpt?: string;
  html?: string;
  featureImage?: string;
  featureImageAlt?: string;
  featureImageCaption?: string;
  status: "draft" | "published";
  publishedAt?: string | null;
  allowComments?: boolean;
  authorId: number;
  tags: string[];
  pdfLabel?: string;
  pdfSubtitle?: string;
  referencesText?: string;
  pdfCover?: boolean;
};

export function savePost(input: SaveInput): Post {
  const db = getDb();
  const title = input.title.trim() || "Tanpa judul";
  const html = sanitize(input.html ?? existingHtml(input.id));
  const text = plainText(html);
  const existing = input.id ? getPostById(input.id) : null;
  // Alamat draf mengikuti judul sampai penulis mengisinya sendiri atau tulisan pernah terbit
  const slugBase = input.slug?.trim() || (existing?.published_at ? existing.slug : title);
  const slug = uniqueSlug(slugify(slugBase), input.id);
  let publishedAt = input.publishedAt ?? existing?.published_at ?? null;
  if (input.status === "published" && !publishedAt) publishedAt = nowIso();
  const now = nowIso();

  const row = {
    type: input.type ?? existing?.type ?? "post",
    title,
    slug,
    excerpt: (input.excerpt ?? "").trim().slice(0, 300),
    content_json: null,
    content_html: html,
    plain_text: text,
    feature_image: input.featureImage ?? existing?.feature_image ?? "",
    feature_image_alt: (input.featureImageAlt ?? existing?.feature_image_alt ?? "").slice(0, 200),
    feature_image_caption: plainText(sanitize(input.featureImageCaption ?? existing?.feature_image_caption ?? "")).slice(0, 300),
    status: input.status,
    published_at: publishedAt,
    allow_comments: input.allowComments === false ? 0 : 1,
    author_id: existing?.author_id ?? input.authorId,
    pdf_label: oneLine(input.pdfLabel ?? existing?.pdf_label ?? "", 40),
    pdf_subtitle: oneLine(input.pdfSubtitle ?? existing?.pdf_subtitle ?? "", 160),
    pdf_cover: input.pdfCover == null ? (existing?.pdf_cover ?? 0) : input.pdfCover ? 1 : 0,
    references_text: (input.referencesText ?? existing?.references_text ?? "").replace(/\r\n?/g, "\n").slice(0, 20000),
    updated_at: now,
  };

  const id = db.transaction(() => {
    let postId: number;
    if (existing) {
      db.prepare(`UPDATE posts SET type=@type, title=@title, slug=@slug, excerpt=@excerpt, content_json=@content_json, content_html=@content_html,
        plain_text=@plain_text, feature_image=@feature_image, feature_image_alt=@feature_image_alt, feature_image_caption=@feature_image_caption,
        status=@status, published_at=@published_at, allow_comments=@allow_comments, pdf_label=@pdf_label, pdf_subtitle=@pdf_subtitle,
        references_text=@references_text, pdf_cover=@pdf_cover, updated_at=@updated_at WHERE id=@id`).run({ ...row, id: existing.id });
      postId = existing.id;
    } else {
      const info = db.prepare(`INSERT INTO posts (type, title, slug, excerpt, content_json, content_html, plain_text, feature_image, feature_image_alt,
        feature_image_caption, status, published_at, allow_comments, author_id, pdf_label, pdf_subtitle, references_text, pdf_cover, created_at, updated_at)
        VALUES (@type, @title, @slug, @excerpt, @content_json, @content_html, @plain_text, @feature_image, @feature_image_alt,
        @feature_image_caption, @status, @published_at, @allow_comments, @author_id, @pdf_label, @pdf_subtitle, @references_text, @pdf_cover, @created_at, @updated_at)`).run({ ...row, created_at: now });
      postId = Number(info.lastInsertRowid);
    }
    db.prepare("DELETE FROM post_tags WHERE post_id = ?").run(postId);
    const seen = new Set<number>();
    input.tags.map((t) => t.trim()).filter(Boolean).slice(0, 8).forEach((name, i) => {
      const tag = upsertTag(name);
      if (seen.has(tag.id)) return;
      seen.add(tag.id);
      db.prepare("INSERT INTO post_tags (post_id, tag_id, position) VALUES (?, ?, ?)").run(postId, tag.id, i);
    });
    return postId;
  })();
  return getPostById(id)!;
}

export function getPostById(id: number): Post | null {
  return (getDb().prepare("SELECT * FROM posts WHERE id = ?").get(id) as Post) ?? null;
}

export function getFullById(id: number): PostFull | null {
  const p = getPostById(id);
  return p ? hydrate([p])[0] : null;
}

export function deletePost(id: number) {
  getDb().prepare("DELETE FROM posts WHERE id = ?").run(id);
}

export function canEdit(user: Pick<User, "id" | "role">, post: Pick<Post, "author_id" | "type">): boolean {
  if (user.role === "admin") return true;
  if (post.type === "page") return true; // halaman seperti Tentang boleh diedit semua penulis
  return post.author_id === user.id;
}

export function getPublishedBySlug(slug: string, type?: "post" | "page"): PostFull | null {
  const row = getDb()
    .prepare(`SELECT p.* FROM posts p WHERE p.slug = @slug AND ${VISIBLE} ${type ? "AND p.type = @type" : ""}`)
    .get({ slug, now: nowIso(), type }) as Post | undefined;
  return row ? hydrate([row])[0] : null;
}

export function getAnyBySlug(slug: string): PostFull | null {
  const row = getDb().prepare("SELECT * FROM posts WHERE slug = ?").get(slug) as Post | undefined;
  return row ? hydrate([row])[0] : null;
}

export function listPublished(opts: { page: number; tagSlug?: string; authorSlug?: string; perPage?: number; excludeId?: number }) {
  const db = getDb();
  const perPage = opts.perPage ?? PER_PAGE;
  const where = [VISIBLE, "p.type = 'post'"];
  const params: Record<string, unknown> = { now: nowIso() };
  if (opts.tagSlug) {
    where.push("EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.slug = @tag)");
    params.tag = opts.tagSlug;
  }
  if (opts.authorSlug) {
    where.push("p.author_id = (SELECT id FROM users WHERE slug = @author)");
    params.author = opts.authorSlug;
  }
  if (opts.excludeId) {
    where.push("p.id != @exclude");
    params.exclude = opts.excludeId;
  }
  const sqlWhere = where.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM posts p WHERE ${sqlWhere}`).get(params) as { n: number }).n;
  const page = Math.max(1, opts.page);
  const rows = db
    .prepare(`SELECT p.* FROM posts p WHERE ${sqlWhere} ORDER BY p.published_at DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`)
    .all(params) as Post[];
  return { items: hydrate(rows), total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function listAllPublishedForFeeds(): PostFull[] {
  const rows = getDb().prepare(`SELECT p.* FROM posts p WHERE ${VISIBLE} ORDER BY p.published_at DESC`).all({ now: nowIso() }) as Post[];
  return hydrate(rows);
}

export function search(query: string, limit = 30): PostFull[] {
  const terms = query
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .match(/[a-z0-9]{2,}/g);
  if (!terms?.length) return [];
  // Setiap kata jadi awalan yang harus ada; tanda kutip mencegah sintaks FTS disalahgunakan
  const match = terms.slice(0, 8).map((t) => `"${t}"*`).join(" ");
  const rows = getDb()
    .prepare(`SELECT p.* FROM posts_fts f JOIN posts p ON p.id = f.rowid WHERE posts_fts MATCH @match AND ${VISIBLE} AND p.type = 'post'
              ORDER BY bm25(posts_fts, 5.0, 1.0) LIMIT ${limit}`)
    .all({ match, now: nowIso() }) as Post[];
  return hydrate(rows);
}

export function listForAdmin(user: Pick<User, "id" | "role">, filter: "semua" | "draft" | "terbit" | "terjadwal" = "semua"): (PostFull & { views: number; pending_comments: number })[] {
  const db = getDb();
  const where = ["p.type = 'post'"];
  const params: Record<string, unknown> = { now: nowIso(), uid: user.id };
  if (user.role !== "admin") where.push("p.author_id = @uid");
  if (filter === "draft") where.push("p.status = 'draft'");
  if (filter === "terbit") where.push(VISIBLE);
  if (filter === "terjadwal") where.push("p.status = 'published' AND p.published_at > @now");
  const rows = db
    .prepare(`SELECT p.*, (SELECT COUNT(*) FROM views v WHERE v.post_id = p.id) AS views,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'pending') AS pending_comments
              FROM posts p WHERE ${where.join(" AND ")} ORDER BY COALESCE(p.published_at, p.updated_at) DESC`)
    .all(params) as (Post & { views: number; pending_comments: number })[];
  const full = hydrate(rows);
  return full.map((p, i) => ({ ...p, views: rows[i].views, pending_comments: rows[i].pending_comments }));
}

export function listTags(): (Tag & { count: number })[] {
  return getDb()
    .prepare(`SELECT t.*, (SELECT COUNT(*) FROM post_tags pt JOIN posts p ON p.id = pt.post_id WHERE pt.tag_id = t.id AND ${VISIBLE}) AS count
              FROM tags t ORDER BY t.name COLLATE NOCASE`)
    .all({ now: nowIso() }) as (Tag & { count: number })[];
}

export function getTagBySlug(slug: string): Tag | null {
  return (getDb().prepare("SELECT * FROM tags WHERE slug = ?").get(slug) as Tag) ?? null;
}

export function updateTag(id: number, data: { name: string; description: string }) {
  getDb().prepare("UPDATE tags SET name = ?, description = ? WHERE id = ?").run(data.name.trim().slice(0, 40), data.description.trim().slice(0, 300), id);
}

export function deleteTag(id: number) {
  getDb().prepare("DELETE FROM tags WHERE id = ?").run(id);
}

export function excerptOf(p: Pick<Post, "excerpt" | "plain_text">, max = 180): string {
  return p.excerpt || makeExcerpt(p.plain_text, max);
}

export function isScheduled(p: Pick<Post, "status" | "published_at">): boolean {
  return p.status === "published" && !!p.published_at && p.published_at > nowIso();
}

/** Hapus draf kosong ("Tanpa judul", tanpa isi dan gambar) milik penulis yang ditinggal lebih dari 1 jam. */
export function cleanupEmptyDrafts(userId: number) {
  const before = new Date(Date.now() - 3600_000).toISOString();
  getDb().prepare(`DELETE FROM posts WHERE author_id = ? AND type = 'post' AND status = 'draft' AND title = 'Tanpa judul'
    AND plain_text = '' AND feature_image = '' AND updated_at < ?`).run(userId, before);
}

export type BulkAction = "publish" | "draft" | "delete";

/**
 * Ubah banyak tulisan sekaligus. Hanya tulisan yang boleh diedit pengguna ini yang diproses.
 * Menerbitkan dilewati untuk tulisan tanpa judul atau tanpa isi.
 */
export function bulkUpdate(user: Pick<User, "id" | "role">, ids: number[], action: BulkAction): { done: number; skipped: number } {
  const db = getDb();
  let done = 0, skipped = 0;
  const unique = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  db.transaction(() => {
    for (const id of unique) {
      const p = getPostById(id);
      if (!p || p.type !== "post" || !canEdit(user, p)) { skipped++; continue; }
      if (action === "delete") {
        db.prepare("DELETE FROM posts WHERE id = ?").run(id);
      } else if (action === "draft") {
        db.prepare("UPDATE posts SET status = 'draft', updated_at = ? WHERE id = ?").run(nowIso(), id);
      } else {
        const empty = !p.plain_text.trim() && !/<img/i.test(p.content_html);
        if (empty || p.title.trim() === "" || p.title === "Tanpa judul") { skipped++; continue; }
        db.prepare("UPDATE posts SET status = 'published', published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), id);
      }
      done++;
    }
  })();
  return { done, skipped };
}
