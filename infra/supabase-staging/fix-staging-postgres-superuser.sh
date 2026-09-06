#!/usr/bin/env bash
# One-time fix: staging Postgres was initialized without a superuser postgres role.
# Migrations use OWNER TO supabase_admin and require superuser (or reserved-role grants).
#
# Usage: bash ./infra/supabase-staging/fix-staging-postgres-superuser.sh

set -euo pipefail

STAGING_DIR="${STAGING_DIR:-/data/supabase-staging}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-supabase-staging}"
DB_IMAGE="${DB_IMAGE:-supabase/postgres:15.8.1.085}"

if [[ ! -d "$STAGING_DIR/volumes/db/data" ]]; then
  echo "Postgres data dir not found: $STAGING_DIR/volumes/db/data"
  exit 1
fi

cd "$STAGING_DIR"

echo "Stopping staging db (and pooler)..."
docker compose -p "$COMPOSE_PROJECT" stop supavisor db

echo "Elevating postgres to SUPERUSER (single-user mode)..."
echo "ALTER ROLE postgres WITH SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS;" | \
  docker run --rm -i \
    -v "$STAGING_DIR/volumes/db/data:/var/lib/postgresql/data" \
    -e PGDATA=/var/lib/postgresql/data \
    "$DB_IMAGE" \
    postgres --single -D /var/lib/postgresql/data postgres

echo "Starting staging db..."
docker compose -p "$COMPOSE_PROJECT" start db

echo "Waiting for Postgres..."
sleep 5

docker exec supabase-staging-db psql -U postgres -d postgres -c \
  "SELECT rolname, rolsuper FROM pg_roles WHERE rolname = 'postgres';"

echo "Done. Re-run migrate-staging.sh"
