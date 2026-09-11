#!/usr/bin/env bash
# Apply IMGPROXY_STRIP_COLOR_PROFILE=false on a self-hosted Supabase stack and restart imgproxy.
#
# Usage:
#   ./infra/apply-imgproxy-preserve-icc.sh staging
#   ./infra/apply-imgproxy-preserve-icc.sh production
#
# Run on the VPS — Coolify server terminal or SSH.
# Coolify auto-deploy rebuilds Next.js only; this script updates Supabase imgproxy (separate compose stack).
# Safe to run after a normal Coolify deploy; does not replace or require one.

set -euo pipefail

ENV="${1:-}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICC_OVERRIDE="$REPO_ROOT/infra/supabase-imgproxy-icc.override.yml"

case "$ENV" in
  staging)
    COMPOSE_DIR="/data/supabase-staging"
    PROJECT="supabase-staging"
    CONTAINER="supabase-staging-imgproxy"
    COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml -f docker-compose.imgproxy-icc.override.yml)
    ;;
  production|prod)
    COMPOSE_DIR="/home/ubuntu/supabase-project"
    PROJECT="supabase"
    CONTAINER="supabase-imgproxy"
    if [[ -f "$COMPOSE_DIR/docker-compose.override.yml" ]]; then
      COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml -f docker-compose.imgproxy-icc.override.yml)
    else
      COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.imgproxy-icc.override.yml)
    fi
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

if [[ ! -f "$ICC_OVERRIDE" ]]; then
  echo "Missing override file: $ICC_OVERRIDE" >&2
  exit 1
fi

cp "$ICC_OVERRIDE" "$COMPOSE_DIR/docker-compose.imgproxy-icc.override.yml"

cd "$COMPOSE_DIR"
docker compose -p "$PROJECT" "${COMPOSE_FILES[@]}" up -d imgproxy

echo ""
echo "imgproxy env:"
docker exec "$CONTAINER" env | grep IMGPROXY_STRIP_COLOR_PROFILE || true

echo ""
echo "Next: purge Cloudflare cache for /storage/v1/render/image/* (see infra/imgproxy-color-profiles.md)"
echo "Then verify: cd $REPO_ROOT && pnpm verify:image-icc -- <object-public-url>"
