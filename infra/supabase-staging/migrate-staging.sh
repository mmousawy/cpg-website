#!/usr/bin/env bash
# Apply repo migrations to an empty staging Postgres (no production data).
#
# Usage (on VPS — Postgres on host :5433 from docker-compose.override.yml):
#   export STAGING_DB_URL="postgresql://postgres:PASS@127.0.0.1:5433/postgres?sslmode=disable"
#   bash ./infra/supabase-staging/migrate-staging.sh "$STAGING_DB_URL"
#
# Self-hosted note: migrations set OWNER TO supabase_admin — postgres must be superuser.
# If not: bash ./infra/supabase-staging/fix-staging-postgres-superuser.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_URL="${1:-}"

if [[ -z "$DB_URL" ]]; then
  echo "Usage: $0 <postgresql-connection-string>"
  exit 1
fi

# Local Docker Postgres does not use TLS; Supabase CLI defaults to SSL.
if [[ "$DB_URL" != *sslmode=* ]]; then
  if [[ "$DB_URL" == *\?* ]]; then
    DB_URL="${DB_URL}&sslmode=disable"
  else
    DB_URL="${DB_URL}?sslmode=disable"
  fi
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
  exit 1
fi

if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'supabase-staging-db'; then
  is_super=$(docker exec supabase-staging-db psql -U postgres -d postgres -tAc \
    "SELECT rolsuper FROM pg_roles WHERE rolname = 'postgres';" | tr -d '[:space:]')
  if [[ "$is_super" != "t" ]]; then
    echo "ERROR: staging postgres is not a superuser (rolsuper=$is_super)."
    echo "Run: bash ./infra/supabase-staging/fix-staging-postgres-superuser.sh"
    exit 1
  fi
fi

cd "$ROOT"
echo "Pushing migrations to staging database..."
supabase db push --db-url "$DB_URL"
echo "Done. Staging schema is ready (empty content tables)."
