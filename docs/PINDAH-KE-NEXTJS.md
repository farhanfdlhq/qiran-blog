# Pindah dari Ghost ke aplikasi sendiri (Next.js)

Panduan ini memindahkan qiran.my.id dari Ghost ke aplikasi di folder `web/` tanpa mematikan situs. Ghost tetap jalan sampai aplikasi baru selesai dicek, lalu tinggal ganti tujuan proxy.

Ringkasan:

| | Ghost (lama) | Aplikasi sendiri (baru) |
| --- | --- | --- |
| Jalan di | Docker (Ghost + MySQL), port 2368 | Node.js, port 3100 |
| Database | MySQL | Satu file SQLite |
| RAM | Cek di menu Docker aaPanel | Sekitar 200 MB (diukur saat uji) |
| Data | `/opt/qiran-blog/data/ghost`, `/opt/qiran-blog/data/mysql` | `/opt/qiran-blog/data/web` |

Semua perintah dijalankan di Terminal aaPanel.

---

## 1. Ambil kode

```bash
cd /opt/qiran-blog && git fetch origin nextjs-blog && git checkout nextjs-blog
```

Ghost tidak terganggu, karena file Ghost tetap ada di branch ini. Aplikasi baru ada di folder `web/`.

## 2. Pakai Node v24

Aplikasi butuh **Node 22 atau lebih baru**. Node bawaan terminal VPS masih v20, jadi pakai v24 yang sudah dipasang aaPanel (versi yang sama dengan project Node lain). Jalankan ini setiap kali membuka terminal baru untuk mengurus blog:

```bash
export PATH=/www/server/nodejs/v24.13.0/bin:$PATH && node -v
```

Hasilnya harus `v24.13.0`. Kalau folder itu tidak ada, lihat nomor versi yang terpasang dengan `ls /www/server/nodejs/`.

## 3. Pasang dan build

`.env.production` cukup disalin dari contoh. Isinya sudah benar untuk qiran.my.id:

```bash
cd /opt/qiran-blog/web && cp -n .env.example .env.production && cat .env.production
```

Pasang ulang paket dengan Node v24. Ini wajib kalau sebelumnya sempat memakai Node v20, karena modul SQLite harus cocok dengan versi Node:

```bash
cd /opt/qiran-blog/web && rm -rf node_modules .next && npm ci && npm run build
```

Tidak boleh ada peringatan `EBADENGINE`. Build butuh sekitar 1 sampai 3 menit.

## 4. Buat akun

Akun admin dulu. Password acak akan tampil sekali, jadi catat.

```bash
cd /opt/qiran-blog/web && npm run user -- add --email admin@qiran.my.id --name "Farhan" --role admin
```

Lalu satu akun penulis untuk tiap adik:

```bash
cd /opt/qiran-blog/web && npm run user -- add --email emailqirana@gmail.com --name "Qirana"
```

```bash
cd /opt/qiran-blog/web && npm run user -- add --email emailqirani@gmail.com --name "Qirani"
```

Cek daftar akun:

```bash
cd /opt/qiran-blog/web && npm run user -- list
```

Akun juga bisa ditambah nanti dari panel, di menu **Pengguna**.

## 5. Isi tulisan contoh

Satu perintah untuk mengisi 6 tulisan contoh, halaman Tentang, tag, dan fotonya. Isinya sama dengan yang sekarang tampil di Ghost:

```bash
cd /opt/qiran-blog/web && npm run seed
```

Semua tulisan tercatat atas nama admin pertama. Pakai `npm run seed -- --author email@...` untuk akun lain. Perintah ini aman dijalankan ulang, karena tulisan yang sudah ada akan dilewati.

Kalau di Ghost sudah ada tulisan baru yang ingin ikut dipindahkan, pakai impor dari ekspor Ghost (Settings → Import/Export → Export content):

```bash
cd /opt/qiran-blog/web && npm run import:ghost -- /opt/qiran-blog/ghost-export.json /opt/qiran-blog/data/ghost
```

## 6. Jalankan aplikasi

Di aaPanel **Website → Node.js Project → Add Project**:

| Kolom | Isi |
| --- | --- |
| Project directory | `/opt/qiran-blog/web` |
| Project name | `qiran` |
| Run options / command | `npm run start` |
| Port | `3100` |
| Node version | v24 |
| Run user | `root` (atau `www`, lihat catatan di bawah) |

Jangan isi domain di sini. Domain tetap diatur lewat Proxy Project yang sudah ada.

Kalau memilih user `www`, berikan izin tulis ke folder data:

```bash
mkdir -p /opt/qiran-blog/data/web && chown -R www:www /opt/qiran-blog/data/web
```

Cek bahwa aplikasi sudah jalan:

```bash
curl -s http://127.0.0.1:3100/ | grep -o "<title>[^<]*"
```

Hasilnya `<title>qiran`. Situs publik masih Ghost, jadi pengunjung belum melihat perubahan apa pun.

## 7. Ganti tujuan proxy

Di aaPanel **Website → Proxy Project → qiran.my.id → Modify → URL Proxy**, ubah target dari `http://127.0.0.1:2368` menjadi `http://127.0.0.1:3100`, lalu simpan.

aaPanel bisa menulis ulang config Nginx saat pengaturan proxy diubah. Jalankan lagi perintah header ini (aman diulang):

```bash
F=/www/server/panel/vhost/nginx/qiran.my.id.conf; cp $F $F.bak; grep -q "X-Forwarded-Proto" $F || sed -i 's#^\(\s*\)proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;#&\n\1proxy_set_header X-Forwarded-Proto $scheme;#' $F; nginx -t && nginx -s reload && grep -n "proxy_pass\|Forwarded" $F
```

Pastikan baris `proxy_pass` sekarang menunjuk ke `127.0.0.1:3100`.

Buka https://qiran.my.id, lalu https://qiran.my.id/admin/ dan masuk dengan akun admin.

## 8. Matikan Ghost

Setelah yakin semuanya jalan:

```bash
cd /opt/qiran-blog && docker compose down
```

Data Ghost tidak dihapus (folder `data/ghost` dan `data/mysql` tetap ada), jadi masih bisa kembali kapan saja.

**Kembali ke Ghost (kalau perlu):** jalankan `cd /opt/qiran-blog && docker compose up -d`, lalu ganti target proxy kembali ke `http://127.0.0.1:2368`.

## 9. Backup

```bash
export PATH=/www/server/nodejs/v24.13.0/bin:$PATH && cd /opt/qiran-blog/web && BACKUP_DIR=/www/backup/qiran ./scripts/backup.sh
```

Isinya salinan database dan semua gambar. Backup lebih dari 14 hari dihapus otomatis. Kalau mau jadwal harian, tambahkan perintah yang sama di aaPanel **Cron** (Shell Script).

## 10. Update aplikasi nanti

```bash
cd /opt/qiran-blog/web && ./scripts/deploy.sh
```

Satu perintah ini mengerjakan semuanya:

1. Mengambil kode terbaru dari GitHub.
2. Mem-build versi baru di folder terpisah, jadi situs tetap jalan selama build. Kalau build gagal, situs tidak diubah.
3. Menukar ke build baru dan me-restart aplikasi secara otomatis, dengan user yang sama seperti sebelumnya.
4. Mengecek situs. Kalau tidak hidup dalam 60 detik, otomatis kembali ke versi sebelumnya.

Kalau skrip tidak menemukan cara restart otomatis, skrip memberi tahu, dan kamu cukup klik **Restart** pada project `qiran` di aaPanel.

---

## Kalau ada masalah

| Gejala | Cek |
| --- | --- |
| 502 Bad Gateway | Aplikasi belum jalan. Lihat log project di aaPanel, atau jalankan `cd /opt/qiran-blog/web && npm run start` untuk melihat error. |
| Tidak bisa login, kembali ke halaman masuk | Buka lewat `https://qiran.my.id`, bukan lewat IP atau `http://`. Cookie login hanya dikirim lewat https. Pastikan juga Proxy Project mengirim header `Host $host`. |
| Upload gambar gagal | Folder `DATA_DIR` harus bisa ditulis oleh user yang menjalankan project. |
| Pratinjau WhatsApp/Facebook memakai gambar umum, bukan kartu tulisan | Server perlu bisa mengunduh font dari `api.fontshare.com` sekali (disimpan di `DATA_DIR/cache/fonts`). Lihat log project untuk baris `[og]`. |
| Pratinjau di WhatsApp masih versi lama | WhatsApp menyimpan pratinjau. Tes dengan menambah `?v=2` di ujung tautan, atau perbarui lewat [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) (klik **Scrape Again**). |
| Gambar lama dari Ghost tidak muncul | Jalankan ulang impor dengan argumen folder konten Ghost (`/opt/qiran-blog/data/ghost`). |
