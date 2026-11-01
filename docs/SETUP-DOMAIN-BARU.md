# Setup blog di domain baru, dari nol sampai online

Ringkasan semua langkah infrastruktur yang dipakai untuk qiran.my.id: VPS, domain, Cloudflare, DNS, SSL, aaPanel, sampai aplikasinya jalan. Dipakai untuk membuat blog serupa di domain lain.

Isi dulu tabel ini, lalu ganti setiap `[...]` di bawah dengan nilainya.

| Isian | qiran.my.id (contoh) | Domain baru |
| --- | --- | --- |
| `[DOMAIN]` | `qiran.my.id` | |
| `[IP_VPS]` | IP publik VPS (lihat aaPanel → Home) | sama, kalau VPS-nya sama |
| `[NAMA]` (folder, project aaPanel) | `qiran` | misal `kembar` |
| `[PORT]` | `3100` | port lain, misal `3200` |
| `[REPO]` | `github.com/farhanfdlhq/qiran-blog` | repo baru |
| Registrar | indo.domains | |

Semua perintah dijalankan di **Terminal aaPanel** sebagai root.

---

## 1. Cek kapasitas VPS

VPS yang dipakai qiran: aaPanel 8, 2 core, RAM 7,75 GB, disk sisa sekitar 63 GB, Docker tersedia, dan sudah ada beberapa situs lain. Satu blog Next.js memakai RAM sekitar 140 sampai 240 MB dan disk kurang dari 1 GB (di luar gambar).

```bash
free -h && df -h / && nproc
```

Pastikan port untuk blog baru belum dipakai. Kalau perintah ini tidak menampilkan apa-apa, port masih kosong:

```bash
ss -ltnp | grep ":[PORT] "
```

Cek Node v24 yang dipasang aaPanel (aplikasi butuh Node 22 atau lebih baru; Node bawaan terminal masih v20):

```bash
ls /www/server/nodejs/
```

## 2. Domain → Cloudflare

Kerjakan ini paling awal, karena pergantian nameserver butuh 1 sampai 24 jam.

1. Cloudflare: **Domains → Onboard a domain** → isi `[DOMAIN]` → paket **Free** → **Continue to activation**. Catat 2 nameserver yang diberikan (bentuknya `nama.ns.cloudflare.com`).
2. Registrar (indo.domains): **[DOMAIN] → Kelola → Nameserver**, ganti dengan 2 nameserver Cloudflare tadi. Bagian DNS Records di registrar biarkan kosong, karena tidak dipakai lagi.
3. Lewati saran Cloudflare soal **DNSSEC** dan **"Only allow Cloudflare IP addresses"**. Di VPS ada situs lain, jadi firewall jangan diubah.

Cek apakah nameserver sudah pindah:

```bash
dig +short NS [DOMAIN] @8.8.8.8
```

Kalau hasilnya sudah `...ns.cloudflare.com`, lanjut. Cloudflare juga mengirim email saat domain berstatus **Active**.

## 3. DNS records

Cloudflare → `[DOMAIN]` → **DNS → Records → Add record**:

| Type | Name | Isi | Proxy status |
| --- | --- | --- | --- |
| `A` | `@` | `[IP_VPS]` | **DNS only** (abu-abu) dulu |
| `CNAME` | `www` | `[DOMAIN]` | **DNS only** dulu |

Biarkan abu-abu sampai SSL di aaPanel terpasang (langkah 5). Setelah itu baru dinyalakan jadi oranye.

## 4. Kode dan aplikasi di VPS

**Ambil kode:**

```bash
cd /opt && git clone https://[REPO].git [NAMA]-blog
```

**Pakai Node v24** (ulangi setiap membuka terminal baru):

```bash
export PATH=/www/server/nodejs/v24.13.0/bin:$PATH && node -v
```

**Isi konfigurasi.** Salin contoh, lalu ubah `SITE_URL`, `DATA_DIR`, dan `PORT`:

```bash
cd /opt/[NAMA]-blog/web && cp -n .env.example .env.production && nano .env.production
```

Isinya:

```
SITE_URL=https://[DOMAIN]
DATA_DIR=/opt/[NAMA]-blog/data/web
PORT=[PORT]
```

Simpan dengan Ctrl+O, Enter, lalu keluar dengan Ctrl+X.

**Pasang dan build:**

```bash
cd /opt/[NAMA]-blog/web && npm ci && npm run build
```

Tidak boleh ada peringatan `EBADENGINE`. Kalau ada, berarti Node yang dipakai masih v20.

**Folder data** harus bisa ditulis user `www`:

```bash
mkdir -p /opt/[NAMA]-blog/data/web && chown -R www:www /opt/[NAMA]-blog/data/web
```

**Akun admin.** Password acak tampil sekali, jadi langsung catat:

```bash
cd /opt/[NAMA]-blog/web && npm run user -- add --email [EMAIL_ADMIN] --name "[NAMA_ADMIN]" --role admin
```

Akun penulis bisa dibuat dengan perintah yang sama tanpa `--role admin`, atau nanti dari panel di menu **Pengguna**.

**Tulisan contoh** (opsional):

```bash
cd /opt/[NAMA]-blog/web && npm run seed
```

**Jalankan di aaPanel:** **Website → Node.js Project → Add Project**

| Kolom | Isi |
| --- | --- |
| Project directory | `/opt/[NAMA]-blog/web` |
| Project name | `[NAMA]` |
| Run options / command | `npm run start` |
| Port | `[PORT]` |
| Node version | v24 |
| Run user | `www` |

Jangan isi domain di sini. Domain diatur lewat Proxy Project di langkah berikutnya.

Cek bahwa aplikasi sudah jalan:

```bash
curl -s http://127.0.0.1:[PORT]/ | grep -o "<title>[^<]*"
```

## 5. Proxy Project dan SSL

**Buat Proxy Project:** **Website → Proxy Project → Add**

- Domain: `[DOMAIN]` dan `www.[DOMAIN]`
- Target: `http://127.0.0.1:[PORT]`

**Buat sertifikat di Cloudflare:** `[DOMAIN]` → **SSL/TLS → Origin Server → Create Certificate**

- **Generate private key and CSR with Cloudflare**, key type **RSA (2048)**
- Hostnames: `[DOMAIN]` dan `*.[DOMAIN]`
- Validity: **15 years**

Cloudflare menampilkan **Origin Certificate** dan **Private Key**. Private Key hanya muncul sekali, jadi biarkan halaman itu terbuka. Jangan screenshot kotak Private Key tanpa di-blur.

**Pasang di aaPanel:** di daftar Proxy Project, klik **Not Set** di kolom SSL baris `[DOMAIN]` → tab **Current certificate / Other certificate**:

- kotak **Key**: tempel Private Key
- kotak **Certificate (PEM)**: tempel Origin Certificate

Klik **Save**, lalu nyalakan **Force HTTPS**.

**Tambahan config Nginx.** Di aaPanel 8, Main Configuration File terkunci. Perubahan ditulis di **Modify → Config → Customized Configuration Files**:

1. Blok **server**:
   ```nginx
   client_max_body_size 20m;
   ```
2. Blok proxy **location /** (bukan blok server, karena di blok server baris ini diabaikan):
   ```nginx
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

Cek:

```bash
nginx -t && grep -rn "Forwarded-Proto\|client_max_body_size" /www/server/panel/vhost/nginx/ | grep -i [NAMA]
```

Hasil yang benar: `test is successful` dan dua baris grep. Peringatan `protocol options redefined` aman diabaikan.

## 6. Nyalakan Cloudflare

Di Cloudflare → `[DOMAIN]`:

1. **SSL/TLS → Overview → Configure**: **Full (strict)**. Jangan pakai Flexible, karena hasilnya *too many redirects*.
2. **DNS → Records**: ubah record `@` dan `www` jadi **Proxied** (awan oranye). Dengan Origin Certificate, awan oranye wajib, karena sertifikat ini hanya dipercaya Cloudflare.
3. **SSL/TLS → Edge Certificates**: nyalakan **Always Use HTTPS**.
4. **Speed → Optimization**: pastikan **Rocket Loader** mati, karena bisa merusak panel admin.

Cek dari terminal:

```bash
curl -sI https://[DOMAIN]/ | grep -iE "^HTTP|server|cf-ray"
```

Hasil yang benar: `HTTP/2 200`, `server: cloudflare`, dan ada `cf-ray`. Lalu buka `https://[DOMAIN]/admin/` dan masuk dengan akun admin.

## 7. Email (opsional)

Aplikasi blog ini tidak mengirim email. Akun dan password dibuat dari panel atau terminal, jadi bagian ini hanya perlu kalau ingin punya alamat seperti `nama@[DOMAIN]`. Pilih salah satu, karena satu domain hanya punya satu set MX.

**A. Cloudflare Email Routing** (paling mudah, diteruskan ke Gmail): **Email → Email Routing → Get started**, tambah alamat dan tujuan Gmail, klik **Add records**, lalu klik link verifikasi di Gmail.

**B. Mail Server aaPanel** (kotak surat sungguhan di VPS):

1. Cloudflare: record `A` · `mail` · `[IP_VPS]` · **DNS only**. Wajib abu-abu, karena Cloudflare tidak meneruskan email.
2. aaPanel **Mail Server → Mail Domain → Add Domain** → pilih **Manual** → domain `[DOMAIN]`, A record `mail.[DOMAIN]`.
3. Klik **DNS Record** di baris domain itu, lalu masukkan ke Cloudflare:

| Type | Name | Isi |
| --- | --- | --- |
| `MX` | `@` | `mail.[DOMAIN]`, priority `10` |
| `TXT` | `@` | `v=spf1 +a +mx -all` |
| `TXT` | `default._domainkey` | salin dengan tombol **Copy** di aaPanel, jangan diketik ulang |
| `TXT` | `_dmarc` | salin dari aaPanel, lalu ganti alamat `rua=mailto:` dengan kotak surat yang benar-benar ada |

4. **Mailboxes → Add** untuk membuat alamatnya, lalu tes dengan mengirim email dari Gmail.

Peringatan Cloudflare "origin IP partially exposed" muncul karena record `mail` tidak di-proxy. Itu tidak bisa dihindari kalau email ditangani VPS sendiri.

## 8. Update dan backup

**Update aplikasi** (pull, build, restart otomatis, rollback kalau gagal):

```bash
cd /opt/[NAMA]-blog/web && ./scripts/deploy.sh
```

**Backup** database dan gambar (simpan 14 hari). Tambahkan juga di aaPanel **Cron → Shell Script** untuk jadwal harian:

```bash
export PATH=/www/server/nodejs/v24.13.0/bin:$PATH && cd /opt/[NAMA]-blog/web && BACKUP_DIR=/www/backup/[NAMA] ./scripts/backup.sh
```

---

## Kalau ada masalah

| Gejala | Penyebab dan solusi |
| --- | --- |
| Cloudflare masih *Pending* | Nameserver belum menyebar. Tunggu sampai 24 jam, cek dengan `dig +short NS [DOMAIN] @8.8.8.8`. |
| *Too many redirects* | SSL Cloudflare masih Flexible (ganti ke Full strict), atau baris `X-Forwarded-Proto` belum ada di blok location. |
| Error 526 (invalid SSL) | Origin Certificate belum terpasang di aaPanel, atau Key dan Certificate tertukar. |
| Peringatan sertifikat di browser | Record masih abu-abu padahal memakai Origin Certificate. Nyalakan awan oranye. |
| 502 Bad Gateway | Node Project belum jalan atau port berbeda. Lihat log project di aaPanel. |
| Login kembali ke halaman masuk | Buka lewat `https://[DOMAIN]`, bukan lewat IP atau http. Cookie login hanya dikirim lewat https. |
| Upload gambar gagal | `client_max_body_size` belum ditambahkan, atau folder data belum di-`chown` ke `www`. |
| `EBADENGINE` saat `npm ci` | Node masih v20. Jalankan perintah `export PATH=...v24...` dulu, lalu `rm -rf node_modules && npm ci`. |
| Email tidak masuk (opsi B) | Record `mail` berawan oranye, atau MX mengarah ke `[DOMAIN]` dan bukan ke `mail.[DOMAIN]`. |
