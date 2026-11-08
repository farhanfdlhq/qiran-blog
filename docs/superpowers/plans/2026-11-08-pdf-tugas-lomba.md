# PDF Tugas dan Lomba: Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Penulis bisa mengunduh tulisannya dari panel sebagai PDF A4 dua kolom (Times New Roman, spasi 1,5) yang siap dikirim ke guru atau panitia lomba.

**Architecture:** Templat HTML khusus cetak dibuat dari data tulisan dan identitas penulis. Chromium tanpa layar (playwright-core) mengubahnya jadi PDF dengan `setContent`, dan semua jaringan diblokir. Hasilnya di-cache di `DATA_DIR/cache/pdf`. Rute panel `/admin/pdf/<id>/` hanya untuk penulis yang boleh mengedit tulisan itu.

**Tech Stack:** Next.js 16 route handler, better-sqlite3, sanitize-html, Tiptap 3, playwright-core, vitest, Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-11-08-pdf-tugas-lomba-design.md`. Bagian "Revisi setelah tinjauan" dan "5 (baru)" berlaku di atas bagian lain.

## Global Constraints

- Kertas dan margin: A4; margin 4 cm kiri, 4 cm atas, 3 cm kanan, 3 cm bawah; bingkai 0,5 pt `#161c1a` sekitar 0,8 cm dari tepi.
- Huruf: `font-family: "Times New Roman", "Liberation Serif", serif`, 12 pt, `line-height: 1.725`.
- Kolom: dua kolom, jarak 1,27 cm, `text-align: justify`, indentasi baris pertama 1,27 cm, `lang="id"`, `hyphens: auto`.
- Warna hanya dari palet qiran mode terang: tinta `#161c1a`, muted `#4d5550`, aksen `#9fc7b8`, permukaan `#d6d5cc`. Kertas putih.
- Tidak ada nama atau logo qiran di PDF.
- Identitas (`full_name`, `school`, `region`) tidak boleh keluar di halaman publik, RSS, sitemap, OG, atau tipe `Author`.
- Hanya `type = "post"` yang punya PDF. Identitas yang dicetak milik penulis tulisan, bukan milik pengunduh.
- Batasan render: satu render dalam satu waktu, antrean maksimal 3, batas waktu 45 detik, rate limit 10 PDF per 10 menit per akun.
- Nama berkas `Judul_Nama_Lengkap.pdf`.
- Teks antarmuka berbahasa Indonesia, mengikuti gaya panel yang ada.

## Review Focus

1. **Tulisan hasil impor Ghost** berisi `<figure class="kg-image-card">` dan gambar dari URL luar. Tidak boleh diberi nomor, dan di PDF diganti kotak "Gambar tidak tersedia di PDF", bukan diunduh. (Task 2, Task 4)
2. **Judul, keterangan, dan sumber pustaka berisi `<`, `&`, atau tanda kutip.** Harus ter-escape di templat PDF dan situs, tanpa HTML injeksi. (Task 2, Task 4)
3. **Penulis tanpa identitas.** PDF memakai nama tampilan dan tidak mencetak "· ," kosong. (Task 4)
4. **Chromium tidak terpasang di server.** Rute menjawab 503 dengan pesan pemasangan, bukan 500 atau macet. (Task 4)
5. **Dua kali klik "Unduh PDF" atau dua penulis bersamaan.** Antrean melayani keduanya tanpa membuka dua Chromium sekaligus. (Task 4)

---

### Task 1: Kolom baru dan identitas di Akun saya

**Files:**
- Modify: `web/lib/db.ts` (migrasi baru di `MIGRATIONS`)
- Modify: `web/lib/users.ts` (tipe `Identity`, `getIdentity`, `updateIdentity`)
- Modify: `web/app/actions/admin.ts` (`saveIdentity`)
- Modify: `web/app/admin/(panel)/akun/page.tsx` (bagian "Identitas untuk tugas dan lomba")
- Test: `web/tests/core.test.ts`

**Interfaces:**
- Produces:
  - `type Identity = { full_name: string; school: string; region: string }`
  - `getIdentity(userId: number): Identity`
  - `updateIdentity(userId: number, data: Identity): void`, yang memangkas spasi dan membatasi panjang ke 80/80/60
  - kolom `posts.pdf_label`, `posts.pdf_subtitle`, `posts.references_text` (TEXT NOT NULL DEFAULT '')

- [ ] Tes `menyimpan identitas dan tidak membocorkannya ke data penulis publik`:
  - `updateIdentity(id, {full_name: " Qirani Azzahra ", school: "SMAN 2 Bogor", region: "Jawa Barat"})`
  - lalu `getIdentity(id).full_name === "Qirani Azzahra"`
  - dan `Object.keys(getPublishedBySlug(slug)!.author!)` tidak memuat `full_name`, `school`, atau `region`.
- [ ] Jalankan `npx vitest run`, harus FAIL.
- [ ] Tambah migrasi: `ALTER TABLE users ADD COLUMN full_name/school/region` dan `ALTER TABLE posts ADD COLUMN pdf_label/pdf_subtitle/references_text`. Lalu implementasikan `getIdentity` dan `updateIdentity`.
- [ ] Buat `saveIdentity(prev, form): Promise<FormState>` dengan pesan "Identitas tersimpan.". Tambah bagian form di Akun saya: tiga field dengan label "Nama lengkap", "Sekolah", "Provinsi atau kota", dan petunjuk "Hanya dicetak di PDF yang kamu unduh. Tidak tampil di situs."
- [ ] Jalankan `npx vitest run`, harus PASS. Lalu commit.

### Task 2: Daftar Pustaka dan nomor gambar (render)

**Files:**
- Create: `web/lib/references.ts`
- Create: `web/lib/figures.ts`
- Modify: `web/lib/render.ts` (izinkan `figure.qiran-fig`, `figcaption` dengan `span.fig-caption`, `span.fig-source`, `span.fig-num`)
- Modify: `web/app/(site)/[slug]/page.tsx` (isi bernomor dan bagian Daftar Pustaka)
- Modify: `web/app/site.css` (gaya `.references`, `.fig-num`)
- Test: `web/tests/core.test.ts`

**Interfaces:**
- Produces:
  - `referencesHtml(text: string): string`: setiap baris tidak kosong jadi `<li>`, isinya di-escape, `https?://…` jadi `<a href rel="noopener noreferrer" target="_blank">`, dan `*x*` jadi `<em>x</em>`. Hasilnya `""` kalau tidak ada baris.
  - `numberFigures(html: string): string`: menyisipkan `<span class="fig-num">Gambar N.</span> ` di awal `figcaption` dari setiap `figure.qiran-fig` secara berurutan, dan tidak menyentuh figure lain.

- [ ] Tes `referencesHtml`:
  - `referencesHtml("A. (2026). *Judul*. https://x.id/a\n\n<b>B</b>")` mengandung `<em>Judul</em>`, `href="https://x.id/a"`, dan `&lt;b&gt;B&lt;/b&gt;`, dengan tepat 2 `<li>`.
- [ ] Tes `numberFigures`:
  - dua `figure.qiran-fig` jadi "Gambar 1." dan "Gambar 2.";
  - satu `figure.kg-image-card` di antaranya tidak berubah.
- [ ] Tes `sanitize` mempertahankan `<figure class="qiran-fig"><img src="/uploads/a.jpg"><figcaption><span class="fig-caption">K</span> <span class="fig-source">S</span></figcaption></figure>`.
- [ ] Jalankan tes, harus FAIL. Implementasikan, lalu jalankan lagi sampai PASS.
- [ ] Halaman tulisan merender `numberFigures(post.content_html)`. Kalau `referencesHtml` tidak kosong, tampilkan `<section class="references"><h2>Daftar Pustaka</h2><ol class="ref-list">…</ol></section>` sebelum tombol bagikan. Daftar memakai `list-style: none`, menjorok gantung, dan rata kiri.
- [ ] Commit.

### Task 3: Editor: figure berketerangan, kolom PDF, Daftar Pustaka

**Files:**
- Modify: `web/lib/editor-schema.ts` (node `QiranFigure`)
- Modify: `web/components/admin/PostEditor.tsx` (dialog gambar, bagian "PDF tugas dan lomba", "Daftar Pustaka", tombol "Unduh PDF")
- Modify: `web/app/actions/admin.ts` (`EditorPayload` dan `saveFromEditor` meneruskan field baru)
- Modify: `web/lib/posts.ts` (`SaveInput.pdfLabel`, `pdfSubtitle`, `referencesText`; tipe `Post` mendapat kolom baru)
- Modify: `web/app/admin/admin.css`
- Test: `web/tests/core.test.ts`, `web/e2e/flow.mjs`

**Interfaces:**
- Consumes: kolom dari Task 1, dan kelas `qiran-fig`, `fig-caption`, `fig-source` dari Task 2.
- Produces:
  - `savePost` menyimpan `pdf_label` (maks 40), `pdf_subtitle` (maks 160), dan `references_text` (maks 20000), semuanya teks polos;
  - editor memanggil `GET /admin/pdf/<id>/` setelah menyimpan.

- [ ] Tes `savePost menyimpan kolom PDF sebagai teks polos`:
  - `pdfLabel: "Artikel <b>Opini</b>"` tersimpan sebagai `"Artikel Opini"`;
  - `referencesText` dengan 2 baris tersimpan apa adanya.
- [ ] Implementasikan `QiranFigure`:
  - node blok `figure` berisi atribut `src`, `alt`, `caption`, `source`;
  - `renderHTML` menghasilkan struktur dari Task 2;
  - `parseHTML` membaca `figure.qiran-fig`;
  - di editor ditampilkan sebagai gambar dengan keterangan di bawahnya, dan klik dua kali membuka dialog ubah.
- [ ] Dialog sisipkan gambar mendapat field "Keterangan" (placeholder "Misalnya: Balai Kota Bogor dipadati sopir angkot") dan "Sumber" (placeholder "Misalnya: RMOL, 23 Januari 2026").
  - Kalau keduanya kosong, sisipkan `image` biasa seperti sekarang.
  - Kalau tidak, sisipkan `QiranFigure`.
- [ ] Panel kanan mendapat dua bagian:
  - **"PDF tugas dan lomba":** "Label jenis tulisan" (placeholder "Artikel Opini"), "Subjudul", dan tombol "Unduh PDF". Tombol ini hanya ada untuk `type === "post"`, dengan keadaan sedang dibuat, gagal, dan selesai, memakai toast yang ada.
  - **"Daftar Pustaka":** textarea dengan petunjuk "Satu sumber per baris. Apit judul dengan *bintang* untuk huruf miring."
  - Petunjuk keterangan foto sampul diganti jadi "Sumber foto. Wajib untuk lomba."
- [ ] e2e: sisipkan gambar dengan keterangan dan sumber, isi Daftar Pustaka, terbitkan. Halaman publik harus memuat "Gambar 1." dan "Daftar Pustaka".
- [ ] Jalankan tes unit dan e2e, harus PASS. Lalu commit.

### Task 4: Pembuat PDF dan rute panel

**Files:**
- Create: `web/lib/pdf/template.ts`
- Create: `web/lib/pdf/render.ts`
- Create: `web/app/admin/pdf/[id]/route.ts`
- Modify: `web/next.config.ts` (`serverExternalPackages: ["playwright-core"]`)
- Modify: `web/package.json` (`playwright-core`, versi sama dengan Playwright terpasang di dev)
- Test: `web/tests/core.test.ts`, `web/e2e/flow.mjs`

**Interfaces:**
- Consumes:
  - `getIdentity` (Task 1);
  - `referencesHtml` dan `numberFigures` (Task 2);
  - `getFullById` dan `canEdit` dari `lib/posts`.
- Produces:
  - `pdfHtml(post: PostFull, identity: Identity, authorName: string, opts: { uploadsDir: string }): string`
  - `pdfFileName(title: string, name: string): string`, contohnya `pdfFileName("Kemudi Nestapa", "Qirani Azzahra") === "Kemudi_Nestapa_Qirani_Azzahra.pdf"`
  - `pdfCacheKey(post: PostFull, identity: Identity): string` (sha1 dengan versi templat)
  - `renderPdf(html: string): Promise<Buffer>`, yang melempar `PdfUnavailableError` kalau Chromium tidak ada

- [ ] Tes `pdfHtml`:
  - memuat label huruf kapital, "Judul: Subjudul", dan `Disusun oleh: Qirani Azzahra, SMAN 2 Bogor, Jawa Barat`;
  - dengan identitas kosong memuat `Disusun oleh: Qirani` tanpa ", ," atau koma di akhir;
  - judul `A <script>` ter-escape;
  - `<img src="https://luar/x.jpg">` diganti teks "Gambar tidak tersedia di PDF";
  - `/uploads/...` jadi data URI atau `file://` di dalam `uploadsDir`.
- [ ] Tes `pdfFileName` (termasuk karakter aneh jadi `_`, dan judul kosong jadi `Tulisan`), serta `pdfCacheKey` yang berubah saat `full_name` berubah.
- [ ] Implementasikan templat sesuai Global Constraints dan spec "5 (baru)".
  - CSS `@page { size: A4; margin: 4cm 3cm 3cm 4cm }`.
  - Bingkai berupa `position: fixed` dengan inset negatif ke area margin.
  - Judul dan label memakai `column-span: all`.
  - Gambar memakai `break-inside: avoid`, judul subbagian `break-after: avoid`, dan `orphans`/`widows` bernilai 2.
- [ ] Implementasikan `renderPdf`:
  - `chromium.launch({ args: ["--no-sandbox"] })` hanya kalau `process.getuid?.() === 0`;
  - `page.route("**/*")` membatalkan semua permintaan selain `data:`;
  - `setContent(html, { waitUntil: "load" })`;
  - `page.pdf({ format: "A4", printBackground: true, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate })` dengan nomor halaman 9 pt `#4d5550` di tengah;
  - browser ditutup di `finally`;
  - antrean berupa promise chain modul dengan penghitung, maksimal 3, dan batas waktu 45 detik.
- [ ] Rute `GET`:
  - tanpa sesi atau tanpa `canEdit` jawab 404;
  - `type !== "post"` jawab 404;
  - tanpa judul atau isi jawab 422 dengan JSON `{error}`;
  - rate limit jawab 429;
  - Chromium tidak ada jawab 503 `{error: "PDF belum bisa dibuat di server ini. Minta kakak menjalankan langkah pemasangan PDF."}`;
  - cache hit atau render menghasilkan PDF dengan `Content-Disposition: attachment; filename*=UTF-8''…` dan `Cache-Control: private, no-store`.
- [ ] e2e:
  - penulis mengunduh PDF dari draf, `content-type` `application/pdf`, ukuran 5 KB sampai 5 MB;
  - penulis lain dan pengunjung mendapat 404;
  - halaman publik tidak memuat nama lengkap.
- [ ] Jalankan semua tes, harus PASS. Lalu commit.

### Task 5: Pemasangan, panduan, verifikasi visual

**Files:**
- Modify: `docs/PINDAH-KE-NEXTJS.md` (bagian 11, "Pasang pembuat PDF")
- Modify: `docs/SETUP-DOMAIN-BARU.md`
- Modify: `PANDUAN-MENULIS.md` (bagian "PDF untuk tugas dan lomba")
- Modify: `web/scripts/deploy.sh` (peringatan kalau Chromium tidak ditemukan)
- Modify: `web/.env.example` (`PLAYWRIGHT_BROWSERS_PATH`)

- [ ] Perintah pemasangan untuk root di VPS:
  - `apt-get install -y ttf-mscorefonts-installer fonts-liberation`, ditambah langkah menerima EULA;
  - `PLAYWRIGHT_BROWSERS_PATH=/opt/qiran-blog/data/ms-playwright npx playwright install --with-deps chromium`;
  - `chown -R www:www` untuk folder itu;
  - baris `PLAYWRIGHT_BROWSERS_PATH=` di `.env.production`.
- [ ] Verifikasi visual: masukkan naskah asli "Kemudi Nestapa" (3 gambar dan 8 sumber) ke data uji, unduh PDF, render halamannya ke PNG, lalu bandingkan dengan karya asli dari segi margin, dua kolom, spasi, dan Daftar Pustaka.
- [ ] Commit dan push.
