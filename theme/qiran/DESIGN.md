# Desain tema qiran

Catatan keputusan desain dan alasannya. Arah desain dipilih pemilik dari tiga opsi yang dibagikan taste-skill (seed 1433479262), lalu dicek dengan aturan anti-slop.

**Design Read:** blog tulisan pribadi untuk pembaca umum dan teman sekolah, bahasa visual editorial tipografi, dial **ENERGY 2 / RHYTHM 3 / MOTION 2**.

**Ide:** di situs ini, *qiran*, bagian tengah dari nama Qirana dan Qirani, menjadi nama besar yang menutup setiap halaman, sementara tiap tulisan ditandai penulisnya dan bisa disaring per penulis. Ide ini tidak bisa dipakai blog lain.

**Satu hal yang bisa dicoba pembaca:** tombol saring Semua / Qirana / Qirani di daftar tulisan. Tombolnya hanya muncul kalau penulisnya lebih dari satu.

## Keputusan dan alasannya

| Keputusan | Alasan |
| --- | --- |
| Arah "Type and nothing else" | Isi blog ini tulisan, jadi tipografi yang paling jujur membawanya. Gambar datang dari tulisan itu sendiri, bukan dari stok |
| Satu huruf, Sentient | Serif lembut yang terasa seperti buku, cocok untuk esai dan cerita dan tetap ramah untuk penulis muda |
| Lima ukuran huruf | Kontras skala menggantikan ornamen. Judul besar, sisanya kecil |
| Palet tulang + hijau-hitam + giok | Satu dasar, satu tinta, satu aksen. Giok hanya untuk tombol utama, blok tulisan terbaru, dan stabilo |
| Mode terang sebagai bawaan, dengan tombol gelap | Bacaan panjang lebih nyaman di terang. Mode otomatis mengikuti perangkat pembaca, dan pilihan pembaca disimpan |
| Sumbu 42% | Judul, navigasi, dan kolom isi artikel menggantung dari garis yang sama, jadi ruang kosong di beranda terbaca disengaja |
| Daftar tulisan berupa baris, bukan kartu | Judul adalah isinya. Baris dua ujung (judul kiri, tanggal kanan) lebih cepat dibaca daripada grid kartu identik |
| Pratinjau di kanan daftar | Mengisi separuh layar yang kosong dengan gambar dan ringkasan tulisan yang sedang disorot |
| Footer dibalik, nama selebar layar | Penutup yang dirancang, dan tempat nama *qiran* tampil paling besar |
| Tombol bulat penuh, satu bentuk | Satu keputusan untuk semua tombol, tidak ada radius setengah-setengah |
| Teks tanpa ikon di navigasi | "Cari", "Gelap", "Menu" lebih jelas daripada ikon, dan konsisten dengan arah tipografi |

## Gerak

- Judul naik dari balik garisnya sendiri saat halaman dibuka (gerakan khas).
- Bagian lain muncul berurutan saat masuk layar.
- Gambar tulisan terbaru di beranda mengecil pelan saat di-scroll.
- Semua gerak mati kalau pembaca memilih *reduce motion* di perangkatnya, dan konten tetap tampil walau JavaScript gagal dimuat.

## Yang sengaja tidak dipakai

Gradien, bayangan pada elemen diam, efek kaca/blur, label kecil huruf kapital di atas judul, emoji, ikon dekoratif, grid kartu, garis tipis pemisah, dan foto stok sebagai pengganti foto penulis.

## Hasil pemeriksaan otomatis (taste-skill inspect.mjs)

Sisa temuan yang dipertahankan dengan alasan:

- **few-pictures**: gambar di blog ini datang dari tulisan penulisnya. Tema tidak menambahkan foto stok. Makin banyak tulisan bergambar, makin banyak gambar di beranda.
- **hero-void / blank-gap di layar pertama**: ruang kosong di atas judul beranda adalah bagian dari komposisi yang dipilih ("Void, then statement on axis"), satu-satunya jeda di halaman.
- **no-footage**: tidak ada video yang jujur untuk subjek ini.
- **headline-lines @390px**: judul tulisan ditulis penulisnya sendiri. Tema mengecilkan judul sampai 80% agar muat dua baris, tapi judul yang sangat panjang tetap bisa jadi tiga baris di HP.
