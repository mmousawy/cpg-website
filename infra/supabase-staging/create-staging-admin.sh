#!/usr/bin/env bash
# Create the first staging admin (email + password). Only runs when no admins exist yet.
# Never changes an existing user's password.
#
# Usage (on VPS):
#   STAGING_ADMIN_EMAIL=you@example.com STAGING_ADMIN_PASSWORD='your-password' \
#     bash ./infra/supabase-staging/create-staging-admin.sh
#
# If the auth user already exists, only STAGING_ADMIN_EMAIL is required (promote only).

set -euo pipefail

STAGING_DIR="${STAGING_DIR:-/data/supabase-staging}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-supabase-staging}"
DB_CONTAINER="${DB_CONTAINER:-supabase-staging-db}"
KONG_URL="${KONG_URL:-http://127.0.0.1:8002}"

EMAIL="${STAGING_ADMIN_EMAIL:-}"
PASSWORD="${STAGING_ADMIN_PASSWORD:-}"
NICKNAME="${STAGING_ADMIN_NICKNAME:-}"
FULL_NAME="${STAGING_ADMIN_FULL_NAME:-}"

usage() {
  cat <<'EOF'
Create the **first** staging admin (fails if any admin already exists).

Environment:
  STAGING_ADMIN_EMAIL       required
  STAGING_ADMIN_PASSWORD    required only when creating a new auth user (min 6 chars)
  STAGING_ADMIN_NICKNAME    optional on create (default: derived from email)
  STAGING_ADMIN_FULL_NAME   optional on create (default: nickname)
  STAGING_DIR               default: /data/supabase-staging
  KONG_URL                  default: http://127.0.0.1:8002

Example (new user):
  STAGING_ADMIN_EMAIL=admin@example.com STAGING_ADMIN_PASSWORD='Str0ng!pass' \
    bash ./infra/supabase-staging/create-staging-admin.sh

Example (existing user — promote only):
  STAGING_ADMIN_EMAIL=admin@example.com \
    bash ./infra/supabase-staging/create-staging-admin.sh
EOF
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

load_env_var() {
  local key="$1"
  local file="$STAGING_DIR/.env"
  if [[ ! -f "$file" ]]; then
    echo "Missing $file"
    exit 1
  fi
  local line
  line=$(grep -m1 "^${key}=" "$file" || true)
  if [[ -z "$line" ]]; then
    echo "Missing $key in $file"
    exit 1
  fi
  printf '%s' "${line#*=}"
}

default_nickname() {
  local local_part="${EMAIL%%@*}"
  local_part=$(printf '%s' "$local_part" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-' '-')
  local_part=$(echo "$local_part" | sed 's/^-*//; s/-*$//; s/-\+/-/g')
  if [[ ${#local_part} -lt 3 ]]; then
    local_part="${local_part}admin"
  fi
  if [[ ${#local_part} -gt 30 ]]; then
    local_part="${local_part:0:30}"
  fi
  printf '%s' "$local_part"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ -z "$EMAIL" ]]; then
  usage
  echo
  echo "ERROR: set STAGING_ADMIN_EMAIL."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "ERROR: $DB_CONTAINER is not running."
  exit 1
fi

ADMIN_COUNT="$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
  "SELECT COUNT(*)::int FROM public.profiles WHERE is_admin IS TRUE;" | tr -d '[:space:]')"

if [[ "${ADMIN_COUNT:-0}" -gt 0 ]]; then
  echo "ERROR: staging already has ${ADMIN_COUNT} admin(s). This script only creates the first admin."
  echo "To add another admin, edit and run infra/supabase-staging/promote-admin.sql"
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c \
    "SELECT id, email, nickname FROM public.profiles WHERE is_admin IS TRUE;"
  exit 1
fi

SERVICE_ROLE_KEY="$(load_env_var SERVICE_ROLE_KEY)"

EMAIL_LC="$(printf '%s' "$EMAIL" | tr '[:upper:]' '[:lower:]')"
EMAIL_SQL="$(sql_escape "$EMAIL_LC")"

USER_ID="$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
  "SELECT id::text FROM auth.users WHERE lower(email) = lower('${EMAIL_SQL}') LIMIT 1;" | tr -d '[:space:]')"

CREATED_USER=false

if [[ -z "$USER_ID" ]]; then
  if [[ -z "$PASSWORD" ]]; then
    echo "ERROR: user does not exist — set STAGING_ADMIN_PASSWORD to create them."
    exit 1
  fi
  if [[ ${#PASSWORD} -lt 6 ]]; then
    echo "ERROR: STAGING_ADMIN_PASSWORD must be at least 6 characters."
    exit 1
  fi

  if [[ -z "$NICKNAME" ]]; then
    NICKNAME="$(default_nickname)"
  fi
  if [[ -z "$FULL_NAME" ]]; then
    FULL_NAME="$NICKNAME"
  fi

  echo "Creating auth user for ${EMAIL_LC}..."
  CREATE_BODY=$(printf '{"email":"%s","password":"%s","email_confirm":true}' \
    "$EMAIL_LC" "$PASSWORD")
  CREATE_RESPONSE=$(curl -sS -w '\n%{http_code}' -X POST "${KONG_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$CREATE_BODY")
  CREATE_HTTP="${CREATE_RESPONSE##*$'\n'}"
  CREATE_JSON="${CREATE_RESPONSE%$'\n'*}"

  if [[ "$CREATE_HTTP" != "200" && "$CREATE_HTTP" != "201" ]]; then
    echo "ERROR: GoTrue admin create failed (HTTP ${CREATE_HTTP}):"
    echo "$CREATE_JSON"
    exit 1
  fi

  USER_ID="$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
    "SELECT id::text FROM auth.users WHERE lower(email) = lower('${EMAIL_SQL}') LIMIT 1;" | tr -d '[:space:]')"

  if [[ -z "$USER_ID" ]]; then
    echo "ERROR: user was not created in auth.users."
    exit 1
  fi
  CREATED_USER=true
  echo "Created auth user ${USER_ID}."
else
  echo "Auth user already exists (${USER_ID}). Promoting to admin only — password unchanged."
fi

NICKNAME_SQL="$(sql_escape "${NICKNAME:-}")"
FULL_NAME_SQL="$(sql_escape "${FULL_NAME:-}")"

echo "Ensuring admin profile..."
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO public.profiles (id, email, full_name, nickname, created_at, updated_at)
VALUES (
  '${USER_ID}'::uuid,
  '${EMAIL_SQL}',
  '${FULL_NAME_SQL}',
  '${NICKNAME_SQL}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claim.role', 'service_role', true);

UPDATE public.profiles
SET
  is_admin = true,
  terms_accepted_at = COALESCE(terms_accepted_at, NOW()),
  nickname = COALESCE(nickname, '${NICKNAME_SQL}'),
  full_name = COALESCE(NULLIF(full_name, ''), '${FULL_NAME_SQL}'),
  updated_at = NOW()
WHERE id = '${USER_ID}'::uuid;

SELECT id, email, nickname, is_admin, terms_accepted_at IS NOT NULL AS onboarding_complete
FROM public.profiles
WHERE id = '${USER_ID}'::uuid;
SQL

if [[ "$CREATED_USER" == true ]]; then
  cat <<EOF

Done. New admin created.

Log in at: https://staging.creativephotography.group/login
  Email:    ${EMAIL_LC}
  Password: (value you set in STAGING_ADMIN_PASSWORD)

EOF
else
  cat <<EOF

Done. Existing user promoted to admin (password unchanged).

Log in at: https://staging.creativephotography.group/login
  Email:    ${EMAIL_LC}

EOF
fi
