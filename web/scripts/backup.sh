#!/usr/bin/env bash
# Backup database SQLite + folder gambar.
#   DATA_DIR=/opt/qiran-blog/data/web BACKUP_DIR=/www/backup/qiran ./scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# Ambil DATA_DIR dari .env.production kalau belum diisi
if [ -z "${DATA_DIR:-}" ] && [ -f .env.production ]; then set -a; . ./.env.production; set +a; fi
DATA_DIR="${DATA_DIR:?Isi DATA_DIR, contoh: DATA_DIR=/opt/qiran-blog/data/web}"
BACKUP_DIR="${BACKUP_DIR:-$DATA_DIR/../backups-web}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/qiran-web-$STAMP"
umask 077
mkdir -p "$TARGET"
# Salinan database yang konsisten walau aplikasi sedang berjalan
node -e "const D=require('better-sqlite3');const db=new D(process.argv[1],{readonly:true});db.backup(process.argv[2]).then(()=>db.close())" "$DATA_DIR/qiran.sqlite" "$TARGET/qiran.sqlite"
tar -czf "$TARGET/uploads.tar.gz" -C "$DATA_DIR" uploads
find "$BACKUP_DIR" -maxdepth 1 -type d -name 'qiran-web-*' -mtime +"$KEEP_DAYS" -exec rm -rf {} +
du -sh "$TARGET"
echo "Backup tersimpan di $TARGET"
