#!/usr/bin/env bash
# Set a staging user's password via GoTrue Admin API (fixes "Invalid login credentials"
# after raw SQL auth inserts). Does not change is_admin.
#
# Usage:
#   STAGING_ADMIN_EMAIL=you@example.com STAGING_ADMIN_PASSWORD='new-password' \
#     bash ./infra/supabase-staging/reset-staging-admin-password.sh

set -euo pipefail

STAGING_DIR="${STAGING_DIR:-/data/supabase-staging}"
DB_CONTAINER="${DB_CONTAINER:-supabase-staging-db}"
KONG_URL="${KONG_URL:-http://127.0.0.1:8002}"

EMAIL="${STAGING_ADMIN_EMAIL:-}"
PASSWORD="${STAGING_ADMIN_PASSWORD:-}"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "Usage: STAGING_ADMIN_EMAIL=... STAGING_ADMIN_PASSWORD=... $0"
  exit 1
fi

if [[ ${#PASSWORD} -lt 6 ]]; then
  echo "ERROR: password must be at least 6 characters."
  exit 1
fi

load_env_var() {
  grep -m1 "^${1}=" "$STAGING_DIR/.env" | cut -d= -f2-
}

SERVICE_ROLE_KEY="$(load_env_var SERVICE_ROLE_KEY)"
EMAIL_LC="$(printf '%s' "$EMAIL" | tr '[:upper:]' '[:lower:]')"
EMAIL_SQL="${EMAIL//\'/\'\'}"

USER_ID="$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
  "SELECT id::text FROM auth.users WHERE lower(email) = lower('${EMAIL_SQL}') LIMIT 1;" | tr -d '[:space:]')"

if [[ -z "$USER_ID" ]]; then
  echo "ERROR: no auth.users row for ${EMAIL_LC}. Use create-staging-admin.sh first."
  exit 1
fi

UPDATE_BODY=$(printf '{"password":"%s","email_confirm":true}' "$PASSWORD")
RESPONSE=$(curl -sS -w '\n%{http_code}' -X PUT \
  "${KONG_URL}/auth/v1/admin/users/${USER_ID}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_BODY")
HTTP="${RESPONSE##*$'\n'}"
BODY="${RESPONSE%$'\n'*}"

if [[ "$HTTP" != "200" ]]; then
  echo "ERROR: GoTrue password reset failed (HTTP ${HTTP}):"
  echo "$BODY"
  exit 1
fi

echo "Password updated for ${EMAIL_LC}."
echo "Test: curl -sS -X POST '${KONG_URL}/auth/v1/token?grant_type=password' \\"
echo "  -H 'apikey: $(load_env_var ANON_KEY)' -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"${EMAIL_LC}\",\"password\":\"...\"}'"
