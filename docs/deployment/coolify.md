# Deploy on Coolify (VPS)

Self-host the Next.js app on your VPS with [Coolify](https://coolify.io). Production and staging are separate Coolify apps behind **Nginx** (not Coolify Traefik). Supabase stays self-hosted (`db.creativephotography.group` prod, optional `db-staging` for sandbox).

## Port convention

**Production = default ports. Staging = host port − 1000.**

| Environment | Site | Coolify mapping | Nginx upstream |
| --- | --- | --- | --- |
| **Production** | `creativephotography.group`, `www` | `127.0.0.1:3000:3000` | `127.0.0.1:3000` |
| **Staging** | `staging.creativephotography.group` | `127.0.0.1:2000:3000` | `127.0.0.1:2000` |

Containers always use port **3000** internally. See [infra/coolify/PORTS.md](../../infra/coolify/PORTS.md) for the full table (including Supabase Kong).

## Architecture

```
Visitor → Cloudflare → Nginx (80/443) → Coolify Next container → Supabase / Resend
                              ↑
                    Coolify scheduled tasks (crons)
```

| Environment | Site | Supabase |
| --- | --- | --- |
| Staging | `staging.creativephotography.group` | `db-staging.creativephotography.group` (isolated) |
| Production | `creativephotography.group`, `www` | `db.creativephotography.group` |

## 1. VPS and Coolify install

See [install-firewall.sh](../../infra/coolify/install-firewall.sh) and [Coolify docs](https://coolify.io/docs).

Dashboard: `https://coolify.creativephotography.group` (Nginx → `127.0.0.1:9000`).

## 2. Staging application

1. **Sources → GitHub App** → `mmousawy/cpg-website`, branch `migration` or `main`.
2. **Build pack:** Dockerfile, container port **3000**.
3. **Ports mappings:** `127.0.0.1:2000:3000` (host **2000** = prod 3000 − 1000).
4. Nginx: [nginx-staging.conf](../../infra/coolify/nginx-staging.conf) → `proxy_pass http://127.0.0.1:2000`.
5. **Health check:** `/api/health`.

### Staging env

| Variable | Build-time | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://db-staging.creativephotography.group` |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://staging.creativephotography.group` |
| `SUPABASE_SERVICE_ROLE_KEY` | No | staging keys |

Staging Supabase: [infra/supabase-staging/README.md](../../infra/supabase-staging/README.md).

QA: [staging-checklist.md](../../infra/coolify/staging-checklist.md).

## 3. Production application

See [production-cutover.md](../../infra/coolify/production-cutover.md) and [production-checklist.md](../../infra/coolify/production-checklist.md).

Summary:

- Coolify app on `main`, port mapping `127.0.0.1:3000:3000` (default).
- Nginx: [nginx-production.conf](../../infra/coolify/nginx-production.conf).
- `NEXT_PUBLIC_SITE_URL=https://creativephotography.group`.
- `NEXT_PUBLIC_SUPABASE_URL=https://db.creativephotography.group`.
- Crons: [scheduled-tasks.md](../../infra/coolify/scheduled-tasks.md).
- Releases: GitHub secret `COOLIFY_PRODUCTION_WEBHOOK_URL`.

## 4. Scheduled tasks

[scheduled-tasks.md](../../infra/coolify/scheduled-tasks.md) — configure per app in Coolify. Use `http://127.0.0.1:3000` **inside the container** (not the host bind port).

## 5. Moving off Vercel

| Was on Vercel | On Coolify |
| --- | --- |
| Hosting | Docker on VPS |
| `vercel.json` crons | Coolify scheduled tasks |
| `vercel promote` on release | `COOLIFY_PRODUCTION_WEBHOOK_URL` |
| PR preview E2E | Optional `E2E_BASE_URL` → staging, or keep Vercel previews temporarily |
| Vercel Analytics | Off by default; set `NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS=true` only on Vercel |

`vercel.json` remains in the repo for reference; `git.deploymentEnabled.main` is `false`.

## Docker (local)

```bash
docker build -t cpg-website \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  .

docker run -p 3000:3000 --env-file .env.local cpg-website
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| 502 Bad Gateway | Check `docker ps` port mapping; Nginx `proxy_pass` must match host bind (prod `:3000`, staging `:2000`) |
| Wrong site URL in emails | Rebuild after `NEXT_PUBLIC_SITE_URL` change |
| Cron 401 | `CRON_SECRET` matches scheduled task |
| OAuth redirect error | Supabase + provider URLs include correct hostname |
| Build OOM | More RAM or Coolify remote builder |
