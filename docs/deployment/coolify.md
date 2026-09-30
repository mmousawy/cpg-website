# Deploy on Coolify (VPS)

Self-host the Next.js app on your VPS with [Coolify](https://coolify.io). Production and staging are separate Coolify apps behind **Nginx** (not Coolify Traefik). Supabase is self-hosted in two isolated Docker stacks on the same VPS.

## VPS layout (this server)

| Component | Production | Staging |
| --- | --- | --- |
| Next.js (Coolify) | `127.0.0.1:3000` → `creativephotography.group` | `127.0.0.1:2000` → `staging.creativephotography.group` |
| Supabase compose dir | `/home/ubuntu/supabase-project` | `/data/supabase-staging` |
| Supabase API | `https://db.creativephotography.group` (`:8000`) | `https://db-staging.creativephotography.group` (`:8002`) |
| Coolify dashboard | `https://coolify.creativephotography.group` (`:9000`) | — |

Staging Supabase setup (clone prod compose, container rename override, JWT keys): [infra/supabase-staging/README.md](../../infra/supabase-staging/README.md).

**RAM / OOM during deploy:** this VPS runs Coolify + 2× Supabase + 2× Next. Docker builds are heavy — see [infra/coolify/vps-resources.md](../../infra/coolify/vps-resources.md) (swap, cancel builds, do not deploy prod + staging together).

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

1. **Sources → GitHub App** → `mmousawy/cpg-website`, branch **`staging`** (auto-deploy on push).
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
| `ALLOW_TEST_API` | No | `true` — enables `/api/test/*` for staging E2E (never on production) |
| `INTERNAL_API_SECRET` or `CRON_SECRET` | No | Must match GitHub secret `INTERNAL_API_SECRET` for CI |

Staging Supabase: [infra/supabase-staging/README.md](../../infra/supabase-staging/README.md).

QA: [staging-checklist.md](../../infra/coolify/staging-checklist.md).

## 3. Production application

See [production-cutover.md](../../infra/coolify/production-cutover.md) and [production-checklist.md](../../infra/coolify/production-checklist.md).

Summary:

- Coolify app tracks git branch **`main`**, but **auto-deploy on push must be off**. Deploy only when [release-please.yml](../../.github/workflows/release-please.yml) calls `COOLIFY_PRODUCTION_WEBHOOK_URL` after a GitHub release.
- Port mapping `127.0.0.1:3000:3000` (default).
- Nginx: [nginx-production.conf](../../infra/coolify/nginx-production.conf).
- `NEXT_PUBLIC_SITE_URL=https://creativephotography.group`.
- `NEXT_PUBLIC_SUPABASE_URL=https://db.creativephotography.group`.
- Crons: [scheduled-tasks.md](../../infra/coolify/scheduled-tasks.md).
- Releases: GitHub secret `COOLIFY_PRODUCTION_WEBHOOK_URL` (Release Please after a GitHub release).
- Google / Discord: Coolify env does not enable providers — [supabase-oauth.md](../../infra/supabase-oauth.md).

## 4. Scheduled tasks

[scheduled-tasks.md](../../infra/coolify/scheduled-tasks.md) — configure per app in Coolify. Use `http://127.0.0.1:3000` **inside the container** (not the host bind port).

## 5. Moving off Vercel

| Was on Vercel | On Coolify |
| --- | --- |
| Hosting | Docker on VPS |
| `vercel.json` crons | Coolify scheduled tasks |
| `vercel promote` on release | Release Please webhook (`COOLIFY_PRODUCTION_WEBHOOK_URL`; prod auto-deploy **off**) |
| PR / preview E2E | Push to `staging` → Coolify auto-deploy → Playwright. Promote with PR `staging` → `main`, then merge the Release Please version PR |
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

## 6. Image color profiles (imgproxy)

Album grids use Supabase `/render/image/` (imgproxy inside the **Supabase compose stack**, not Coolify).

**Coolify auto-deploy does not configure imgproxy.** Staging rebuilds when git branch `staging` changes; production rebuilds only after a Release Please GitHub release hits the deploy webhook. After merging the ICC runbook changes, run the one-time imgproxy script on the VPS (Coolify server terminal), then purge Cloudflare — see [infra/imgproxy-color-profiles.md](../../infra/imgproxy-color-profiles.md).

Verify: `pnpm verify:image-icc -- "<object-public-url>"`

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| 502 Bad Gateway | Check `docker ps` port mapping; Nginx `proxy_pass` must match host bind (prod `:3000`, staging `:2000`). Logged-in client only (incognito works): chunked `sb-*-auth-token` cookies overflow Nginx headers — run `sudo bash infra/coolify/fix-nginx-proxy-headers.sh` on the VPS (uses `conf.d` for `large_client_header_buffers`, not inside `location`); on the device clear website data for the site and log in again. |
| Wrong site URL in emails | Rebuild after `NEXT_PUBLIC_SITE_URL` change |
| Cron 401 | `CRON_SECRET` matches scheduled task |
| OAuth redirect error | Supabase + provider URLs include correct hostname |
| Build OOM | More RAM or Coolify remote builder |
