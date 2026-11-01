#!/usr/bin/env bash
# Update aplikasi dengan aman:
#   ./scripts/deploy.sh
# Kode baru di-build di folder terpisah (.next-new). Situs lama tetap jalan selama build.
# Kalau build gagal, situs tidak tersentuh. Kalau berhasil, folder ditukar, lalu tinggal Restart di aaPanel.
set -euo pipefail
cd "$(dirname "$0")/.."

NODE_BIN="${NODE_BIN:-/www/server/nodejs/v24.13.0/bin}"
[ -d "$NODE_BIN" ] && export PATH="$NODE_BIN:$PATH"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node $(node -v) terlalu lama. Butuh Node 22+. Atur NODE_BIN ke folder bin Node v24." >&2
  exit 1
fi
echo "==> Node $(node -v)"

LOCK_BEFORE="$(sha1sum package-lock.json | cut -d' ' -f1)"
echo "==> Ambil kode terbaru"
git pull --ff-only

if [ ! -d node_modules ] || [ "$LOCK_BEFORE" != "$(sha1sum package-lock.json | cut -d' ' -f1)" ]; then
  echo "==> Daftar paket berubah, pasang ulang"
  npm ci --include=dev --no-audit --no-fund
fi

echo "==> Build di folder sementara (situs tetap jalan)"
# File tipe dari build lama bisa menyebut halaman yang sudah dihapus dan menggagalkan pemeriksaan TypeScript.
# Folder itu tidak dipakai saat aplikasi berjalan, jadi aman dihapus.
rm -rf .next-new .next/types
if ! NEXT_DIST_DIR=.next-new npm run build; then
  rm -rf .next-new
  echo "" >&2
  echo "BUILD GAGAL. Situs tidak diubah dan tetap memakai versi sebelumnya." >&2
  exit 1
fi

echo "==> Tukar ke build baru"
rm -rf .next-old
[ -d .next ] && mv .next .next-old
mv .next-new .next

# Aplikasi berjalan sebagai user www (Node Project aaPanel)
if id www >/dev/null 2>&1; then
  DATA_DIR_VALUE="$(grep -E '^DATA_DIR=' .env.production 2>/dev/null | cut -d= -f2- || true)"
  chown -R www:www .next ${DATA_DIR_VALUE:+"$DATA_DIR_VALUE"}
fi

echo ""
echo "Selesai. Klik Restart pada project 'qiran' di aaPanel (Website > Node.js Project)."
echo "Kalau ada masalah setelah restart, kembali ke versi sebelumnya: rm -rf .next && mv .next-old .next, lalu Restart."
