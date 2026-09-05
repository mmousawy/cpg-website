#!/usr/bin/env bash
# Smoke-check a deployed instance (staging or production).
# Usage: ./infra/coolify/verify-deployment.sh https://staging.creativephotography.group

set -euo pipefail

BASE_URL="${1:-}"
if [ -z "$BASE_URL" ]; then
  echo "Usage: $0 <base-url>"
  echo "Example: $0 https://staging.creativephotography.group"
  exit 1
fi

BASE_URL="${BASE_URL%/}"

echo "Checking $BASE_URL/api/health ..."
HEALTH=$(curl -fsS "$BASE_URL/api/health")
echo "$HEALTH" | grep -q '"status":"ok"' || {
  echo "Health check failed: $HEALTH"
  exit 1
}

echo "Checking homepage ..."
HTTP_CODE=$(curl -fsS -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$HTTP_CODE" != "200" ]; then
  echo "Homepage returned HTTP $HTTP_CODE"
  exit 1
fi

echo "OK: health and homepage reachable"
