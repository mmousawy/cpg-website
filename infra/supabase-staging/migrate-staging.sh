#!/usr/bin/env bash
# Apply repo migrations to an empty staging Postgres (no production data).
#
# Usage (on VPS — Postgres on host :5433 from docker-compose.override.yml):
#   export STAGING_DB_URL="postgresql://postgres:PASS@127.0.0.1:5433/postgres"
#   ./infra/supabase-staging/migrate-staging.sh "$STAGING_DB_URL"

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_URL="${1:-}"

if [[ -z "$DB_URL" ]]; then
  echo "Usage: $0 <postgresql-connection-string>"
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
  exit 1
fi

cd "$ROOT"
echo "Pushing migrations to staging database..."
supabase db push --db-url "$DB_URL"
echo "Done. Staging schema is ready (empty content tables)."
