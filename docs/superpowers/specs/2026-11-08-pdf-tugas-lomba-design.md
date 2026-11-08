# PDF untuk tugas dan lomba

Status: disetujui 8 November 2026, dengan revisi format (lihat "Revisi setelah tinjauan")
Tanggal: 8 November 2026

## Maksud dan alasan

Qirana dan Qirani sering harus mengirim tulisan ke guru (tugas sekolah) atau ke panitia lomba dalam bentuk berkas A4 yang rapi. Sekarang mereka menata ulang tulisan di Word. Hasilnya rapuh: latar foto dan blok abu-abu rusak saat diekspor, paragraf terpotong, URL terbelah, dan kontras teks rendah (lihat riwayat "Kemudi Nestapa", tiga versi PDF).

Fitur ini membuat setiap tulisan di qiran bisa diunduh dari panel sebagai **PDF A4 dua kolom** yang langsung siap dikirim atau dicetak, dengan satu klik dari HP maupun laptop. Patokan tata letaknya adalah karya asli Qirani sebelum didesain ulang (`SMAN2Bogor_KemudiNestapa_PotretFisikdanMentalSopirAngkotdiJantungKotaHujan.pdf`), dengan format wajib: Times New Roman, spasi 1,5, dua kolom.

## Tujuan

1. Dari editor tulisan di panel, penulis bisa mengunduh PDF A4 dari tulisannya, baik draf, terjadwal, maupun terbit.
2. Tampilan PDF mengikuti karya asli Qirani dengan format Times New Roman, spasi 1,5, dua kolom (detail di "5 (baru)").
3. Hasilnya sama persis di perangkat apa pun.
4. Identitas lengkap (nama lengkap, sekolah, provinsi) hanya tercetak di PDF. Tidak pernah tampil di situs publik.

## Bukan tujuan

- Pembaca umum mengunduh PDF. Hanya penulis, dari panel.
- Format khusus panitia (Times New Roman 12, spasi 1,5, satu kolom, dan sebagainya). Satu templat saja, mengikuti patokan.
- Mengedit tata letak PDF secara manual (memindah gambar, mengatur pemisah halaman).
- Ekspor ke Word.

## Yang dianggap gagal walau secara teknis jalan

- Nama lengkap atau sekolah muncul di halaman publik, RSS, sitemap, gambar pratinjau sosmed, atau di PDF yang bisa diakses orang lain.
- PDF yang terlihat rusak: teks terpotong di tepi, gambar terbelah di antara dua halaman, judul subbagian tertinggal sendirian di dasar kolom, atau kontras rendah.
- Membuat PDF ternyata lambat atau membuat situs ikut lambat atau mati.

## Batasan

- **VPS:** aaPanel, 2 core, RAM 7,75 GB (terpakai sekitar 2,3 GB), Node v24. Aplikasi jalan sebagai user `www` dengan heap Node dibatasi 192 MB.
- **Stack:** Next.js 16, SQLite, editor Tiptap (HTML disanitasi di server dengan `sanitize-html`).
- **Font:** Times New Roman tidak boleh disebar ulang, jadi tidak masuk repo. Font ini dipasang di VPS sebagai paket sistem, dengan Liberation Serif (ukuran huruf identik) sebagai cadangan.
- **Gambar di tulisan:** bisa berasal dari `/uploads/` atau, untuk tulisan hasil impor Ghost, URL luar.

## Pendekatan yang dipertimbangkan

| | Cara | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| A | Cetak dari browser (CSS `@page`, "Simpan sebagai PDF") | Tanpa beban server | Hasil tergantung browser dan HP; penulis harus mengatur kertas dan margin sendiri; di iPhone berbelit |
| **B** | **Server mengubah halaman HTML cetak jadi PDF dengan Chromium tanpa layar (Playwright)** | Hasil konsisten; header berulang dan nomor halaman; desain cukup diubah lewat CSS | Chromium dipasang di VPS (sekitar 300 MB); 2 sampai 5 detik dan sekitar 200 MB RAM sesaat per PDF |
| C | Pustaka PDF di server (ReportLab, pdfkit, react-pdf) | Ringan | Aliran dua kolom, teks kaya, dan pemenggalan harus diprogram manual; tiap perubahan desain jadi pekerjaan berat |

**Dipilih: B.** Alasannya, tujuan utama fitur ini adalah berkas yang pasti rapi untuk guru dan panitia, termasuk saat dibuat dari HP.

## Keputusan yang sudah diambil bersama

- Untuk lomba dan tugas sekolah, dikirim ke guru, dicetak A4.
- Hanya Qirana dan Qirani (siapa pun yang boleh mengedit tulisan itu) yang bisa mengunduh, dari panel.
- Pakai pendekatan B.

## Revisi setelah tinjauan (berlaku di atas bagian Rancangan)

Jawaban kakak atas rancangan pertama:

- Format wajib untuk saat ini: **Times New Roman, spasi 1,5, dua kolom**.
- Patokan tata letak adalah **karya asli Qirani**, bukan versi desain ulang.
- Warna memakai **palet situs qiran mode terang**.
- Daftar Pustaka tampil di situs: ya. Nomor gambar di situs: ya.
- Tidak ada nama atau logo qiran di PDF. Kolom subjudul: ya. Sumber foto sampul: ya. Halaman Tentang tidak punya PDF.

Akibatnya, bagian 5 (Templat PDF) diganti dengan bagian 5 baru di bawah ini.

### 5 (baru). Templat PDF mengikuti karya asli

**Kertas dan margin**

- A4.
- Margin 4 cm kiri, 4 cm atas, 3 cm kanan, 3 cm bawah. Ini ukuran yang lazim untuk tugas di Indonesia, dan sesuai dengan blok teks di karya asli.
- Bingkai garis tipis di sekeliling halaman, sekitar 0,8 cm dari tepi kertas, seperti di karya asli. Warnanya tinta qiran `#161c1a`, dengan ketebalan 0,5 pt.

**Huruf dan spasi**

- Times New Roman 12 pt di seluruh dokumen.
- Spasi 1,5 setara Word ("1.5 lines"), yaitu `line-height` sekitar 1,725.
- Di server, font dicari berurutan:
  1. `Times New Roman` (dari paket `ttf-mscorefonts-installer`, dipasang di VPS);
  2. `Liberation Serif` (ukuran hurufnya identik dengan Times New Roman);
  3. `serif`.
- Font tidak dimasukkan ke repo, karena lisensinya tidak mengizinkan.

**Isi**

- Dua kolom dengan jarak 1,27 cm, rata kiri-kanan (`text-align: justify`) dan pemenggalan kata bahasa Indonesia.
- Paragraf diberi indentasi baris pertama 1,27 cm. Jarak antarparagraf sekitar 6 pt.

**Halaman pertama, tanpa halaman sampul terpisah** (sama seperti karya asli)

- **Label jenis tulisan:** huruf kapital tebal, di tengah, selebar dua kolom.
- **Judul:** tebal 14 pt, di tengah. Kalau subjudul diisi, dicetak sebagai "Judul: Subjudul", seperti judul asli Qirani. Ringkasan tidak dipakai sebagai cadangan subjudul, karena tidak ada sampul.
- **Foto sampul:** kalau ada, dicetak sebagai gambar selebar dua kolom di bawah judul (tinggi maksimal sekitar 7 cm), dengan sumber foto kecil miring di bawahnya. Tidak dijadikan latar di belakang teks, karena latar itu yang membuat teks sulit dibaca dan rusak saat diekspor. *Usulan saya.*
- Setelah itu isi dua kolom dimulai.

**Unsur lain**

- **Subjudul `h2`:** Times New Roman tebal 12 pt, tanpa indentasi. `h3`: tebal miring.
- **Kutipan (blockquote):** miring, menjorok 0,6 cm, dengan garis kiri warna aksen qiran `#9fc7b8` setebal 2 pt.
- **Gambar:**
  - selebar kolom dan tidak boleh terbelah antar halaman;
  - keterangannya diawali "**Gambar N.**" tebal, lalu keterangan miring dan "(Sumber: …)", warna `#4d5550` (muted qiran);
  - ukuran keterangan 11 pt dengan spasi 1,15, supaya tidak memakan tempat.
- **Daftar Pustaka:**
  - judul "DAFTAR PUSTAKA" huruf kapital, melanjutkan aliran dua kolom seperti karya asli;
  - tiap sumber menjorok gantung 1,27 cm dan rata kiri (bukan rata kiri-kanan, supaya URL tidak meregang);
  - tautan berwarna tinta dengan garis bawah aksen `#9fc7b8`, sama seperti di situs.
- **Penutup:** "Disusun oleh: Nama Lengkap, Sekolah, Provinsi", rata kanan, di akhir aliran teks. Titik koma di karya asli dirapikan jadi titik dua.
- **Nomor halaman:** kecil di tengah bawah, warna muted, mulai halaman 1. Karya asli tidak punya, tapi lomba biasanya memintanya. *Usulan saya.*
- **Tidak ada:** header berulang, logo qiran, atau latar berwarna. Kertas putih, supaya hemat tinta saat dicetak.
- **Warna dari palet situs qiran mode terang:** tinta `#161c1a`, muted `#4d5550`, aksen `#9fc7b8`, dan permukaan `#d6d5cc` untuk garis tipis.

**Teknis**

- Chromium mencetak dengan `page.pdf({ format: "A4", printBackground: true, displayHeaderFooter: true, footerTemplate })`, dengan header kosong dan margin sesuai di atas.
- Bingkai halaman memakai elemen `position: fixed` yang ikut tercetak di setiap halaman.
- Karena tidak ada sampul terpisah, `pdf-lib` tidak diperlukan.

Bagian 2 juga berubah: kolom "Subjudul" tidak lagi memakai ringkasan sebagai cadangan.

## Rancangan

### 1. Identitas untuk tugas dan lomba (Akun saya)

Bagian baru di **Akun saya** bernama "Identitas untuk tugas dan lomba", dengan tiga kolom opsional:

- Nama lengkap (maksimal 80 karakter)
- Sekolah (maksimal 80)
- Provinsi atau kota (maksimal 60)

Petunjuknya: "Hanya dicetak di PDF yang kamu unduh. Tidak tampil di situs."

Disimpan sebagai kolom baru di tabel `users` (`full_name`, `school`, `region`) lewat migrasi `user_version` berikutnya. Kolom ini tidak boleh ikut ke query publik mana pun. Fungsi yang mengambil penulis untuk situs (`Author` di `lib/posts.ts`) tetap memilih kolom secara eksplisit tanpa tiga kolom ini.

Kalau kosong, PDF memakai nama tampilan, dan baris sekolah tidak dicetak.

### 2. Tambahan per tulisan (panel kanan editor)

Bagian baru bernama "PDF tugas dan lomba", ditaruh setelah pengaturan lain dan sebelum tombol hapus:

- **Label jenis tulisan**, contoh "Artikel Opini". Bawaannya kosong. Kalau kosong, dipakai nama tag pertama, dan kalau tidak ada tag, label tidak dicetak.
- **Subjudul**, contoh "Potret Fisik dan Mental Sopir Angkot di Jantung Kota Hujan". Bawaannya kosong, dan kalau kosong ringkasan yang dipakai. Karena itu judul panjang bisa dipecah: "Kemudi Nestapa" di judul tulisan, sisanya di sini. *Usulan saya.*
- **Tombol "Unduh PDF"** beserta keadaannya: sedang dibuat (dengan indikator), gagal (toast dan tombol coba lagi), selesai (berkas terunduh).

Kolom baru di tabel `posts`: `pdf_label`, `pdf_subtitle`. Keduanya teks polos dan ikut autosave seperti kolom lain.

### 3. Keterangan dan sumber gambar di dalam tulisan

Dialog sisipkan gambar mendapat dua kolom baru di bawah teks alternatif:

- **Keterangan**, contoh "Balai Kota Bogor mulai dipadati sopir angkot yang akan demo"
- **Sumber**, contoh "RMOL, 23 Januari 2026"

Gambar dengan keterangan atau sumber disimpan sebagai `<figure><img><figcaption>…</figcaption></figure>`. Isi figcaption adalah keterangan dan sumber yang dipisahkan elemen bertanda kelas. `sanitize-html` sudah mengizinkan `figure` dan `figcaption`, tinggal ditambah kelas yang perlu.

Di editor perlu node Tiptap kustom (figure dengan gambar dan keterangan yang bisa diedit), menggantikan pemakaian `Image` untuk gambar baru. Gambar lama tanpa keterangan tetap jalan.

**Penomoran "Gambar 1.", "Gambar 2.", dan seterusnya** dibuat otomatis saat render, berdasarkan urutan gambar yang punya keterangan. Berlaku di situs maupun PDF, supaya teks yang menyebut "Gambar 2" tetap cocok. *Usulan saya.*

Gambar sampul memakai kolom `feature_image_caption` yang sudah ada sebagai sumber foto sampul. Di PDF, sumber ini dicetak kecil di sudut bawah sampul. Petunjuk kolomnya diperbarui jadi "Tulis sumber foto, wajib untuk lomba".

### 4. Daftar Pustaka

Kolom baru di panel kanan editor bernama "Daftar Pustaka": textarea, satu sumber per baris (baris kosong diabaikan). URL di dalamnya otomatis jadi tautan. Teks di antara `*…*` dicetak miring untuk judul, sesuai gaya APA. *Usulan saya.* Isinya disimpan sebagai teks polos di kolom `posts.references_text` dan diubah jadi HTML aman saat render.

- **Di situs:** muncul sebagai bagian "Daftar Pustaka" di akhir tulisan, sebelum tombol bagikan, dengan baris menjorok. Ini bukan data pribadi, dan memperkuat tulisan. *Usulan saya.*
- **Di PDF:** muncul di halaman baru setelah isi, dengan satu kolom penuh, mengikuti patokan.

Urutan sumber mengikuti urutan yang diketik. Tidak diurutkan otomatis.

### 5. Templat PDF

Lihat "5 (baru)" di bagian Revisi di atas. Templat versi desain ulang (sampul berfoto, Lora dan Poppins, hijau angkot) dibatalkan.

### 6. Rute dan keamanan

- `GET /admin/pdf/<id>/` mengembalikan PDF dengan `Content-Disposition: attachment`.
- Perlu sesi login, dan `canEdit(user, post)` harus lolos. Selain itu 404.
- Tidak di-cache browser (`Cache-Control: private, no-store`).
- Sebelum mengunduh, editor menyimpan perubahan dulu (seperti tombol Pratinjau), lalu memanggil rute ini.
- **Batas:**
  - Satu render berjalan dalam satu waktu untuk seluruh aplikasi. Permintaan lain menunggu di antrean, dengan maksimal 3 antrean dan batas waktu 45 detik.
  - Rate limit 10 PDF per 10 menit per akun.
  - Tulisan tanpa judul atau isi ditolak dengan pesan jelas.
- **Cache:** hasil disimpan di `DATA_DIR/cache/pdf/<id>-<hash>.pdf`. Hash dihitung dari isi tulisan, kolom PDF, daftar pustaka, identitas penulis, dan versi templat. Versi lama untuk id yang sama dihapus saat versi baru dibuat. Folder ini tidak boleh dilayani rute publik mana pun.
- **Proses Chromium:** dijalankan per permintaan lalu ditutup, supaya RAM kembali. Opsi `--no-sandbox` dipakai hanya kalau memang perlu di VPS, dan itu *keputusan pembangun* setelah dicoba di sana.

### 7. Pemasangan di VPS

- Dependensi baru: `playwright-core` (tanpa unduhan browser otomatis).
- Font Times New Roman dipasang di VPS dengan `apt install ttf-mscorefonts-installer`, dan Liberation Serif dengan `fonts-liberation` sebagai cadangan.
- Chromium dipasang sekali sebagai root:
  - perintahnya `PLAYWRIGHT_BROWSERS_PATH=/opt/qiran-blog/data/ms-playwright npx playwright install --with-deps chromium`;
  - folder itu diberikan ke `www`;
  - letaknya ditulis di `.env.production` sebagai `PLAYWRIGHT_BROWSERS_PATH`.
- `deploy.sh` tidak memasang Chromium. Skrip hanya memberi peringatan kalau Chromium belum ada.
- Kalau Chromium tidak ada, tombol "Unduh PDF" menampilkan pesan "PDF belum bisa dibuat di server ini, minta kakak menjalankan langkah pemasangan".
- Langkah pemasangan ditulis di `docs/PINDAH-KE-NEXTJS.md` (bagian baru) dan di `docs/SETUP-DOMAIN-BARU.md`.

### 8. Pengujian

- **Unit:**
  - hash cache berubah saat isi atau identitas berubah;
  - nama berkas benar;
  - parser Daftar Pustaka (URL jadi tautan, `*miring*`, baris kosong);
  - nomor gambar;
  - identitas tidak ikut di objek `Author` publik.
- **e2e:**
  - penulis mengunduh PDF dari draf dan menerima `application/pdf` berukuran wajar;
  - penulis lain dan pengunjung tanpa login mendapat 404;
  - halaman publik tidak mengandung nama lengkap atau sekolah;
  - teks dalam PDF memuat judul dan "Daftar Pustaka" (diperiksa dengan pdf-parse atau `pdftotext`).
- **Visual:** render "Kemudi Nestapa" (naskah asli Qirani beserta 3 gambar dan 8 sumber) lalu bandingkan berdampingan dengan patokan.

### 9. Dokumentasi

- **PANDUAN-MENULIS.md:** bagian baru "PDF untuk tugas dan lomba", berisi isi identitas, label, subjudul, keterangan dan sumber gambar, Daftar Pustaka, dan cara unduh.
- **Docs pemasangan:** langkah Chromium.

## Hal kecil yang diputuskan saat pemeriksaan

- **Hanya tulisan (`type = post`) yang punya PDF.** Halaman Tentang tidak punya. *Usulan saya.*
- **Identitas yang dicetak selalu milik penulis tulisan itu**, bukan milik siapa pun yang menekan tombol. Admin yang mengunduh tulisan Qirani tetap mendapat PDF atas nama Qirani.
- **Nomor "Gambar N." hanya untuk gambar baru yang dibuat dengan node figure qiran.** Penandanya kelas `qiran-fig`. Figure lama hasil impor Ghost (`kg-image-card`) tidak diberi nomor, supaya tampilan tulisan lama di situs tidak berubah. *Usulan saya.*
- **Sistem operasi VPS** perlu dicek saat pemasangan, karena `--with-deps` butuh apt (Ubuntu atau Debian). Kalau ternyata bukan, langkah pemasangan menyebut paket yang dibutuhkan secara manual.
- **Chromium berjalan sebagai user `www`**, dengan `HOME` dan folder sementara yang bisa ditulis. Folder sementaranya di dalam `DATA_DIR/cache/chromium`.

## Diserahkan ke pembangun

- Jarak kecil (antarparagraf, sekitar gambar, sekitar judul), asalkan tetap setara dengan karya asli.
- Bentuk antrean render.
- Detail node Tiptap untuk figure.
