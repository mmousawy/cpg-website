# Production DNS cutover (Vercel → Coolify)

Use after [staging-checklist.md](./staging-checklist.md) passes.

Production uses the **same VPS and Nginx** as staging. Coolify runs two apps:

| App | Hostname | Coolify port mapping | Nginx upstream |
| --- | --- | --- | --- |
| **Production** | `creativephotography.group`, `www` | `127.0.0.1:3000:3000` | `127.0.0.1:3000` |
| **Staging** | `staging.creativephotography.group` | `127.0.0.1:2000:3000` | `127.0.0.1:2000` |

**Rule:** production uses default ports; staging host port is always **1000 less** (3000 → 2000). See [PORTS.md](./PORTS.md).

Do **not** use Coolify Traefik on 80/443 — Nginx already owns those ports.

## 1. Coolify production app

1. **+ New → Application** (or duplicate staging) named e.g. `cpg-production`.
2. **Branch:** `main`.
3. **Build pack:** Dockerfile, container port **3000**.
4. **Ports mappings:** `127.0.0.1:3000:3000` (default — production owns host `:3000`).
5. **Disable auto-deploy on push** if you only deploy via release webhook.
6. **Health check:** `/api/health`.
7. **Domains in Coolify:** leave empty (Nginx handles public hostnames).

### Environment (production)

Copy from Vercel / `.env.local`. Mark **build-time** for all `NEXT_PUBLIC_*`:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://creativephotography.group` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://db.creativephotography.group` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production anon |
| `SUPABASE_SERVICE_ROLE_KEY` | production service role |
| `EMAIL_ASSETS_URL` | `https://creativephotography.group` |
| (rest) | same as former Vercel production |

**Rebuild** after any `NEXT_PUBLIC_*` change.

### Scheduled tasks

Copy from [scheduled-tasks.md](./scheduled-tasks.md) into the **production** app. Commands use `http://127.0.0.1:3000` (inside the container).

### Deploy webhook

Coolify → **Webhooks** → copy URL → GitHub secret `COOLIFY_PRODUCTION_WEBHOOK_URL`.

## 2. Nginx + TLS

```bash
sudo cp infra/coolify/nginx-production.conf /etc/nginx/sites-available/creativephotography.group
sudo ln -sf /etc/nginx/sites-available/creativephotography.group /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d creativephotography.group -d www.creativephotography.group
```

Remove any duplicate `server_name` blocks for these hosts from `/etc/nginx/sites-enabled/default` (Certbot sometimes adds them there).

Verify on VPS:

```bash
curl -fsS http://127.0.0.1:3000/api/health
./infra/coolify/verify-deployment.sh https://creativephotography.group
```

## 3. Cloudflare DNS

| Record | Type | Value | Proxy |
| --- | --- | --- | --- |
| `@` | A | VPS IPv4 | Proxied |
| `www` | A or CNAME | VPS or `@` | Proxied |

Remove Vercel DNS records for `@` / `www` when ready.

**SSL/TLS:** Full (strict). Cache rules in `infra/cloudflare-site-cache.json` stay valid.

## 4. Supabase (production instance)

Authentication → URL configuration:

- Site URL: `https://creativephotography.group`
- Redirect URLs: `https://creativephotography.group/**`, `https://www.creativephotography.group/**`

## 5. GitHub Actions

Set `COOLIFY_PRODUCTION_WEBHOOK_URL`. [release-please.yml](../../.github/workflows/release-please.yml) triggers Coolify on release instead of `vercel promote`.

Optional for PR E2E without Vercel: set `E2E_BASE_URL=https://staging.creativephotography.group` (see CI workflow). Note: staging is admin-gated — public E2E may still need Vercel previews until you add a dedicated test deploy.

## 6. Retire Vercel

After [production-checklist.md](./production-checklist.md) passes:

1. Monitor Coolify logs and crons for 48h.
2. Disable Vercel production deployments or delete the project.
3. Remove `VERCEL_*` GitHub secrets when no longer needed.
4. `vercel.json` crons are **inactive** on Coolify — crons run via Coolify scheduled tasks only.

## Rollback

Point Cloudflare `@` / `www` back to Vercel. Keep the Vercel project until you are confident.
