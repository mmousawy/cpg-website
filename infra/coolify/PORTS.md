# Host port convention (Coolify + Nginx)

**Production uses default ports. Staging is always 1000 less on the host.**

Containers always listen on **3000** (Next.js default). Only the **host bind** differs.

| Service | Environment | Coolify mapping | Nginx `proxy_pass` | Notes |
| --- | --- | --- | --- | --- |
| Next.js | **Production** | `127.0.0.1:3000:3000` | `http://127.0.0.1:3000` | Default port |
| Next.js | **Staging** | `127.0.0.1:2000:3000` | `http://127.0.0.1:2000` | Prod host port − 1000 |
| Supabase Kong | **Production** | `127.0.0.1:8000:8000` | `https://db.creativephotography.group` | `/home/ubuntu/supabase-project` |
| Supabase Kong | **Staging** | `127.0.0.1:8002:8000` | `https://db-staging.creativephotography.group` (Kong routes `/` → Studio) | `/data/supabase-staging` |
| Coolify UI | — | `127.0.0.1:9000:8080` | `http://127.0.0.1:9000` | Dashboard only |

## Quick health checks (on VPS)

```bash
# Production Next
curl -fsS http://127.0.0.1:3000/api/health

# Staging Next
curl -fsS http://127.0.0.1:2000/api/health

# Staging Kong (Supabase)
curl -fsS http://127.0.0.1:8002/auth/v1/health
```

## Inside the container

Coolify scheduled tasks and internal curls always use **container port 3000**:

```bash
curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/event-reminders
```

The host port (`3000` prod / `2000` staging) is only for Nginx → Docker.

## Nginx configs

| File | Hostname |
| --- | --- |
| [nginx-production.conf](./nginx-production.conf) | `creativephotography.group`, `www` → `:3000` |
| [nginx-staging.conf](./nginx-staging.conf) | `staging.creativephotography.group` → `:2000` |
| [../supabase-staging/nginx-db-staging.conf](../supabase-staging/nginx-db-staging.conf) | `db-staging.creativephotography.group` → Kong `:8002` (same as prod `db` → `:8000`) |

Staging Supabase setup: [../supabase-staging/README.md](../supabase-staging/README.md).
