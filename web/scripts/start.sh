#!/bin/sh
# Menjalankan aplikasi. Port diambil dari variabel PORT, lalu dari .env.production, lalu 3100.
# Next tidak membaca PORT dari file .env, dan skrip Node Project aaPanel tidak mengirim PORT.
cd "$(dirname "$0")/.." || exit 1
if [ -z "$PORT" ] && [ -f .env.production ]; then
  PORT=$(sed -n 's/^PORT=\([0-9][0-9]*\).*/\1/p' .env.production | tail -n 1)
fi
exec node --max-old-space-size=192 node_modules/next/dist/bin/next start -p "${PORT:-3100}"
