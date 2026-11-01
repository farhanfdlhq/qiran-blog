import { describe, it, expect, beforeEach } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Password tes dibuat acak saat tes berjalan, tidak ada password tertulis di kode
const PW = randomBytes(12).toString("hex");

// Setiap tes memakai database baru di folder sementara
function freshDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qiran-test-"));
  process.env.DATA_DIR = dir;
  return dir;
}

describe("text", async () => {
  const { slugify, plainText, makeExcerpt, readingMinutes } = await import("@/lib/text");

  it("membuat slug dari judul berbahasa Indonesia", () => {
    expect(slugify("Kenapa PR di Akhir Pekan Sebaiknya Dihapus?")).toBe("kenapa-pr-di-akhir-pekan-sebaiknya-dihapus");
    expect(slugify("  Résumé & Café!  ")).toBe("resume-cafe");
    expect(slugify("!!!")).toBe("tulisan");
  });

  it("mengubah HTML jadi teks biasa", () => {
    expect(plainText("<p>Halo <strong>dunia</strong></p><p>Baris&nbsp;dua</p>")).toBe("Halo dunia Baris dua");
  });

  it("memotong ringkasan di batas kata", () => {
    const text = "satu dua tiga empat lima enam tujuh delapan sembilan sepuluh";
    const out = makeExcerpt(text, 20);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(21);
    expect(out).not.toMatch(/\s…$/);
  });

  it("menghitung menit baca minimal 1", () => {
    expect(readingMinutes("halo")).toBe(1);
    expect(readingMinutes(Array(450).fill("kata").join(" "))).toBe(3);
  });
});

describe("render", async () => {
  const { sanitize } = await import("@/lib/render");

  it("membuang script, event handler, dan tautan javascript", () => {
    const dirty = '<p onclick="x()">Hai<script>alert(1)</script> <a href="javascript:alert(1)">a</a> <a href="https://ok.id">b</a></p><img src="x" onerror="y()">';
    const clean = sanitize(dirty);
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(clean).toContain('href="https://ok.id"');
  });

  it("mempertahankan format editor: stabilo, kutipan, judul, gambar", () => {
    const html = '<h2>Judul</h2><p><mark>penting</mark></p><blockquote><p>kutip</p></blockquote><figure><img src="/uploads/2026/11/a.jpg" alt="a"></figure>';
    const clean = sanitize(html);
    expect(clean).toContain("<mark>penting</mark>");
    expect(clean).toContain("<blockquote>");
    expect(clean).toContain("<h2>Judul</h2>");
    expect(clean).toContain('src="/uploads/2026/11/a.jpg"');
  });

  it("HTML dari editor disaring: tautan javascript dan atribut berbahaya dibuang", () => {
    const html = '<p>Halo <mark>dunia</mark></p><p><a href="javascript:alert(1)" target="_blank">jahat</a> <a href="https://ok.id">baik</a></p><p style="color:red" data-x="1">x</p>';
    const clean = sanitize(html);
    expect(clean).toContain("<mark>dunia</mark>");
    expect(clean).not.toMatch(/javascript:|style=|data-x/i);
    expect(clean).toContain('href="https://ok.id"');
  });
});

describe("passwords", async () => {
  const { hashPassword, verifyPassword } = await import("@/lib/passwords");
  it("hash dan verifikasi password", async () => {
    const h = await hashPassword(PW);
    expect(h).not.toContain(PW);
    expect(await verifyPassword(PW, h)).toBe(true);
    expect(await verifyPassword("salah", h)).toBe(false);
    expect(await verifyPassword("x", "rusak")).toBe(false);
  });
});

describe("time", async () => {
  const { wibInputToIso, isoToWibInput, formatTanggal } = await import("@/lib/time");
  it("mengubah input waktu WIB ke UTC dan sebaliknya", () => {
    expect(wibInputToIso("2026-11-02T07:30")).toBe("2026-11-02T00:30:00.000Z");
    expect(isoToWibInput("2026-11-02T00:30:00.000Z")).toBe("2026-11-02T07:30");
    expect(wibInputToIso("bukan tanggal")).toBeNull();
  });
  it("menulis tanggal dalam bahasa Indonesia menurut WIB", () => {
    expect(formatTanggal("2026-10-31T20:00:00.000Z")).toBe("1 November 2026");
    expect(formatTanggal("2026-10-31T09:00:00.000Z", true)).toBe("31 Okt 2026");
  });
});

describe("database: tulisan, tag, jadwal, pencarian", () => {
  beforeEach(async () => {
    freshDataDir();
    const { resetDbForTests } = await import("@/lib/db");
    resetDbForTests();
  });

  async function setup() {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const a = await users.createUser({ email: "qirana@contoh.id", name: "Qirana", role: "author", password: PW });
    const b = await users.createUser({ email: "qirani@contoh.id", name: "Qirani", role: "author", password: PW });
    return { users, posts, a, b };
  }

  it("hanya tulisan terbit yang waktunya sudah lewat yang tampil", async () => {
    const { posts, a } = await setup();
    const past = new Date(Date.now() - 3600_000).toISOString();
    const future = new Date(Date.now() + 3600_000).toISOString();
    posts.savePost({ title: "Sudah terbit", authorId: a.id, status: "published", publishedAt: past, html: "<p>isi satu</p>", tags: ["Opini"] });
    posts.savePost({ title: "Terjadwal", authorId: a.id, status: "published", publishedAt: future, html: "<p>isi dua</p>", tags: [] });
    posts.savePost({ title: "Masih draf", authorId: a.id, status: "draft", html: "<p>isi tiga</p>", tags: [] });

    const list = posts.listPublished({ page: 1 });
    expect(list.items.map((p) => p.title)).toEqual(["Sudah terbit"]);
    expect(posts.getPublishedBySlug("terjadwal")).toBeNull();
    expect(posts.getPublishedBySlug("sudah-terbit")?.tags.map((t) => t.name)).toEqual(["Opini"]);
  });

  it("slug dibuat unik", async () => {
    const { posts, a } = await setup();
    const p1 = posts.savePost({ title: "Sama", authorId: a.id, status: "draft", html: "<p>a</p>", tags: [] });
    const p2 = posts.savePost({ title: "Sama", authorId: a.id, status: "draft", html: "<p>b</p>", tags: [] });
    expect(p1.slug).toBe("sama");
    expect(p2.slug).toBe("sama-2");
  });

  it("menyaring per tag dan per penulis", async () => {
    const { posts, a, b } = await setup();
    const t = new Date(Date.now() - 1000).toISOString();
    posts.savePost({ title: "A1", authorId: a.id, status: "published", publishedAt: t, html: "<p>a</p>", tags: ["Puisi"] });
    posts.savePost({ title: "B1", authorId: b.id, status: "published", publishedAt: t, html: "<p>b</p>", tags: ["Opini"] });
    expect(posts.listPublished({ page: 1, tagSlug: "puisi" }).items.map((p) => p.title)).toEqual(["A1"]);
    expect(posts.listPublished({ page: 1, authorSlug: "qirani" }).items.map((p) => p.title)).toEqual(["B1"]);
  });

  it("mencari judul dan isi, tidak termasuk draf atau terjadwal", async () => {
    const { posts, a } = await setup();
    const t = new Date(Date.now() - 1000).toISOString();
    posts.savePost({ title: "Fotosintesis seperti resep", authorId: a.id, status: "published", publishedAt: t, html: "<p>klorofil menangkap cahaya</p>", tags: [] });
    posts.savePost({ title: "Rahasia", authorId: a.id, status: "draft", html: "<p>klorofil rahasia</p>", tags: [] });
    expect(posts.search("klorofil").map((p) => p.title)).toEqual(["Fotosintesis seperti resep"]);
    expect(posts.search("resep").length).toBe(1);
    expect(posts.search('"; DROP TABLE posts; --').length).toBe(0);
  });

  it("penulis hanya boleh mengedit tulisannya sendiri, admin boleh semua", async () => {
    const { posts, users, a, b } = await setup();
    const admin = await users.createUser({ email: "admin@contoh.id", name: "Kakak", role: "admin", password: PW });
    const p = posts.savePost({ title: "Punya Qirana", authorId: a.id, status: "draft", html: "<p>x</p>", tags: [] });
    expect(posts.canEdit(a, p)).toBe(true);
    expect(posts.canEdit(b, p)).toBe(false);
    expect(posts.canEdit(admin, p)).toBe(true);
  });
});

describe("akun dan sesi", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });

  it("login benar membuat sesi, sesi bisa dicabut", async () => {
    const users = await import("@/lib/users");
    const sessions = await import("@/lib/sessions");
    await users.createUser({ email: "Qirana@Contoh.id", name: "Qirana", role: "author", password: PW });
    const u = await users.authenticate("qirana@contoh.id", PW);
    expect(u?.name).toBe("Qirana");
    expect(await users.authenticate("qirana@contoh.id", "salah")).toBeNull();

    const token = sessions.createSession(u!.id);
    expect(sessions.getSessionUser(token)?.id).toBe(u!.id);
    sessions.deleteSession(token);
    expect(sessions.getSessionUser(token)).toBeNull();
  });

  it("membatasi percobaan login", async () => {
    const { tooManyAttempts, recordFailure } = await import("@/lib/sessions");
    for (let i = 0; i < 5; i++) recordFailure("1.2.3.4");
    expect(tooManyAttempts("1.2.3.4")).toBe(true);
    expect(tooManyAttempts("5.6.7.8")).toBe(false);
  });
});

describe("komentar", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });

  it("menolak spam: honeypot, terlalu cepat, terlalu banyak tautan, kosong", async () => {
    const { checkComment } = await import("@/lib/comments");
    const now = Date.now();
    const ok = { name: "Budi", body: "Tulisannya bagus!", website: "", startedAt: now - 10_000 };
    expect(checkComment(ok, now)).toBeNull();
    expect(checkComment({ ...ok, website: "http://spam" }, now)).toBe("spam");
    expect(checkComment({ ...ok, startedAt: now - 500 }, now)).toBe("spam");
    expect(checkComment({ ...ok, body: "http://a.com http://b.com http://c.com" }, now)).toBe("spam");
    expect(checkComment({ ...ok, body: "   " }, now)).toMatch(/kosong/);
    expect(checkComment({ ...ok, name: "" }, now)).toMatch(/nama/i);
  });

  it("komentar baru menunggu persetujuan dan baru tampil setelah disetujui", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const comments = await import("@/lib/comments");
    const a = await users.createUser({ email: "a@contoh.id", name: "Qirana", role: "author", password: PW });
    const p = posts.savePost({ title: "T", authorId: a.id, status: "published", publishedAt: new Date(Date.now() - 1000).toISOString(), html: "<p>x</p>", tags: [] });
    const c = comments.addComment({ postId: p.id, name: "Budi", body: "Halo <b>kak</b>", ipHash: "h" });
    expect(comments.listApproved(p.id)).toHaveLength(0);
    comments.setStatus(c.id, "approved");
    const shown = comments.listApproved(p.id);
    expect(shown).toHaveLength(1);
    expect(shown[0].body).toBe("Halo <b>kak</b>"); // disimpan mentah, di-escape saat ditampilkan
  });
});

describe("statistik", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });

  it("satu pengunjung dihitung sekali per hari per tulisan, tanpa menyimpan IP", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const stats = await import("@/lib/stats");
    const a = await users.createUser({ email: "a@contoh.id", name: "Qirana", role: "author", password: PW });
    const p = posts.savePost({ title: "T", authorId: a.id, status: "published", publishedAt: new Date(Date.now() - 1000).toISOString(), html: "<p>x</p>", tags: [] });
    stats.recordView(p.id, "10.0.0.1", "Mozilla/5.0");
    stats.recordView(p.id, "10.0.0.1", "Mozilla/5.0");
    stats.recordView(p.id, "10.0.0.2", "Mozilla/5.0");
    stats.recordView(p.id, "10.0.0.3", "Googlebot/2.1");
    expect(stats.viewCount(p.id)).toBe(2);
    const { getDb } = await import("@/lib/db");
    const raw = JSON.stringify(getDb().prepare("select * from views").all());
    expect(raw).not.toContain("10.0.0.1");
  });
});

describe("alamat tulisan", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });

  it("alamat draf mengikuti judul, alamat tulisan terbit tidak berubah", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const a = await users.createUser({ email: "a@contoh.id", name: "Qirana", role: "author", password: PW });
    const draft = posts.savePost({ title: "Tanpa judul", authorId: a.id, status: "draft", html: "", tags: [] });
    expect(draft.slug).toBe("tanpa-judul");
    const renamed = posts.savePost({ id: draft.id, title: "Judul sebenarnya", slug: "", authorId: a.id, status: "published", html: "<p>x</p>", tags: [] });
    expect(renamed.slug).toBe("judul-sebenarnya");
    const edited = posts.savePost({ id: draft.id, title: "Judul diganti setelah terbit", slug: "", authorId: a.id, status: "published", html: "<p>x</p>", tags: [] });
    expect(edited.slug).toBe("judul-sebenarnya");
    const custom = posts.savePost({ id: draft.id, title: "x", slug: "Alamat Pilihan", authorId: a.id, status: "published", html: "<p>x</p>", tags: [] });
    expect(custom.slug).toBe("alamat-pilihan");
  });
});

describe("unggah gambar", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });

  it("menyimpan gambar dan versi kecilnya, menolak file bukan gambar", async () => {
    const sharp = (await import("sharp")).default;
    const { storeImage } = await import("@/lib/uploads");
    const { uploadsDir } = await import("@/lib/db");
    const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#9fc7b8" } }).jpeg().toBuffer();
    const url = await storeImage(big, "Foto Liburan.JPG");
    expect(url).toMatch(/^\/uploads\/\d{4}\/\d{2}\/foto-liburan-[a-f0-9]{6}\.jpg$/);
    const file = path.join(uploadsDir(), url.replace("/uploads/", ""));
    expect((await sharp(file).metadata()).width).toBe(2000);
    expect((await sharp(file.replace(".jpg", "-w720.jpg")).metadata()).width).toBe(720);
    await expect(storeImage(Buffer.from("<?php echo 1;"), "x.php")).rejects.toThrow(/bukan gambar/);
  });
});

describe("keamanan", async () => {
  const { jsonLd } = await import("@/lib/text");
  it("JSON-LD tidak bisa menutup tag script", () => {
    const out = jsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).headline).toBe("</script><script>alert(1)</script>");
  });

});

describe("tulisan: keterangan foto dan alamat khusus", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });

  it("keterangan foto disimpan sebagai teks biasa", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const a = await users.createUser({ email: "a@contoh.id", name: "Qirana", role: "author", password: PW });
    const p = posts.savePost({ title: "T", authorId: a.id, status: "draft", html: "<p>x</p>", tags: [], featureImageCaption: 'Foto: <a href="https://x.id">Budi</a><script>y()</script>' });
    expect(p.feature_image_caption).toBe("Foto: Budi");
  });

  it("judul yang bentrok dengan halaman situs diberi alamat lain", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const a = await users.createUser({ email: "a@contoh.id", name: "Qirana", role: "author", password: PW });
    expect(posts.savePost({ title: "Admin", authorId: a.id, status: "draft", html: "", tags: [] }).slug).toBe("admin-tulisan");
    expect(posts.savePost({ title: "x", slug: "cari", authorId: a.id, status: "draft", html: "", tags: [] }).slug).toBe("cari-tulisan");
  });

  it("menyimpan tanpa html mempertahankan isi lama", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const a = await users.createUser({ email: "a@contoh.id", name: "Qirana", role: "author", password: PW });
    const p = posts.savePost({ title: "T", authorId: a.id, status: "draft", html: "<p>isi lama</p>", tags: [] });
    const q = posts.savePost({ id: p.id, title: "T2", authorId: a.id, status: "draft", tags: [] });
    expect(q.content_html).toBe("<p>isi lama</p>");
  });
});

describe("aksi massal tulisan", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });

  it("penulis hanya bisa mengubah tulisannya sendiri; terbit dilewati untuk tulisan kosong", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const a = await users.createUser({ email: "a@contoh.id", name: "Qirana", role: "author", password: PW });
    const b = await users.createUser({ email: "b@contoh.id", name: "Qirani", role: "author", password: PW });
    const p1 = posts.savePost({ title: "Satu", authorId: a.id, status: "draft", html: "<p>isi</p>", tags: [] });
    const p2 = posts.savePost({ title: "Tanpa judul", authorId: a.id, status: "draft", html: "", tags: [] });
    const p3 = posts.savePost({ title: "Milik Qirani", authorId: b.id, status: "draft", html: "<p>isi</p>", tags: [] });

    expect(posts.bulkUpdate(a, [p1.id, p2.id, p3.id], "publish")).toEqual({ done: 1, skipped: 2 });
    expect(posts.getPostById(p1.id)!.status).toBe("published");
    expect(posts.getPostById(p1.id)!.published_at).toBeTruthy();
    expect(posts.getPostById(p3.id)!.status).toBe("draft");

    expect(posts.bulkUpdate(a, [p1.id], "draft")).toEqual({ done: 1, skipped: 0 });
    expect(posts.getPostById(p1.id)!.status).toBe("draft");

    expect(posts.bulkUpdate(a, [p1.id, p3.id], "delete")).toEqual({ done: 1, skipped: 1 });
    expect(posts.getPostById(p1.id)).toBeNull();
    expect(posts.getPostById(p3.id)).not.toBeNull();
  });
});
