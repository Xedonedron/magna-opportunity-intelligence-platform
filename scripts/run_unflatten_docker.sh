#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script: run_unflatten_docker.sh
# Kegunaan: Menjalankan script unflatten_opportunities.py di dalam container backend
# Penggunaan:
#   ./scripts/run_unflatten_docker.sh [--dry-run | --commit]
# ==============================================================================

CONTAINER_NAME="${CONTAINER_NAME:-moip_backend}"
MODE="${1:---dry-run}"

if [ "$MODE" = "--commit" ]; then
    echo "⚠️  PERINGATAN: Anda akan menjalankan un-flattening dalam mode COMMIT ke database!"
    read -p "Apakah Anda yakin ingin melanjutkan? (y/N): " -r CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Dibatalkan oleh user."
        exit 0
    fi
    docker exec -t "$CONTAINER_NAME" python scripts/unflatten_opportunities.py --commit
else
    echo "🔍 Menjalankan un-flattening dalam mode DRY-RUN (Preview)..."
    docker exec -t "$CONTAINER_NAME" python scripts/unflatten_opportunities.py
fi
