# Audit keamanan aplikasi web qiran

Tanggal: 1 November 2026. Cakupan: folder `web/` (Next.js + SQLite), di branch `nextjs-blog`.

Metode: membaca kode sumber per batas kepercayaan (pembaca anonim, penulis, admin, file unggahan), lalu membuktikan tiap dugaan dengan uji lokal: unit test, uji alur di browser, dan permintaan HTTP langsung ke server lokal. Tidak ada pengujian ke server produksi. Ini audit terarah oleh satu peninjau, bukan audit penuh enam tahap dengan peninjau independen.

## Batas kepercayaan yang diperiksa

| Pelaku | Bisa melakukan | Kontrol |
| --- | --- | --- |
| Pembaca anonim | Membaca tulisan terbit, mencari, mengirim komentar, mencatat kunjungan | Hanya tulisan terbit yang waktunya sudah lewat yang terbaca; komentar dimoderasi |
| Penulis | Menulis, mengunggah gambar, mengelola komentar di tulisan sendiri, mengedit halaman Tentang | `canEdit`, `requireUser`, pengecekan pemilik komentar |
| Admin | Semua, termasuk akun dan pengaturan | `requireAdmin` |

## Temuan dan perbaikan

| No | Temuan | Dampak | Status |
| --- | --- | --- | --- |
| 1 | Judul tulisan berisi `</script>` bisa keluar dari blok JSON-LD dan menjalankan skrip di halaman pembaca (XSS tersimpan oleh penulis) | Tinggi | Diperbaiki: karakter `<` di JSON-LD di-escape. Ada unit test. |
| 2 | Batas percobaan login hanya per IP, sedangkan header IP bisa dipalsukan bila server diakses langsung tanpa Cloudflare | Sedang | Diperbaiki: batas juga per akun (5 kali per 15 menit). |
| 3 | Satu halaman admin (`/admin/tentang/`) tidak memeriksa login sendiri; aman hanya karena layout | Rendah | Diperbaiki: pengecekan login di halaman itu sendiri. |
| 4 | Parameter `next` setelah login hanya dicek awalannya | Rendah | Diperbaiki: hanya alamat `/admin/...` dengan karakter aman yang diterima. |
| 5 | Keterangan foto menerima HTML terbatas | Rendah | Diperbaiki: keterangan foto kini teks biasa, data lama dikonversi otomatis (migrasi v2). |
| 6 | Isi editor dirender di server dengan Tiptap yang menarik dependensi besar (`happy-dom`) | Ketersediaan | Diperbaiki: server hanya menyaring HTML dengan daftar tag yang diizinkan. |
| 7 | Pesan galat teknis dari server tampil ke pengguna | Rendah (bocoran info) | Diperbaiki: pengguna melihat pesan umum, detail dicatat di log server. |
| 8 | Komentar bisa dibanjiri dengan memalsukan IP | Rendah | Diperbaiki: batas total 60 komentar baru per jam, di samping batas 5 per IP per 10 menit. |
| 9 | Tulisan bisa memakai alamat yang bentrok dengan halaman situs (`admin`, `cari`, `tag`, dan lainnya) sehingga tidak bisa dibuka | Rendah | Diperbaiki: alamat tersebut otomatis diberi akhiran `-tulisan`. |
| 10 | Belum ada Content-Security-Policy | Pengerasan | Ditambahkan: CSP (skrip hanya dari situs sendiri, tanpa `object`, `base-uri` dan `form-action` dikunci), `Permissions-Policy`, `Cross-Origin-Opener-Policy`. |

## Yang diperiksa dan aman

- **SQL injection:** semua kueri memakai parameter. Pencarian FTS hanya menerima huruf dan angka yang diberi tanda kutip.
- **XSS:** isi tulisan disaring `sanitize-html` saat disimpan (tanpa `script`, `style`, atribut `on*`, dan tautan `javascript:`). Komentar, judul, nama, dan tag selalu dirender sebagai teks oleh React.
- **Unggahan:** hanya gambar yang bisa dibaca `sharp` (SVG ditolak, diuji), metadata EXIF dibuang, nama file diacak, ukuran maksimal 12 MB, unggahan dari situs lain ditolak (diuji).
- **Path traversal di `/uploads/`:** diuji dengan `%2e%2e`, `..%2f`, dan `../`, semuanya 404.
- **Sesi:** token 256 bit, hanya hash yang disimpan, cookie `httpOnly`, `SameSite=Lax`, `Secure` di produksi. Ganti password mencabut semua sesi. Peran dibaca ulang dari database di setiap permintaan.
- **Password:** scrypt (N=16384) dengan salt acak, perbandingan waktu konstan, dan hash dummy untuk email yang tidak terdaftar.
- **CSRF:** server action Next.js memeriksa Origin. Endpoint unggah memeriksa Origin, ditambah cookie `SameSite=Lax`.
- **Hak akses:** penulis tidak bisa membuka tulisan orang lain atau menu admin (diuji di browser).
- **Dependensi:** `npm audit --omit=dev` menemukan 0 kerentanan.

## Risiko yang diterima

- **Penguncian akun:** lima tebakan salah mengunci akun selama 15 menit. Orang lain bisa sengaja mengunci akun admin untuk sementara. Ini ditukar dengan perlindungan dari tebak-tebakan password.
- **`script-src 'unsafe-inline'`:** diperlukan Next.js untuk skrip inline-nya. CSP tetap membatasi sumber skrip dari luar.
- **Akses langsung ke IP server:** origin bisa dihubungi tanpa Cloudflare, sehingga header IP pengunjung bisa dipalsukan. Dampaknya terbatas pada statistik dan batas komentar per IP. Bisa ditutup dengan firewall yang hanya menerima IP Cloudflare di port 443, tapi itu memengaruhi situs lain di VPS yang sama.
