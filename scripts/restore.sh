#!/usr/bin/env bash
# Pulihkan dari backup. HATI-HATI: menimpa database & konten yang sekarang.
# Pemakaian:  ./scripts/restore.sh backups/qiran-20261101-030000
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:?Tulis folder backup, contoh: ./scripts/restore.sh backups/qiran-20261101-030000}"
[ -f "$SRC/database.sql.gz" ] && [ -f "$SRC/content.tar.gz" ] || { echo "Folder backup tidak lengkap: $SRC"; exit 1; }

read -r -p "Database dan konten sekarang akan DITIMPA dengan $SRC. Ketik 'pulihkan' untuk lanjut: " ok
[ "$ok" = "pulihkan" ] || { echo "Dibatalkan."; exit 1; }

echo "==> Backup kondisi sekarang dulu, untuk jaga-jaga"
./scripts/backup.sh

docker compose stop ghost

echo "==> Pulihkan database"
gunzip -c "$SRC/database.sql.gz" | docker exec -i qiran-db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ghost'

echo "==> Pulihkan konten"
mv data/ghost "data/ghost.before-restore-$(date +%Y%m%d-%H%M%S)"
tar -xzf "$SRC/content.tar.gz" -C data

docker compose up -d
echo "==> Selesai. Folder konten lama disimpan sebagai data/ghost.before-restore-*"
