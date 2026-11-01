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

## 2. Pastikan versi Node

Aplikasi butuh Node 20.9 atau lebih baru. Di aaPanel **Website → Node.js Project → Node version manager**, pastikan v24 terpasang (sudah dipakai project lain). Cek versi yang aktif di terminal:

```bash
node -v
```

Kalau masih v20, itu juga cukup. Kalau lebih rendah, pakai v24 dari aaPanel: `export PATH=/www/server/nodejs/v24.13.0/bin:$PATH` (sesuaikan nomor versinya dengan yang terpasang).

## 3. Pasang dan build

```bash
cd /opt/qiran-blog/web && cp .env.example .env.production && nano .env.production
```

Isi `.env.production`:

```
SITE_URL=https://qiran.my.id
DATA_DIR=/opt/qiran-blog/data/web
PORT=3100
```

Lalu:

```bash
cd /opt/qiran-blog/web && npm ci && npm run build
```

Build butuh sekitar 1 sampai 3 menit.

## 4. Buat akun

Akun admin untuk kakak, lalu satu akun penulis untuk tiap adik. Password acak akan tampil sekali, jadi catat dan sampaikan langsung.

```bash
cd /opt/qiran-blog/web && npm run user -- add --email emailkamu@gmail.com --name "Farhan" --role admin
```

```bash
cd /opt/qiran-blog/web && npm run user -- add --email emailqirana@gmail.com --name "Qirana"
```

```bash
cd /opt/qiran-blog/web && npm run user -- add --email emailqirani@gmail.com --name "Qirani"
```

Akun juga bisa ditambah nanti dari panel, di menu **Pengguna**.

## 5. Pindahkan isi dari Ghost

1. Di Ghost: **Settings → Import/Export → Export** → **Export content**. File `.json` akan terunduh.
2. Unggah file itu ke VPS lewat aaPanel **Files**, ke `/opt/qiran-blog/ghost-export.json`.
3. Impor. Folder konten Ghost ikut disebut supaya gambar ikut tersalin:

```bash
cd /opt/qiran-blog/web && npm run import:ghost -- /opt/qiran-blog/ghost-export.json /opt/qiran-blog/data/ghost --author emailkamu@gmail.com
```

Semua tulisan akan tercatat atas nama akun yang disebut di `--author`. Kalau ada tulisan yang memang milik Qirana atau Qirani, admin bisa memindahkannya nanti. Impor aman dijalankan ulang, karena tulisan yang alamatnya sudah ada akan dilewati.

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
cd /opt/qiran-blog/web && BACKUP_DIR=/www/backup/qiran ./scripts/backup.sh
```

Isinya salinan database dan semua gambar. Backup lebih dari 14 hari dihapus otomatis. Kalau mau jadwal harian, tambahkan perintah yang sama di aaPanel **Cron** (Shell Script).

## 10. Update aplikasi nanti

```bash
cd /opt/qiran-blog && git pull && cd web && npm ci && npm run build
```

Lalu klik **Restart** pada project `qiran` di aaPanel Node.js Project.

---

## Kalau ada masalah

| Gejala | Cek |
| --- | --- |
| 502 Bad Gateway | Aplikasi belum jalan. Lihat log project di aaPanel, atau jalankan `cd /opt/qiran-blog/web && npm run start` untuk melihat error. |
| Tidak bisa login, kembali ke halaman masuk | Buka lewat `https://qiran.my.id`, bukan lewat IP atau `http://`. Cookie login hanya dikirim lewat https. Pastikan juga Proxy Project mengirim header `Host $host`. |
| Upload gambar gagal | Folder `DATA_DIR` harus bisa ditulis oleh user yang menjalankan project. |
| Gambar lama dari Ghost tidak muncul | Jalankan ulang impor dengan argumen folder konten Ghost (`/opt/qiran-blog/data/ghost`). |
