#!/usr/bin/env bash
# Sign ANON_KEY and SERVICE_ROLE_KEY from an existing JWT_SECRET in .env
# (same algorithm as Supabase docker/utils/generate-keys.sh).
#
# Usage:
#   ./infra/supabase-staging/generate-jwt-keys.sh /data/supabase-staging/.env
#   ./infra/supabase-staging/generate-jwt-keys.sh /data/supabase-staging/.env --write

set -euo pipefail

ENV_FILE="${1:-}"
WRITE=false

if [[ -z "$ENV_FILE" ]]; then
  echo "Usage: $0 <path-to-.env> [--write]"
  exit 1
fi

if [[ "${2:-}" == "--write" ]]; then
  WRITE=true
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "File not found: $ENV_FILE"
  exit 1
fi

jwt_secret=$(grep '^JWT_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
if [[ -z "$jwt_secret" ]]; then
  echo "JWT_SECRET not found in $ENV_FILE"
  exit 1
fi

b64url() { openssl enc -base64 -A | tr '+/' '-_' | tr -d '='; }

gen_token() {
  local payload="$1"
  local header='{"alg":"HS256","typ":"JWT"}'
  local payload_b64 header_b64 signed sig
  payload_b64=$(printf %s "$payload" | b64url)
  header_b64=$(printf %s "$header" | b64url)
  signed="${header_b64}.${payload_b64}"
  sig=$(printf %s "$signed" | openssl dgst -binary -sha256 -hmac "$jwt_secret" | b64url)
  printf '%s.%s' "$signed" "$sig"
}

iat=$(date +%s)
exp=$((iat + 5 * 3600 * 24 * 365))

anon_key=$(gen_token "{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}")
service_role_key=$(gen_token "{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}")

echo "ANON_KEY=${anon_key}"
echo "SERVICE_ROLE_KEY=${service_role_key}"

if [[ "$WRITE" == true ]]; then
  cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%s)"
  sed -i \
    -e "s|^ANON_KEY=.*|ANON_KEY=${anon_key}|" \
    -e "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${service_role_key}|" \
    "$ENV_FILE"
  echo "Updated $ENV_FILE (backup created alongside)"
fi
