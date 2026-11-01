#!/usr/bin/env bash
# Update aplikasi dengan aman, termasuk restart:
#   ./scripts/deploy.sh
# 1. Kode baru di-build di folder terpisah (.next-new). Situs lama tetap jalan selama build.
# 2. Kalau build gagal, situs tidak tersentuh.
# 3. Kalau berhasil, folder ditukar dan aplikasi di-restart otomatis.
# 4. Setelah restart, situs dicek. Kalau tidak hidup, otomatis kembali ke versi sebelumnya.
# Pengaturan opsional: APP_NAME (nama project di aaPanel, bawaan: qiran), NODE_BIN.
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

# git pull bisa mengubah file skrip ini sendiri. Supaya versi terbaru yang dijalankan,
# skrip memuat ulang dirinya setelah pull. Dibungkus fungsi agar bash membaca semuanya sebelum pull.
pull_and_reexec() {
  if [ "${DEPLOY_PULLED:-}" != "1" ]; then
    export LOCK_BEFORE="$(sha1sum package-lock.json | cut -d' ' -f1)"
    echo "==> Ambil kode terbaru"
    git pull --ff-only
    export DEPLOY_PULLED=1
    exec bash "$0" "$@"
  fi
}
pull_and_reexec "$@"

if [ ! -d node_modules ] || [ "${LOCK_BEFORE:-}" != "$(sha1sum package-lock.json | cut -d' ' -f1)" ]; then
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
DATA_DIR_VALUE="$(grep -E '^DATA_DIR=' .env.production 2>/dev/null | cut -d= -f2- || true)"
if id www >/dev/null 2>&1; then
  chown -R www:www .next ${DATA_DIR_VALUE:+"$DATA_DIR_VALUE"}
fi

APP_NAME="${APP_NAME:-qiran}"
PORT="$(grep -E '^PORT=' .env.production 2>/dev/null | cut -d= -f2- || true)"
PORT="${PORT:-3100}"
AAPANEL_SCRIPT="/www/server/nodejs/vhost/scripts/${APP_NAME}.sh"
AAPANEL_PID="/www/server/nodejs/vhost/pids/${APP_NAME}.pid"

# PID proses aplikasi: dicari lewat port (ss, lsof, fuser), lalu lewat /proc
# (proses "next start"/"next-server" yang berjalan dari folder ini).
APP_DIR="$(pwd -P)"
# Skrip ini dan semua proses induknya tidak boleh ikut dihentikan
SELF_CHAIN=" $$ "
_p=$PPID
while [ "${_p:-1}" -gt 1 ]; do SELF_CHAIN="$SELF_CHAIN$_p "; _p="$(awk '{print $4}' "/proc/$_p/stat" 2>/dev/null || echo 1)"; done
port_pids() {
  {
    command -v ss >/dev/null 2>&1 && ss -ltnpH "sport = :${PORT}" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2
    command -v lsof >/dev/null 2>&1 && lsof -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null
    command -v fuser >/dev/null 2>&1 && fuser -n tcp "${PORT}" 2>/dev/null | tr ' ' '\n'
    for d in /proc/[0-9]*; do
      pid="${d#/proc/}"
      case "$SELF_CHAIN" in *" $pid "*) continue;; esac
      [ "$(readlink "$d/cwd" 2>/dev/null)" = "$APP_DIR" ] || continue
      tr '\0' ' ' < "$d/cmdline" 2>/dev/null | grep -qE 'next start|next-server|next/dist/bin/next' && echo "$pid"
    done
  } 2>/dev/null | grep -E '^[0-9]+$' | sort -u
}

port_in_use() {
  curl -s -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/" 2>/dev/null
}

stop_app() {
  local pids
  pids="$( { [ -f "$AAPANEL_PID" ] && cat "$AAPANEL_PID"; port_pids; } 2>/dev/null | grep -E '^[0-9]+$' | sort -u | tr '\n' ' ')"
  # Hentikan proses beserta anak-anaknya dengan sopan, lalu paksa kalau perlu
  for pid in $pids; do
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  for _ in $(seq 1 20); do
    port_in_use || return 0
    sleep 0.5
  done
  for pid in $pids $(port_pids); do kill -9 "$pid" 2>/dev/null || true; done
  sleep 1
  if port_in_use; then
    echo "Port ${PORT} masih dipakai proses lain dan tidak bisa dihentikan." >&2
    return 1
  fi
}

restart_app() {
  if command -v pm2 >/dev/null 2>&1 && pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    echo "==> Restart lewat PM2 ($APP_NAME)"
    pm2 reload "$APP_NAME" --update-env >/dev/null
    return 0
  fi
  if [ -f "$AAPANEL_SCRIPT" ]; then
    # Jalankan dengan user yang sama seperti sekarang (biasanya www), kecuali skrip aaPanel sudah mengurusnya sendiri
    local run_user="" pid
    pid="$(port_pids | head -1)"
    [ -n "$pid" ] && run_user="$(stat -c %U "/proc/$pid" 2>/dev/null || true)"
    [ -z "$run_user" ] && id www >/dev/null 2>&1 && run_user="www"
    echo "==> Restart lewat skrip aaPanel ($AAPANEL_SCRIPT), user: ${run_user:-root}"
    stop_app || return 2
    if [ -n "$run_user" ] && [ "$run_user" != "root" ] && ! grep -qE '(^|[^a-z])(su|sudo|runuser)[[:space:]]' "$AAPANEL_SCRIPT" && command -v runuser >/dev/null 2>&1; then
      runuser -u "$run_user" -- bash "$AAPANEL_SCRIPT" >/dev/null 2>&1 &
    else
      bash "$AAPANEL_SCRIPT" >/dev/null 2>&1 &
    fi
    return 0
  fi
  return 1
}

# Tunggu sampai situs menjawab dengan benar (maks 60 detik)
wait_healthy() {
  for _ in $(seq 1 60); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/" || true)" = "200" ]; then return 0; fi
    sleep 1
  done
  return 1
}

set +e
restart_app
RESTART=$?
set -e
if [ "$RESTART" = "2" ]; then
  echo "Restart dibatalkan. Build baru sudah siap; klik Restart pada project '${APP_NAME}' di aaPanel." >&2
  exit 1
elif [ "$RESTART" = "0" ]; then
  echo "==> Menunggu situs hidup lagi"
  if wait_healthy; then
    # Rapikan lagi pemilik folder data, untuk berjaga-jaga
    if id www >/dev/null 2>&1 && [ -n "${DATA_DIR_VALUE:-}" ]; then chown -R www:www "$DATA_DIR_VALUE" 2>/dev/null || true; fi
    echo ""
    echo "Selesai. Versi baru sudah jalan di port ${PORT}."
  else
    echo "" >&2
    echo "Situs tidak menjawab setelah restart. Kembali ke versi sebelumnya..." >&2
    if [ -d .next-old ]; then
      rm -rf .next-failed && mv .next .next-failed && mv .next-old .next
      [ -n "$(id -u www 2>/dev/null)" ] && chown -R www:www .next
      restart_app >/dev/null || true
      if wait_healthy; then
        echo "Versi sebelumnya sudah jalan lagi. Build yang gagal disimpan di .next-failed untuk diperiksa." >&2
      else
        echo "Versi sebelumnya juga tidak jalan. Cek log project '${APP_NAME}' di aaPanel." >&2
      fi
    fi
    exit 1
  fi
else
  echo ""
  echo "Build baru sudah siap, tapi cara restart otomatis tidak ditemukan."
  echo "Klik Restart pada project '${APP_NAME}' di aaPanel (Website > Node.js Project), lalu kirim hasil perintah ini ke pengembang:"
  echo "  ls /www/server/nodejs/vhost/scripts/ /www/server/nodejs/vhost/pids/; pm2 list 2>/dev/null | head"
fi
