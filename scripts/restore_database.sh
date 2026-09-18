#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script: restore_database.sh
# Kegunaan: Rollback / Restore database PostgreSQL container MOIP dari snapshot .sql.gz
# ==============================================================================

CONTAINER_NAME="${CONTAINER_NAME:-moip_postgres}"
DB_USER="${DB_USER:-moip}"
DB_NAME="${DB_NAME:-moip_db}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Penggunaan: $0 <path_to_backup_file.sql.gz>"
    echo "Contoh: $0 ./backups/moip_db_backup_20260918_120000.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File backup tidak ditemukan di: $BACKUP_FILE"
    exit 1
fi

echo "⚠️ PERINGATAN: Memulai Restore / Rollback Database ke container: $CONTAINER_NAME..."
echo "Database yang aktif saat ini akan ditimpa dengan snapshot: $BACKUP_FILE"
read -r -p "Ketik 'YES' untuk melanjutkan rollback: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Rollback dibatalkan."
    exit 0
fi

echo "Memulihkan database..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
echo "✓ Rollback database BERHASIL! Seluruh skema dan data kembali ke kondisi sebelum migrasi."
