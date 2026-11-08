# PDF untuk tugas dan lomba

Status: rancangan, menunggu persetujuan
Tanggal: 8 November 2026

## Maksud dan alasan

Qirana dan Qirani sering harus mengirim tulisan ke guru (tugas sekolah) atau ke panitia lomba dalam bentuk berkas A4 yang rapi. Sekarang mereka menata ulang tulisan di Word. Hasilnya rapuh: latar foto dan blok abu-abu rusak saat diekspor, paragraf terpotong, URL terbelah, dan kontras teks rendah (lihat riwayat "Kemudi Nestapa", tiga versi PDF).

Fitur ini membuat setiap tulisan di qiran bisa diunduh dari panel sebagai **PDF A4 dua kolom** yang langsung siap dikirim atau dicetak, dengan satu klik dari HP maupun laptop. Patokan desainnya adalah `Kemudi_Nestapa_Qirani_Azzahra_REVISI.pdf`.

## Tujuan

1. Dari editor tulisan di panel, penulis bisa mengunduh PDF A4 dari tulisannya, baik draf, terjadwal, maupun terbit.
2. Tampilan PDF mengikuti patokan:
   - **Sampul:** foto penuh dengan lapisan gelap, label jenis tulisan, "SEKOLAH · TAHUN", judul besar, subjudul miring, dan nama penulis beserta sekolah dan provinsi.
   - **Halaman isi:**
     - dua kolom dengan header berulang "JUDUL | Jenis · Nama penulis" dan nomor halaman di bawah;
     - subjudul hijau;
     - kutipan pembuka dan kutipan tarik;
     - gambar bernomor dengan keterangan dan sumber.
   - **Penutup:** Daftar Pustaka dengan baris menjorok, lalu kotak "Disusun oleh".
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
- **Font:** harus berlisensi bebas dan disertakan di repo supaya tidak bergantung jaringan. Lora dan Poppins berlisensi OFL.
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

Templatnya berupa halaman HTML khusus cetak yang dirender di server dari data tulisan, lalu diberikan ke Chromium dengan `page.setContent()`. Templat tidak membuka URL situs.

**Kertas dan tata letak**

- A4, dengan margin sekitar 18 mm kiri-kanan, 20 mm atas, dan 22 mm bawah.
- Isi dua kolom memakai CSS `columns: 2` dengan jarak kolom sekitar 8 mm, rata kiri, dan pemenggalan kata bahasa Indonesia (`hyphens: auto`, `lang="id"`).
- Header berulang dan nomor halaman dibuat dengan `headerTemplate` dan `footerTemplate` dari Playwright, kecuali di sampul. Caranya, sampul dirender sebagai PDF terpisah tanpa header, lalu digabung dengan `pdf-lib`. Ini *keputusan pembangun* kalau ada cara yang lebih sederhana.

**Gaya, mengikuti patokan**

- Isi memakai Lora 10 sampai 10,5 pt dengan jarak baris sekitar 1,45.
- Label dan subjudul memakai Poppins.
- Aksen hijau angkot: garis dan label `#8BC34A`, subjudul `#2E7D32`. *Usulan saya.* Warna ini diambil dari patokan dan berlaku untuk semua tulisan. Tidak ada pilihan warna per tulisan.
- **Sampul (halaman 1):**
  - Kalau ada foto sampul: foto memenuhi halaman dengan gradasi gelap dari atas dan bawah.
  - Kalau tidak ada: latar hijau tua polos.
  - Kiri atas: label berbentuk pil.
  - Kanan atas: "SEKOLAH · TAHUN". Tahun diambil dari tanggal terbit, atau dari tahun sekarang untuk draf.
  - Di atas judul: garis hijau pendek.
  - Judul: Lora tebal, besar, putih. Ukurannya mengecil otomatis untuk judul panjang.
  - Subjudul: miring.
  - Kiri bawah: nama lengkap tebal, dengan "Sekolah · Provinsi" di bawahnya.
  - Sumber foto: kecil, di sudut kanan bawah.
- **Kutipan:** blockquote pertama yang muncul sebelum paragraf mana pun jadi kutipan pembuka selebar dua kolom, dengan garis hijau di kiri. Blockquote lain jadi kutipan tarik di dalam kolom, dengan garis atas hijau dan garis bawah tipis.
- **Subjudul isi:** `h2` memakai Poppins tebal hijau, dengan garis pendek di atasnya. `h3` memakai Lora tebal.
- **Gambar:** selebar kolom, tidak boleh terbelah antar halaman (`break-inside: avoid`). Keterangannya "Gambar N." tebal hijau, diikuti teks miring abu-abu.
- **Aturan pemisah:** subjudul tidak boleh tertinggal di dasar kolom (`break-after: avoid`). Minimal 2 baris paragraf di awal dan akhir kolom (`orphans` dan `widows`).
- **Penutup:** Daftar Pustaka, lalu kotak "DISUSUN OLEH" dengan nama lengkap, sekolah, dan provinsi.
- **Tanda qiran:** tidak ada logo atau nama qiran di PDF, karena berkas ini atas nama penulis untuk guru atau panitia. *Usulan saya.*

**Font:** Lora dan Poppins (OFL) disertakan di `web/assets/fonts/pdf/` lengkap dengan berkas lisensinya, lalu dimuat lewat `@font-face` dengan URL `file://` atau data URI.

**Gambar:** gambar dari `/uploads/` dibaca langsung dari disk. Varian `-w1400` dipakai kalau ada, supaya PDF tidak terlalu besar. Gambar dari URL luar tidak diambil, dan diganti kotak bertuliskan "Gambar tidak tersedia di PDF". Semua permintaan jaringan dari Chromium diblokir kecuali `data:` dan `file:` untuk folder font dan uploads. Ini mencegah SSRF dan menjaga hasil tetap sama.

**Nama berkas:** `Judul_Nama_Lengkap.pdf`, berupa slug dari judul dan nama lengkap (atau nama tampilan) dengan garis bawah, contohnya `Kemudi_Nestapa_Qirani_Azzahra.pdf`.

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

- Dependensi baru: `playwright-core` (tanpa unduhan browser otomatis) dan `pdf-lib` (kalau dipakai untuk menggabung sampul).
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
- **Subjudul sampul dari ringkasan** dipotong rapi di batas kata, maksimal sekitar 140 karakter.
- **Sistem operasi VPS** perlu dicek saat pemasangan, karena `--with-deps` butuh apt (Ubuntu atau Debian). Kalau ternyata bukan, langkah pemasangan menyebut paket yang dibutuhkan secara manual.
- **Chromium berjalan sebagai user `www`**, dengan `HOME` dan folder sementara yang bisa ditulis. Folder sementaranya di dalam `DATA_DIR/cache/chromium`.

## Diserahkan ke pembangun

- Cara teknis penggabungan sampul dengan halaman isi (pdf-lib atau satu dokumen dengan aturan `@page :first`), asalkan sampul tanpa header dan nomor halaman.
- Ukuran font dan jarak yang tepat, asalkan hasil akhirnya setara dengan patokan.
- Bentuk antrean render.
- Detail node Tiptap untuk figure.
