#!/usr/bin/env bash
# Patch live Nginx vhosts for Next.js behind Cloudflare:
# - Conditional Connection header (not upgrade on every request)
# - Larger proxy buffers for chunked Supabase Set-Cookie (location {})
# - Larger client request headers (http {} via conf.d)
#
# Safe on the VPS: edits existing certbot SSL blocks; does not overwrite them.
#
#   sudo bash infra/coolify/fix-nginx-proxy-headers.sh

set -euo pipefail

MAP_DST="/etc/nginx/conf.d/connection-upgrade-map.conf"
CLIENT_HEADERS_DST="/etc/nginx/conf.d/large-client-headers.conf"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

tee "$MAP_DST" >/dev/null <<'EOF'
# Must live in the http {} context (e.g. /etc/nginx/conf.d/).
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
EOF

tee "$CLIENT_HEADERS_DST" >/dev/null <<'EOF'
# Chunked sb-*-auth-token cookies can exceed default 1k client header buffers.
large_client_header_buffers 4 16k;
EOF

VHOSTS=(
  /etc/nginx/sites-available/creativephotography.group
  /etc/nginx/sites-available/staging.creativephotography.group
  /etc/nginx/sites-available/supabase
  /etc/nginx/sites-available/db.creativephotography.group
  /etc/nginx/sites-available/db-staging.creativephotography.group
)

# Production db vhost was often created manually (certbot / one-off name). Discover any file
# that defines server_name for db.* hosts.
discover_db_vhosts() {
  local search_dirs=(/etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d)
  local pat='server_name[[:space:]].*db(\-staging)?\.creativephotography\.group'
  local f
  for dir in "${search_dirs[@]}"; do
    [[ -d "$dir" ]] || continue
    while IFS= read -r f; do
      [[ -n "$f" && -f "$f" ]] || continue
      VHOSTS+=("$f")
    done < <(grep -El "$pat" "$dir"/* 2>/dev/null || true)
  done
}
discover_db_vhosts

declare -A SEEN_VHOST=()
UNIQUE_VHOSTS=()
for vhost in "${VHOSTS[@]}"; do
  if [[ ! -f "$vhost" ]]; then
    echo "skip (missing): $vhost"
    continue
  fi
  real="$(readlink -f "$vhost" 2>/dev/null || echo "$vhost")"
  if [[ -n "${SEEN_VHOST[$real]:-}" ]]; then
    continue
  fi
  SEEN_VHOST[$real]=1
  UNIQUE_VHOSTS+=("$vhost")
done

if [[ ${#UNIQUE_VHOSTS[@]} -eq 0 ]]; then
  echo "No vhost files found. Locate db host config with:" >&2
  echo "  sudo grep -r 'db.creativephotography.group' /etc/nginx" >&2
  exit 1
fi

for vhost in "${UNIQUE_VHOSTS[@]}"; do

  python3 - "$vhost" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
original = text

text = text.replace(
    'proxy_set_header Connection "upgrade";',
    'proxy_set_header Connection $connection_upgrade;',
)
text = text.replace(
    "proxy_set_header Connection 'upgrade';",
    'proxy_set_header Connection $connection_upgrade;',
)

# Invalid inside location {} — remove if a previous run inserted it there.
text = text.replace('        large_client_header_buffers 4 16k;\n', '')

buffer_block = """        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;
"""

if 'proxy_buffer_size' not in text:
    needle = '        proxy_http_version 1.1;\n'
    if needle in text:
        text = text.replace(needle, needle + buffer_block, text.count(needle))

if text == original:
    print(f'unchanged: {path}')
else:
    path.write_text(text)
    print(f'patched: {path}')
PY
done

nginx -t
systemctl reload nginx
echo "Nginx reloaded."
echo "  $MAP_DST"
echo "  $CLIENT_HEADERS_DST"
echo "Verify: grep -i 'too big header' /var/log/nginx/error.log"
