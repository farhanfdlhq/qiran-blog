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

describe("gambar pratinjau", async () => {
  const { ogVersion, ogImagePath } = await import("@/lib/og");
  const base = { slug: "hujan", type: "post" as const, title: "Hujan", feature_image: "", published_at: "2026-10-27T09:00:00.000Z", author: null, tags: [] };

  it("versi tetap selama isi kartu sama, berubah saat judul berubah", () => {
    freshDataDir();
    expect(ogVersion(base, "qiran")).toBe(ogVersion({ ...base }, "qiran"));
    expect(ogVersion({ ...base, title: "Hujan deras" }, "qiran")).not.toBe(ogVersion(base, "qiran"));
    expect(ogImagePath(base, "qiran")).toMatch(/^\/og\/hujan\.jpg\?v=[0-9a-f]{10}$/);
  });
});

describe("PDF: identitas dan kolom tulisan", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });

  it("menyimpan identitas dan tidak membocorkannya ke data penulis publik", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const u = await users.createUser({ email: "qirani@contoh.id", name: "Qirani", role: "author", password: PW });
    users.updateIdentity(u.id, { full_name: " Qirani Azzahra ", school: "SMAN 2 Bogor", region: "Jawa Barat" });
    expect(users.getIdentity(u.id)).toEqual({ full_name: "Qirani Azzahra", school: "SMAN 2 Bogor", region: "Jawa Barat" });
    users.updateIdentity(u.id, { full_name: "x".repeat(200), school: "", region: "" });
    expect(users.getIdentity(u.id).full_name.length).toBe(80);

    const p = posts.savePost({ title: "Kemudi", html: "<p>Isi</p>", status: "published", authorId: u.id, tags: [] });
    const pub = posts.getPublishedBySlug(p.slug)!;
    for (const k of ["full_name", "school", "region"]) {
      expect(Object.keys(pub.author!)).not.toContain(k);
      expect(Object.keys(users.getUser(u.id)!)).not.toContain(k);
    }
  });

  it("savePost menyimpan kolom PDF sebagai teks polos", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const u = await users.createUser({ email: "a@contoh.id", name: "A", role: "author", password: PW });
    const p = posts.savePost({
      title: "T", html: "<p>Isi</p>", status: "draft", authorId: u.id, tags: [],
      pdfLabel: "Artikel <b>Opini</b>", pdfSubtitle: "Sub <i>judul</i>", referencesText: "Satu. https://a.id\nDua.",
    });
    expect(p.pdf_label).toBe("Artikel Opini");
    expect(p.pdf_subtitle).toBe("Sub judul");
    expect(p.references_text).toBe("Satu. https://a.id\nDua.");
    // Simpan ulang tanpa field PDF tidak menghapus isinya
    const again = posts.savePost({ id: p.id, title: "T2", html: "<p>Isi</p>", status: "draft", authorId: u.id, tags: [] });
    expect(again.pdf_label).toBe("Artikel Opini");
    expect(again.references_text).toBe("Satu. https://a.id\nDua.");
  });
});

describe("PDF: Daftar Pustaka dan nomor gambar", async () => {
  const { referencesHtml } = await import("@/lib/references");
  const { numberFigures } = await import("@/lib/figures");
  const { sanitize } = await import("@/lib/render");

  it("mengubah daftar pustaka jadi daftar aman dengan tautan dan huruf miring", () => {
    const html = referencesHtml("A. (2026). *Judul buku*. https://x.id/a?b=1&c=2.\n\n  \n<b>B</b> & C");
    expect(html.match(/<li>/g)?.length).toBe(2);
    expect(html).toContain("<em>Judul buku</em>");
    expect(html).toContain('href="https://x.id/a?b=1&amp;c=2"');
    expect(html).toContain("</a>.");
    expect(html).toContain("&lt;b&gt;B&lt;/b&gt; &amp; C");
    expect(referencesHtml("  \n\n")).toBe("");
    // Diurutkan sesuai abjad, mengabaikan bintang dan huruf besar
    const sorted = referencesHtml("World Health Organization. (2026).\n*Antara* Foto. (2021).\nbekata, E. (2026).");
    expect(sorted.indexOf("Antara")).toBeLessThan(sorted.indexOf("bekata"));
    expect(sorted.indexOf("bekata")).toBeLessThan(sorted.indexOf("World"));
    expect(referencesHtml('javascript:alert(1) "x"')).not.toContain("<a");
  });

  it("memberi nomor hanya pada gambar qiran berketerangan", () => {
    const fig = (c: string) => `<figure class="qiran-fig"><img src="/uploads/${c}.jpg" alt="" /><figcaption><span class="fig-caption">${c}</span></figcaption></figure>`;
    const ghost = '<figure class="kg-image-card"><img src="/uploads/g.jpg" /><figcaption>Foto Ghost</figcaption></figure>';
    const out = numberFigures(fig("satu") + ghost + fig("dua"));
    expect(out).toContain('<figcaption><span class="fig-num">Gambar 1.</span> <span class="fig-caption">satu');
    expect(out).toContain('<figcaption><span class="fig-num">Gambar 2.</span> <span class="fig-caption">dua');
    expect(out).toContain("<figcaption>Foto Ghost</figcaption>");
  });

  it("sanitize mempertahankan struktur gambar berketerangan tapi membuang nomor buatan", () => {
    const html = '<figure class="qiran-fig"><img src="/uploads/a.jpg" alt="x"><figcaption><span class="fig-num">Gambar 9.</span><span class="fig-caption">K</span> <span class="fig-source">S</span></figcaption></figure>';
    const out = sanitize(html);
    expect(out).toContain('<figure class="qiran-fig">');
    expect(out).toContain('<span class="fig-caption">K</span> <span class="fig-source">S</span>');
    expect(out).not.toContain("fig-num");
  });
});

describe("PDF: templat", async () => {
  const { pdfHtml, pdfFileName, pdfCacheKey } = await import("@/lib/pdf/template");
  type P = Parameters<typeof pdfHtml>[0];
  const base = (over: Partial<P> = {}): P => ({
    id: 1, type: "post", title: "Kemudi Nestapa", slug: "kemudi", excerpt: "", content_json: null,
    content_html: '<p>Isi pertama.</p><figure class="qiran-fig"><img src="https://luar.example/x.jpg" alt=""><figcaption><span class="fig-caption">Demo</span> <span class="fig-source">(Sumber: RMOL)</span></figcaption></figure>',
    plain_text: "Isi pertama.", feature_image: "", feature_image_alt: "", feature_image_caption: "", status: "draft", published_at: null,
    allow_comments: 1, author_id: 1, pdf_label: "Artikel Opini", pdf_subtitle: "Potret Sopir Angkot", references_text: "A. (2026). *Judul*. https://a.id", pdf_cover: 0, references_json: "",
    created_at: "2026-11-08T00:00:00.000Z", updated_at: "2026-11-08T00:00:00.000Z", tags: [], author: null, ...over,
  } as P);
  const id = { full_name: "Qirani Azzahra", school: "SMAN 2 Bogor", region: "Provinsi Jawa Barat" };
  const opts = { uploadsDir: "/tidak-ada" };

  it("memuat label, judul dengan subjudul, gambar bernomor, pustaka, dan identitas", () => {
    const html = pdfHtml(base(), id, "Qirani", opts);
    expect(html).toContain(">Artikel Opini<");
    expect(html).toContain("Kemudi Nestapa: Potret Sopir Angkot");
    expect(html).toContain("Gambar 1.");
    expect(html).toContain("<em>Judul</em>");
    expect(html).toContain("Disusun oleh: Qirani Azzahra, SMAN 2 Bogor, Provinsi Jawa Barat");
    expect(html).not.toContain("qiran.my.id");
  });

  it("gambar dari luar tidak diambil, dan identitas kosong tidak meninggalkan koma", () => {
    const html = pdfHtml(base(), { full_name: "", school: "", region: "" }, "Qirani", opts);
    expect(html).not.toContain("luar.example");
    expect(html).toContain("Gambar tidak tersedia di PDF");
    expect(html).toContain("Disusun oleh: Qirani</p>");
  });

  it("judul dan label di-escape", () => {
    const html = pdfHtml(base({ title: 'A <script>alert(1)</script> & "B"', pdf_label: "<b>x</b>", pdf_subtitle: "" }), id, "Q", opts);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("A &lt;script&gt;");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("label kosong memakai tag pertama", () => {
    const html = pdfHtml(base({ pdf_label: "", tags: [{ id: 1, name: "Opini", slug: "opini", description: "" }] }), id, "Q", opts);
    expect(html).toContain(">Opini<");
  });

  it("nama berkas dan kunci cache", () => {
    expect(pdfFileName("Kemudi Nestapa", "Qirani Azzahra")).toBe("Kemudi_Nestapa_Qirani_Azzahra.pdf");
    expect(pdfFileName("Apa?! Ini: tes/1", "Q")).toBe("Apa_Ini_tes_1_Q.pdf");
    expect(pdfFileName("", "")).toBe("Tulisan.pdf");
    const k1 = pdfCacheKey(base(), id, "Qirani");
    expect(pdfCacheKey(base(), id, "Qirani")).toBe(k1);
    expect(pdfCacheKey(base(), { ...id, full_name: "Qirani A." }, "Qirani")).not.toBe(k1);
    expect(pdfCacheKey(base({ content_html: "<p>Lain</p>" }), id, "Qirani")).not.toBe(k1);
  });
});

describe("PDF: Daftar Pustaka di lembar sendiri", async () => {
  const { pdfHtml } = await import("@/lib/pdf/template");
  it("pustaka berada di luar kolom isi dan dimulai di halaman baru", () => {
    const post = { id: 1, type: "post", title: "T", slug: "t", excerpt: "", content_json: null, content_html: "<p>Isi.</p>", plain_text: "Isi.",
      feature_image: "", feature_image_alt: "", feature_image_caption: "", status: "draft", published_at: null, allow_comments: 1, author_id: 1,
      pdf_label: "", pdf_subtitle: "", references_text: "Satu sumber.", pdf_cover: 0, references_json: "", created_at: "", updated_at: "", tags: [], author: null } as Parameters<typeof pdfHtml>[0];
    const html = pdfHtml(post, { full_name: "Q", school: "", region: "" }, "Q", { uploadsDir: "/x" });
    const cols = html.slice(html.indexOf('<div class="cols">'), html.indexOf("</div>", html.indexOf('<div class="cols">')));
    expect(cols).not.toContain("Daftar Pustaka");
    expect(html).toContain('<section class="refs-page">');
    expect(html).toMatch(/\.refs-page \{ break-before: page; \}/);
    // Tanpa pustaka, "Disusun oleh" tetap di akhir isi
    const tanpa = pdfHtml({ ...post, references_text: "" }, { full_name: "Q", school: "", region: "" }, "Q", { uploadsDir: "/x" });
    expect(tanpa).not.toContain("refs-page\">");
    expect(tanpa).toContain("Disusun oleh: Q");
  });
});

describe("PDF: halaman sampul", async () => {
  const { pdfCoverHtml } = await import("@/lib/pdf/template");
  it("hanya dibuat kalau diminta dan fotonya ada, dengan teks yang di-escape", () => {
    const dir = freshDataDir();
    const up = path.join(dir, "uploads", "2026");
    fs.mkdirSync(up, { recursive: true });
    fs.writeFileSync(path.join(up, "s.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    const post = { id: 1, type: "post", title: "Kemudi <b>", slug: "k", excerpt: "", content_json: null, content_html: "<p>x</p>", plain_text: "x",
      feature_image: "/uploads/2026/s.jpg", feature_image_alt: "", feature_image_caption: "Foto: Q", status: "draft", published_at: null, allow_comments: 1,
      author_id: 1, pdf_label: "Artikel Opini", pdf_subtitle: "Sub", references_text: "", pdf_cover: 1, references_json: "", created_at: "", updated_at: "", tags: [], author: null } as Parameters<typeof pdfCoverHtml>[0];
    const id = { full_name: "Qirani Azzahra", school: "SMAN 2 Bogor", region: "Jawa Barat" };
    const html = pdfCoverHtml(post, id, "Qirani", { uploadsDir: path.join(dir, "uploads") })!;
    expect(html).toContain("Kemudi &lt;b&gt;");
    expect(html).toContain("Qirani Azzahra");
    expect(html).toContain("SMAN 2 Bogor · Jawa Barat");
    expect(html).toContain("data:image/jpeg;base64,");
    expect(pdfCoverHtml({ ...post, pdf_cover: 0 }, id, "Q", { uploadsDir: path.join(dir, "uploads") })).toBeNull();
    expect(pdfCoverHtml({ ...post, feature_image: "https://luar/x.jpg" }, id, "Q", { uploadsDir: path.join(dir, "uploads") })).toBeNull();
  });
});

describe("ubah email pengguna", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });
  it("mengganti email, menolak email yang sudah dipakai, dan bisa masuk dengan email baru", async () => {
    const users = await import("@/lib/users");
    const a = await users.createUser({ email: "a@contoh.id", name: "A", role: "author", password: PW });
    await users.createUser({ email: "b@contoh.id", name: "B", role: "author", password: PW });
    users.setEmail(a.id, " Baru@Contoh.id ");
    expect(users.getUser(a.id)!.email).toBe("baru@contoh.id");
    expect(await users.authenticate("baru@contoh.id", PW)).not.toBeNull();
    expect(await users.authenticate("a@contoh.id", PW)).toBeNull();
    expect(() => users.setEmail(a.id, "B@contoh.id")).toThrow(/sudah dipakai/);
  });
});

describe("Daftar Pustaka terstruktur (APA 7)", async () => {
  const { formatSource, apaName, parseSources, sourcesToText } = await import("@/lib/references");
  it("memformat setiap jenis sumber", () => {
    expect(apaName("Agus Nugroho")).toBe("Nugroho, A.");
    expect(apaName("Rizky Aditya Mahendra")).toBe("Mahendra, R. A.");
    expect(apaName("Nugroho, A.")).toBe("Nugroho, A.");
    expect(formatSource({ id: "1", type: "berita", authors: "Agus Nugroho", year: "2026", month: "1", day: "23", title: "Ratusan sopir angkot geruduk Balai Kota Bogor", container: "RMOL", url: "https://rmol.id/a" }))
      .toBe("Nugroho, A. (2026, 23 Januari). *Ratusan sopir angkot geruduk Balai Kota Bogor*. RMOL. https://rmol.id/a");
    expect(formatSource({ id: "2", type: "web", authors: "World Health Organization", corporate: true, year: "2026", month: "9", day: "15", title: "Mental health at work", container: "World Health Organization", url: "https://who.int/x" }))
      .toBe("World Health Organization. (2026, 15 September). *Mental health at work*. https://who.int/x");
    expect(formatSource({ id: "3", type: "web", authors: "U.S. Food and Drug Administration", corporate: true, title: "Keep your air clear", url: "https://fda.gov/x", accessed: "2026-11-08" }))
      .toBe("U.S. Food and Drug Administration. (t.t.). *Keep your air clear*. Diakses 8 November 2026, dari https://fda.gov/x");
    expect(formatSource({ id: "4", type: "buku", authors: "Andrea Hirata", year: "2005", title: "Laskar pelangi", container: "Bentang Pustaka" }))
      .toBe("Hirata, A. (2005). *Laskar pelangi*. Bentang Pustaka.");
    expect(formatSource({ id: "5", type: "jurnal", authors: "Budi Santoso\nCitra Lestari", year: "2024", title: "Polusi udara kota", container: "Jurnal Kesehatan", volume: "12", issue: "3", pages: "45–67", url: "https://doi.org/10.1/x" }))
      .toBe("Santoso, B., & Lestari, C. (2024). Polusi udara kota. *Jurnal Kesehatan*, *12*(3), 45–67. https://doi.org/10.1/x");
    expect(formatSource({ id: "6", type: "foto", authors: "ANTARA Foto", corporate: true, year: "2021", month: "11", day: "2", title: "Uji coba Biskita", url: "https://a.com/x" }))
      .toBe("ANTARA Foto. (2021, 2 November). *Uji coba Biskita* [Foto]. https://a.com/x");
    expect(formatSource({ id: "7", type: "manual", text: "Bebas *miring*." })).toBe("Bebas miring.");
  });
  it("membaca JSON dengan aman dan menghasilkan teks", () => {
    const list = parseSources(JSON.stringify([{ id: "a", type: "aneh", text: "X" }, { type: "berita", title: "T", year: "2026" }, 5, null]));
    expect(list.map((s) => s.type)).toEqual(["manual", "berita"]);
    expect(parseSources("bukan json")).toEqual([]);
    expect(sourcesToText(list)).toBe("X\n*T*. (2026).");
    expect(formatSource({ id: "n", type: "berita", title: "Tanpa penulis", year: "2026", month: "2", container: "RRI", url: "https://rri.co.id/x" })).toBe("*Tanpa penulis*. (2026, Februari). RRI. https://rri.co.id/x");
  });
});

describe("Daftar Pustaka tersimpan dari sumber terstruktur", () => {
  beforeEach(async () => {
    freshDataDir();
    (await import("@/lib/db")).resetDbForTests();
  });
  it("menyimpan JSON dan menghasilkan teks terformat, teks lama tetap bisa dibaca", async () => {
    const users = await import("@/lib/users");
    const posts = await import("@/lib/posts");
    const { textToSources } = await import("@/lib/references");
    const u = await users.createUser({ email: "a@contoh.id", name: "A", role: "author", password: PW });
    const json = JSON.stringify([{ id: "x", type: "berita", authors: "Agus Nugroho", year: "2026", month: "1", day: "23", title: "Judul", container: "RMOL", url: "https://rmol.id/a" }]);
    const p = posts.savePost({ title: "T", html: "<p>x</p>", status: "draft", authorId: u.id, tags: [], referencesJson: json });
    expect(p.references_text).toBe("Nugroho, A. (2026, 23 Januari). *Judul*. RMOL. https://rmol.id/a");
    expect(JSON.parse(p.references_json)[0].title).toBe("Judul");
    const again = posts.savePost({ id: p.id, title: "T", html: "<p>x</p>", status: "draft", authorId: u.id, tags: [] });
    expect(again.references_json).toBe(p.references_json);
    expect(textToSources("Satu.\n\nDua.").map((s) => s.text)).toEqual(["Dua.", "Satu."]);
  });
});

describe("PDF: kutipan pembuka", async () => {
  const { pdfHtml } = await import("@/lib/pdf/template");
  it("kutipan di awal tulisan dan paragraf sesudahnya keluar dari kolom", () => {
    const post = { id: 1, type: "post", title: "T", slug: "t", excerpt: "", content_json: null, plain_text: "x",
      content_html: "<blockquote><p>“Tanya?”</p></blockquote><p>Pengantar.</p><p>Isi.</p><blockquote><p>Kutipan tengah</p></blockquote>",
      feature_image: "", feature_image_alt: "", feature_image_caption: "", status: "draft", published_at: null, allow_comments: 1, author_id: 1,
      pdf_label: "", pdf_subtitle: "", references_text: "", references_json: "", pdf_cover: 0, created_at: "", updated_at: "", tags: [], author: null } as Parameters<typeof pdfHtml>[0];
    const html = pdfHtml(post, { full_name: "", school: "", region: "" }, "Q", { uploadsDir: "/x" });
    const cols = html.slice(html.indexOf('<div class="cols">'));
    expect(html).toContain('<div class="opener"><blockquote><p>“Tanya?”</p></blockquote><p class="lead">Pengantar.</p></div>');
    expect(cols).not.toContain("Tanya?");
    expect(cols).toContain("Kutipan tengah");
  });
});
