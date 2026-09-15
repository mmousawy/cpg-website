#!/usr/bin/env bash
# Pass Google/Discord OAuth env from .env into the GoTrue auth container.
#
# Usage:
#   bash infra/apply-supabase-oauth.sh staging
#   bash infra/apply-supabase-oauth.sh production
#
# Run on the VPS — Coolify server terminal or SSH.
# Coolify auto-deploy rebuilds Next.js only; this script updates Supabase Auth
# (separate compose stack). Safe to re-run. Requires GOTRUE_EXTERNAL_GOOGLE_*
# and GOTRUE_EXTERNAL_DISCORD_* already set in that stack's .env.

set -euo pipefail

ENV="${1:-}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OAUTH_OVERRIDE="$REPO_ROOT/infra/supabase-oauth.override.yml"

case "$ENV" in
  staging)
    COMPOSE_DIR="/data/supabase-staging"
    PROJECT="supabase-staging"
    CONTAINER="supabase-staging-auth"
    ;;
  production|prod)
    COMPOSE_DIR="/home/ubuntu/supabase-project"
    PROJECT="supabase"
    CONTAINER="supabase-auth"
    ;;
  *)
    echo "Usage: $0 staging|production" >&2
    exit 1
    ;;
esac

if [[ ! -d "$COMPOSE_DIR" ]]; then
  echo "Compose directory not found: $COMPOSE_DIR" >&2
  exit 1
fi

if [[ ! -f "$OAUTH_OVERRIDE" ]]; then
  echo "Missing override file: $OAUTH_OVERRIDE" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_DIR/.env" ]]; then
  echo "Missing $COMPOSE_DIR/.env — add GOTRUE_EXTERNAL_GOOGLE_* and GOTRUE_EXTERNAL_DISCORD_* first." >&2
  exit 1
fi

cp "$OAUTH_OVERRIDE" "$COMPOSE_DIR/docker-compose.oauth.override.yml"

COMPOSE_FILES=(-f docker-compose.yml)
[[ -f "$COMPOSE_DIR/docker-compose.override.yml" ]] && COMPOSE_FILES+=(-f docker-compose.override.yml)
[[ -f "$COMPOSE_DIR/docker-compose.imgproxy-icc.override.yml" ]] && COMPOSE_FILES+=(-f docker-compose.imgproxy-icc.override.yml)
COMPOSE_FILES+=(-f docker-compose.oauth.override.yml)

cd "$COMPOSE_DIR"
docker compose -p "$PROJECT" "${COMPOSE_FILES[@]}" up -d --force-recreate auth

echo ""
echo "Auth OAuth env:"
docker exec "$CONTAINER" env | grep -E 'GOTRUE_EXTERNAL_(GOOGLE|DISCORD)' || true

google_enabled="$(docker exec "$CONTAINER" printenv GOTRUE_EXTERNAL_GOOGLE_ENABLED || true)"
discord_enabled="$(docker exec "$CONTAINER" printenv GOTRUE_EXTERNAL_DISCORD_ENABLED || true)"

if [[ "$google_enabled" != "true" || "$discord_enabled" != "true" ]]; then
  echo "" >&2
  echo "OAuth providers are still not enabled inside $CONTAINER." >&2
  echo "  GOTRUE_EXTERNAL_GOOGLE_ENABLED=${google_enabled:-<unset>}" >&2
  echo "  GOTRUE_EXTERNAL_DISCORD_ENABLED=${discord_enabled:-<unset>}" >&2
  echo "Set ENABLED=true (and client id/secret/redirect) in $COMPOSE_DIR/.env, then re-run." >&2
  echo "See infra/supabase-oauth.md" >&2
  exit 1
fi

echo ""
echo "OK — Google and Discord are enabled on $CONTAINER."
echo "Provider consoles must list the GoTrue callback (not the Next.js /auth-callback):"
echo "  https://db.creativephotography.group/auth/v1/callback"
echo "  https://db-staging.creativephotography.group/auth/v1/callback"
