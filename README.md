# qiran.my.id

Blog Qirana dan Qirani. Nama *qiran* diambil dari bagian tengah nama mereka.

Repo ini berisi semua yang dibutuhkan untuk menjalankan blognya di VPS aaPanel:

- **Ghost 6 + MySQL 8** lewat Docker Compose. Ghost adalah platform blog dengan panel menulis di `/ghost`.
- **Tema `qiran`** yang dibuat khusus: tipografi besar, satu huruf (Sentient), warna hijau-hitam dan putih tulang, mode terang/gelap, dan tombol saring per penulis.
- **Skrip** untuk update, backup, dan restore.

```
.
├── docker-compose.yml      Ghost + MySQL
├── .env.example            contoh pengaturan (salin jadi .env)
├── nginx/ghost-proxy.conf  blok reverse proxy untuk aaPanel
├── scripts/
│   ├── update.sh           backup → git pull → update image → restart
│   ├── backup.sh           dump database + arsip konten
│   └── restore.sh          pulihkan dari backup
├── theme/qiran/            tema Ghost
└── PANDUAN-MENULIS.md      panduan untuk penulis (Qirana & Qirani)
```

Data blog (database, gambar yang diunggah) tersimpan di folder `data/` dan tidak ikut masuk git.

---

## Pasang di VPS (sekali saja)

Langkah ini mengasumsikan aaPanel dengan Nginx dan Docker sudah terpasang (menu **Docker** di aaPanel).

### 1. Arahkan domain ke VPS

Di dashboard registrar domain, buka pengaturan DNS `qiran.my.id` lalu buat record:

| Tipe | Nama | Nilai |
| --- | --- | --- |
| A | `@` | IP publik VPS |
| A | `www` | IP publik VPS |

Tunggu sampai `ping qiran.my.id` menunjukkan IP VPS (biasanya beberapa menit, kadang sampai beberapa jam).

### 2. Clone repo dan isi `.env`

Lewat terminal aaPanel atau SSH:

```bash
cd /opt && git clone https://github.com/farhanfdlhq/qiran-blog.git && cd qiran-blog
```

```bash
cp .env.example .env && chmod 600 .env
```

Buat dua password acak untuk database:

```bash
echo "DATABASE_PASSWORD=$(openssl rand -hex 24)"; echo "DATABASE_ROOT_PASSWORD=$(openssl rand -hex 24)"
```

Buka `.env` (`nano .env`), tempel kedua password tadi, lalu isi bagian email (lihat langkah 3).

### 3. Siapkan email (wajib)

Ghost butuh email untuk reset password, undangan penulis, dan **kode verifikasi saat login dari perangkat baru**. Tanpa email, penulis tidak bisa login dari HP atau laptop baru.

Cara paling mudah dengan Gmail:

1. Pakai akun Google yang sudah mengaktifkan verifikasi 2 langkah.
2. Buka <https://myaccount.google.com/apppasswords>, buat App Password bernama "Ghost".
3. Isi di `.env`:
   ```
   MAIL_FROM="Blog Qiran <akun@gmail.com>"
   SMTP_USER=akun@gmail.com
   SMTP_PASSWORD=<16 huruf app password, tanpa spasi>
   ```

Gmail cukup untuk email akun (login, undangan, reset). Kalau nanti mau mengirim newsletter ke banyak pembaca, Ghost butuh Mailgun. Itu terpisah dan tidak wajib.

### 4. Jalankan Ghost

```bash
docker compose up -d
```

Cek statusnya. Tunggu sampai `qiran-db` tertulis `healthy` dan `qiran-ghost` berjalan:

```bash
docker compose ps
```

Ghost sekarang berjalan di `127.0.0.1:2368`. Port ini hanya bisa diakses dari VPS sendiri, tidak terbuka ke internet.

### 5. Buat website di aaPanel

1. **Website → Add site**. Domain: `qiran.my.id` dan `www.qiran.my.id`. PHP: *Static* (tidak perlu PHP). Database: tidak usah.
2. Buka pengaturan site → **SSL → Let's Encrypt**, centang kedua domain, Apply. Aktifkan **Force HTTPS**.
3. Buka **Conf** (file konfigurasi Nginx site ini). Tempel isi `nginx/ghost-proxy.conf` di dalam blok `server { ... }` untuk port 443, menggantikan blok `location /` yang sudah ada kalau ada. Simpan.

   Bisa juga lewat menu **Reverse proxy** aaPanel (target `http://127.0.0.1:2368`), tapi pastikan header `X-Forwarded-Proto $scheme` ikut dikirim. Tanpa header itu browser akan menampilkan *too many redirects*.

Buka <https://qiran.my.id>. Kalau halaman Ghost muncul, server sudah siap.

### 6. Pengaturan pertama di Ghost

Buka <https://qiran.my.id/ghost> dan buat akun **pemilik (Owner)**. Sebaiknya akun ini milik kakak, bukan adik, supaya pengaturan server dan backup tetap di tangan orang dewasa.

Lalu, di panel Ghost:

1. **Settings → Design & branding → Change theme**. Aktifkan **qiran**.
2. **Settings → Design & branding → Brand → Accent color**: isi `#2f5d50`. Warna ini dipakai tombol komentar dan langganan bawaan Ghost.
3. **Settings → General → Publication language**: isi `id`.
4. **Settings → General → Title & description**: judul `qiran`, deskripsi singkat.
5. **Settings → Navigation**: Primary berisi `Tulisan` → `/#tulisan` dan `Tentang` → `/tentang/`. Secondary (footer) bebas.
6. **Settings → Staff → Invite people**: undang Qirana dan Qirani dengan peran **Author**. Author bisa menulis dan menerbitkan tulisannya sendiri, tapi tidak bisa mengubah pengaturan situs atau tulisan orang lain.
7. Hapus tulisan contoh bawaan Ghost ("Coming soon") di menu **Posts**.
8. Buat halaman (**Pages → New page**) berjudul **Tentang** dengan URL `tentang`. Isinya otomatis tampil juga di bagian bawah beranda.

Teks besar di beranda bisa diubah di **Settings → Design & branding → Customize → Homepage**.

### 7. Backup otomatis

Di aaPanel: **Cron → Add task**, tipe *Shell Script*, jadwal harian jam 03:00:

```bash
cd /opt/qiran-blog && BACKUP_DIR=/www/backup/qiran ./scripts/backup.sh
```

Backup lebih dari 14 hari dihapus otomatis. Sesekali salin satu folder backup ke tempat lain (Google Drive, laptop), karena backup di VPS yang sama ikut hilang kalau VPS-nya bermasalah.

---

## Perawatan

**Update tema atau Ghost** (setelah ada perubahan di repo ini, atau sebulan sekali untuk update keamanan Ghost):

```bash
cd /opt/qiran-blog && ./scripts/update.sh
```

Skrip ini membuat backup dulu, menarik perubahan dari GitHub, mengambil image Ghost terbaru dalam versi 6, lalu me-restart Ghost. Restart diperlukan karena Ghost menyimpan template tema di cache.

**Pulihkan dari backup:**

```bash
cd /opt/qiran-blog && ./scripts/restore.sh /www/backup/qiran/qiran-20261101-030000
```

**Lihat log kalau ada masalah:**

```bash
cd /opt/qiran-blog && docker compose logs --tail=100 ghost
```

---

## Privasi (penulisnya masih 16 tahun)

Beberapa hal yang sebaiknya dibicarakan bersama sebelum blog dibuka:

- **Nama.** Cukup nama depan. Jangan cantumkan nama lengkap, nama sekolah, alamat, atau jadwal harian.
- **Foto.** Hindari foto wajah, seragam dengan logo sekolah, atau foto yang memperlihatkan lokasi rumah.
- **Komentar.** Komentar Ghost hanya bisa ditulis oleh pembaca yang mendaftar (member). Kalau dinyalakan (**Settings → Membership → Commenting**), pertimbangkan **Paid members only** atau matikan sama sekali di awal. Penulis bisa menyembunyikan komentar dari panel.
- **Pendaftaran pembaca.** Kalau tidak ingin ada yang mendaftar, set **Settings → Membership → Subscription access** ke *Nobody*. Tombol "Ikuti" di header otomatis hilang.

---

## Mengubah tema

Semua file tema ada di `theme/qiran/`. Folder ini langsung dipasang ke Ghost, jadi setelah `git pull` cukup jalankan `docker compose restart ghost`.

Cek tema sebelum push:

```bash
npx gscan theme/qiran
```

Keputusan desain dan alasannya ada di [`theme/qiran/DESIGN.md`](theme/qiran/DESIGN.md).
