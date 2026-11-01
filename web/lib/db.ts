/** Koneksi SQLite dan migrasi skema. Satu file database di DATA_DIR. */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { plainText } from "./text";

type DB = Database.Database;
const g = globalThis as unknown as { __qiranDb?: DB; __qiranDbPath?: string };

export function dataDir(): string {
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function uploadsDir(): string {
  const dir = path.join(dataDir(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDb(): DB {
  const file = path.join(dataDir(), "qiran.sqlite");
  if (g.__qiranDb && g.__qiranDbPath === file) return g.__qiranDb;
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  g.__qiranDb = db;
  g.__qiranDbPath = file;
  return db;
}

/** Dipakai tes: tutup koneksi agar DATA_DIR baru terbaca. */
export function resetDbForTests() {
  g.__qiranDb?.close();
  g.__qiranDb = undefined;
  g.__qiranDbPath = undefined;
}

type Migration = string | ((db: DB) => void);

const MIGRATIONS: Migration[] = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin','author')),
    bio TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE login_attempts (key TEXT NOT NULL, at INTEGER NOT NULL);
  CREATE INDEX idx_attempts ON login_attempts(key, at);

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'post' CHECK (type IN ('post','page')),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL DEFAULT '',
    content_json TEXT,
    content_html TEXT NOT NULL DEFAULT '',
    plain_text TEXT NOT NULL DEFAULT '',
    feature_image TEXT NOT NULL DEFAULT '',
    feature_image_alt TEXT NOT NULL DEFAULT '',
    feature_image_caption TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    published_at TEXT,
    allow_comments INTEGER NOT NULL DEFAULT 1,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_posts_pub ON posts(type, status, published_at);

  CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE post_tags (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, tag_id)
  );

  CREATE TABLE comments (
    id INTEGER PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','spam')),
    ip_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_comments_post ON comments(post_id, status);

  CREATE TABLE views (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    visitor TEXT NOT NULL,
    PRIMARY KEY (post_id, day, visitor)
  );

  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  CREATE VIRTUAL TABLE posts_fts USING fts5(title, plain_text, content='posts', content_rowid='id', tokenize='unicode61 remove_diacritics 2');
  CREATE TRIGGER posts_ai AFTER INSERT ON posts BEGIN
    INSERT INTO posts_fts(rowid, title, plain_text) VALUES (new.id, new.title, new.plain_text);
  END;
  CREATE TRIGGER posts_ad AFTER DELETE ON posts BEGIN
    INSERT INTO posts_fts(posts_fts, rowid, title, plain_text) VALUES ('delete', old.id, old.title, old.plain_text);
  END;
  CREATE TRIGGER posts_au AFTER UPDATE ON posts BEGIN
    INSERT INTO posts_fts(posts_fts, rowid, title, plain_text) VALUES ('delete', old.id, old.title, old.plain_text);
    INSERT INTO posts_fts(rowid, title, plain_text) VALUES (new.id, new.title, new.plain_text);
  END;
  `,
  // v2: keterangan foto jadi teks biasa (sebelumnya boleh berisi tautan HTML)
  (db) => {
    const rows = db.prepare("SELECT id, feature_image_caption AS c FROM posts WHERE feature_image_caption LIKE '%<%'").all() as { id: number; c: string }[];
    const upd = db.prepare("UPDATE posts SET feature_image_caption = ? WHERE id = ?");
    for (const r of rows) upd.run(plainText(r.c), r.id);
  },
];

function migrate(db: DB) {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      const m = MIGRATIONS[v];
      if (typeof m === "string") db.exec(m);
      else m(db);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}
