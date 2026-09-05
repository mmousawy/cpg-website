#!/usr/bin/env bash
# Open ports required by Coolify on Ubuntu/Debian (ufw).
# Run on the VPS as root before or after Coolify install.
# After first Coolify login, restrict port 8000 to your admin IP:
#   ufw delete allow 8000/tcp
#   ufw allow from YOUR.IP.ADDR.HERE to any port 8000 proto tcp

set -euo pipefail

if ! command -v ufw >/dev/null 2>&1; then
  echo "ufw not found; install with: apt-get install -y ufw"
  exit 1
fi

ufw allow OpenSSH
ufw allow 80/tcp comment 'HTTP (Traefik, ACME)'
ufw allow 443/tcp comment 'HTTPS (Traefik)'
ufw allow 8000/tcp comment 'Coolify dashboard (restrict after setup)'
ufw allow 6001/tcp comment 'Coolify realtime'
ufw allow 6002/tcp comment 'Coolify realtime'

echo "Firewall rules to be enabled:"
ufw status numbered || true

read -r -p "Enable ufw now? [y/N] " reply
if [[ "${reply}" =~ ^[Yy]$ ]]; then
  ufw --force enable
  ufw status verbose
fi

echo ""
echo "Install Coolify:"
echo "  curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash"
echo ""
echo "Cloudflare: set SSL/TLS to Full (strict). Disable Rocket Loader for this zone."
