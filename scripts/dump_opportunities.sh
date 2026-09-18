#!/usr/bin/env bash
# ==============================================================================
# Script: dump_opportunities.sh
# Kegunaan: Mengekstrak seluruh opportunity existing dari database PostgreSQL (Docker)
#           Dikelompokkan berdasarkan nama perusahaan untuk analisis un-flattening.
# ==============================================================================

CONTAINER_NAME="${CONTAINER_NAME:-moip_postgres}"
DB_USER="${DB_USER:-moip}"
DB_NAME="${DB_NAME:-moip_db}"
OUTPUT_FORMAT="${1:-table}" # Pilihan: 'table' (default) atau 'json'

echo "=== Mengekstrak data opportunity dari container: $CONTAINER_NAME ==="

if [ "$OUTPUT_FORMAT" = "json" ]; then
    OUTPUT_FILE="opportunities_dump_$(date +%Y%m%d_%H%M%S).json"
    docker exec -t "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "
        SELECT json_agg(t) FROM (
            SELECT 
                o.id,
                o.company_name,
                COALESCE(o.product, '-') AS product,
                o.status,
                TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
                COUNT(DISTINCT k.id) AS kyc_versions,
                COUNT(DISTINCT m.id) AS meetings_count,
                o.customer_needs
            FROM opportunities o
            LEFT JOIN kyc_reports k ON k.opportunity_id = o.id
            LEFT JOIN meetings m ON m.opportunity_id = o.id
            GROUP BY o.id, o.company_name, o.product, o.status, o.created_at, o.customer_needs
            ORDER BY LOWER(TRIM(o.company_name)), o.created_at ASC
        ) t;
    " > "$OUTPUT_FILE"
    echo "✓ Berhasil diekspor ke format JSON: $OUTPUT_FILE"
else
    # Default: Output tabel terformat rapi
    docker exec -t "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            SUBSTRING(o.id::text, 1, 8) AS id_short,
            RPAD(SUBSTRING(o.company_name, 1, 28), 28) AS company,
            COALESCE(SUBSTRING(o.product, 1, 15), '-') AS product,
            SUBSTRING(o.status, 1, 14) AS status,
            COUNT(DISTINCT k.id) AS kyc_v,
            COUNT(DISTINCT m.id) AS mtg,
            TO_CHAR(o.created_at, 'YYYY-MM-DD') AS created,
            REPLACE(REPLACE(SUBSTRING(o.customer_needs, 1, 60), E'\n', ' '), E'\r', ' ') AS needs_snippet
        FROM opportunities o
        LEFT JOIN kyc_reports k ON k.opportunity_id = o.id
        LEFT JOIN meetings m ON m.opportunity_id = o.id
        GROUP BY o.id, o.company_name, o.product, o.status, o.created_at, o.customer_needs
        ORDER BY LOWER(TRIM(o.company_name)), o.created_at ASC;
    "
fi
