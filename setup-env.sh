#!/usr/bin/env sh
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$ROOT_DIR/admin-app/.env" ]; then
  echo "admin-app/.env already exists — skipping"
else
  if [ -f "$ROOT_DIR/admin-app/env.example" ]; then
    cp "$ROOT_DIR/admin-app/env.example" "$ROOT_DIR/admin-app/.env"
    echo "Copied admin-app/env.example → admin-app/.env"
    echo "Please open admin-app/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  else
    echo "No env.example found in admin-app/ — please create admin-app/.env manually"
    exit 1
  fi
fi
