# web: aplikasi blog qiran.my.id

Next.js 16 + SQLite, Node 22 atau lebih baru. Satu aplikasi untuk situs publik dan panel penulis di `/admin/`.

## Fitur

- **Situs:** beranda, tulisan, topik, penulis, Tentang, pencarian, mode terang/gelap, saring per penulis. Alamat tulisan sama dengan Ghost (`/judul-tulisan/`), jadi tautan lama tetap jalan.
- **Panel penulis:** editor visual (tebal, miring, stabilo, judul, kutipan, daftar, tautan, gambar), simpan otomatis untuk draf, jadwal terbit (WIB), gambar sampul.
- **Komentar** tanpa akun pembaca. Komentar baru tampil setelah disetujui, dengan perlindungan spam (honeypot, batas waktu isi, batas jumlah).
- **Statistik** pembaca per tulisan tanpa cookie. Pengunjung dikenali lewat hash harian yang tidak bisa dibalik, dan bot tidak dihitung.
- **SEO:** meta Open Graph dan Twitter, JSON-LD `BlogPosting`, `sitemap.xml`, `robots.txt`, `rss.xml`.
- **Peran:** admin (semua) dan penulis (tulisan dan komentar miliknya sendiri, plus halaman Tentang).

## Struktur

```
app/(site)/       halaman publik
app/admin/        panel penulis
app/actions/      server action (simpan tulisan, komentar, akun, pengaturan)
app/api/          upload gambar, hitung pembaca
lib/              database, akun, tulisan, komentar, statistik, render HTML aman
components/       komponen situs dan panel (editor Tiptap)
scripts/          kelola akun, impor dari Ghost, backup
tests/            unit test (vitest)
e2e/              uji alur di browser (Playwright)
```

Data (database `qiran.sqlite` dan folder `uploads/`) disimpan di `DATA_DIR`, di luar folder kode.

## Menjalankan di komputer sendiri

```bash
npm install && cp .env.example .env.local
```

Isi `DATA_DIR=./data` dan `SITE_URL=http://localhost:3100` di `.env.local`, lalu:

```bash
DATA_DIR=./data npm run user -- add --email kamu@contoh.id --name "Kamu" --role admin
```

```bash
npm run dev
```

Buka http://localhost:3100 dan http://localhost:3100/admin/.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Mode pengembangan |
| `npm run build` lalu `npm start` | Produksi (RAM dibatasi sekitar 192 MB heap) |
| `npm test` | Unit test |
| `npm run test:e2e` | Uji alur di browser. Butuh server yang sedang jalan, Playwright, dan variabel `ADMIN_EMAIL`, `ADMIN_PW`, `AUTHOR_EMAIL`, `AUTHOR_PW` |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run user -- add/reset/list` | Kelola akun dari terminal |
| `npm run seed` | Isi tulisan contoh, halaman Tentang, dan topik |
| `npm run import:ghost -- ekspor.json [folder-konten-ghost]` | Impor dari Ghost |
| `npm run backup` | Backup database dan gambar |

Pemasangan di VPS: lihat [`docs/PINDAH-KE-NEXTJS.md`](../docs/PINDAH-KE-NEXTJS.md).

## Catatan keamanan

- Password di-hash dengan scrypt. Token sesi disimpan sebagai hash SHA-256, cookie `httpOnly` dan `SameSite=Lax`.
- Percobaan login dibatasi per IP dan per akun (5 kali dalam 15 menit).
- Isi tulisan disaring dengan daftar tag yang diizinkan saat disimpan. Komentar selalu ditampilkan sebagai teks biasa.
- Upload hanya menerima gambar yang bisa dibaca `sharp`, metadata EXIF dibuang, nama file diacak, dan unggahan dari situs lain ditolak.
- File di `/uploads/` dilayani dengan pengecekan path traversal.
