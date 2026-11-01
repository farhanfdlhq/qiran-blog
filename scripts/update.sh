#!/usr/bin/env bash
# Ambil versi terbaru repo + image Ghost, lalu jalankan ulang.
# Pemakaian (di VPS, dari folder repo):  ./scripts/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Backup dulu sebelum update"
./scripts/backup.sh

echo "==> Ambil perubahan dari GitHub"
git pull --ff-only

echo "==> Ambil image Ghost & MySQL terbaru (sesuai versi di docker-compose.yml)"
docker compose pull

echo "==> Jalankan ulang"
docker compose up -d
# Ghost menyimpan template tema di cache, jadi perlu restart agar perubahan tema terbaca
docker compose restart ghost

echo "==> Selesai. Cek status:"
docker compose ps
