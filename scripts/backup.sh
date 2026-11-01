#!/usr/bin/env bash
# Backup database + folder konten Ghost (gambar, tema, pengaturan).
# Pemakaian:  ./scripts/backup.sh            (simpan ke ./backups)
#             BACKUP_DIR=/www/backup/qiran ./scripts/backup.sh
# Backup lebih dari KEEP_DAYS hari (bawaan 14) dihapus otomatis.
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/qiran-$STAMP"

# Backup berisi data pribadi (email akun & pembaca), jadi hanya root yang boleh membaca
umask 077
mkdir -p "$TARGET"

set -a; . ./.env; set +a

echo "==> Dump database"
docker exec qiran-db sh -c 'exec mysqldump --single-transaction --quick --no-tablespaces -uroot -p"$MYSQL_ROOT_PASSWORD" ghost' \
    | gzip > "$TARGET/database.sql.gz"

echo "==> Arsip folder konten"
tar -czf "$TARGET/content.tar.gz" -C data ghost

echo "==> Hapus backup lebih dari $KEEP_DAYS hari"
find "$BACKUP_DIR" -maxdepth 1 -type d -name 'qiran-*' -mtime +"$KEEP_DAYS" -exec rm -rf {} +

du -sh "$TARGET"
echo "==> Backup tersimpan di $TARGET"
