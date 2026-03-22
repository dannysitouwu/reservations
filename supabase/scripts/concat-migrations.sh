#!/usr/bin/env bash
# Concatena todas las migraciones en orden versionado (0001 … 0038).
# Uso desde la raíz del repo:
#   bash supabase/scripts/concat-migrations.sh > supabase/SETUP_DATABASE.full.generated.sql
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(cd "${SCRIPT_DIR}/../migrations" && pwd)"

echo "-- GENERATED FILE — do not edit by hand"
echo "-- Built from: ${MIGRATIONS_DIR}/*.sql (sorted)"
echo ""

# sort -V: orden 0001, 0002, …, 0010, …, 0038 (GNU y BSD modernos)
for file in $(ls "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | sort -V); do
  base="$(basename "${file}")"
  echo ""
  echo "-- ====================================================================="
  echo "-- ${base}"
  echo "-- ====================================================================="
  cat "${file}"
done
