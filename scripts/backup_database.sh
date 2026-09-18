#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script: backup_database.sh
# Kegunaan: Backup snapshot database PostgreSQL container MOIP sebelum migrasi
# ==============================================================================

CONTAINER_NAME="${CONTAINER_NAME:-moip_postgres}"
DB_USER="${DB_USER:-moip}"
DB_NAME="${DB_NAME:-moip_db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/moip_db_backup_${TIMESTAMP}.sql.gz"

echo "=== [MOIP Backup] Memulai snapshot database dari: $CONTAINER_NAME ==="
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists | gzip > "$BACKUP_FILE"

FILESIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "✓ Snapshot BERHASIL dibuat: $BACKUP_FILE (Ukuran: $FILESIZE)"
echo "File ini adalah safety net Anda. Jika ada kendala migrasi, jalankan:"
echo "  ./scripts/restore_database.sh $BACKUP_FILE"
