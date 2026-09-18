#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script: deploy_backend.sh
# Kegunaan: Otomasi deployment backend & celery MOIP di server VPS
# Dipanggil oleh GitHub Actions atau dapat dijalankan secara manual di VPS.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$PROJECT_DIR"

echo "========================================================"
echo "🚀 [MOIP Deployment] Memulai proses update backend..."
echo "🕒 Waktu       : $(date '+%Y-%m-%d %H:%M:%S')"
echo "📁 Direktori   : $PROJECT_DIR"
echo "📌 Git Commit  : $(git log -1 --oneline 2>/dev/null || echo 'Unknown')"
echo "========================================================"

# 1. Deteksi Docker Compose CLI
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
else
    echo "❌ Error: Docker Compose ('docker compose' atau 'docker-compose') tidak ditemukan!"
    exit 1
fi
echo "✓ Menggunakan CLI: $DC"

# 2. Safety Net: Jalankan snapshot database jika postgres sedang berjalan
if [ -f "$PROJECT_DIR/scripts/backup_database.sh" ] && docker ps --format '{{.Names}}' | grep -q "moip_postgres"; then
    echo "📦 Membuat snapshot database otomatis sebelum deploy..."
    bash "$PROJECT_DIR/scripts/backup_database.sh" || echo "⚠️ Peringatan: Backup database gagal atau dilewati, melanjutkan build..."
fi

# 3. Build container Backend & Celery
NO_CACHE_FLAG="${NO_CACHE:-false}"
if [ "$NO_CACHE_FLAG" = "true" ] || [ "${1:-}" = "--no-cache" ]; then
    echo "🔨 Melakukan Docker build backend & celery (--no-cache)..."
    $DC build --no-cache backend celery
else
    echo "🔨 Melakukan Docker build backend & celery (menggunakan cache layer)..."
    $DC build backend celery
fi

# 4. Restart services Backend & Celery
echo "🔄 Memperbarui container backend & celery (up -d)..."
$DC up -d backend celery

# 5. Verifikasi Health Check Endpoint Backend
echo "⏳ Memverifikasi status kesehatan backend (http://127.0.0.1:8009/api/health)..."
MAX_RETRIES=30
HEALTHY=false

for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf http://127.0.0.1:8009/api/health >/dev/null 2>&1; then
        HEALTHY=true
        echo "✅ Backend aktif dan sehat! (respon dalam ~${i}x percobaan)"
        break
    fi
    echo "   Menunggu backend siap dan migrasi database selesai... (${i}/${MAX_RETRIES})"
    sleep 2
done

if [ "$HEALTHY" = false ]; then
    echo "❌ Backend gagal merespon health check setelah 60 detik!"
    echo "=== Log Backend Terakhir (50 baris) ==="
    $DC logs --tail=50 backend
    exit 1
fi

# 6. Verifikasi Migrasi Database Alembic
echo "🔍 Status migrasi database Alembic saat ini:"
$DC exec -T backend alembic current || true

# 7. Bersihkan Image Docker Usang (Pruning)
echo "🧹 Membersihkan image Docker usang (dangling images)..."
docker image prune -f || true

# 8. Tampilkan Status Akhir Service
echo "========================================================"
echo "📊 Status Container MOIP Saat Ini:"
$DC ps backend celery postgres redis
echo "========================================================"
echo "🎉 [MOIP Deployment] Backend & Celery BERHASIL diperbarui!"
echo "========================================================"
