# Deploy on Coolify (VPS)

Self-host the Next.js app on your VPS with [Coolify](https://coolify.io) while keeping **hosted Supabase**, Resend, and OAuth providers.

## Architecture

```
Visitor → Cloudflare → Coolify (Traefik) → Docker (Next.js) → Supabase / Resend
                              ↑
                    Coolify scheduled tasks (crons)
```

## 1. VPS and Coolify install

**Recommended:** 4 vCPU, 8 GB RAM, 40+ GB disk (Next.js builds are memory-heavy).

On Ubuntu LTS:

```bash
# From repo: infra/coolify/install-firewall.sh
sudo bash infra/coolify/install-firewall.sh

curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Open `http://YOUR_VPS_IP:8000`, create admin account, then:

1. Set dashboard FQDN (e.g. `https://coolify.creativephotography.group:8000` or Coolify’s HTTPS domain UI).
2. Cloudflare: **SSL/TLS → Full (strict)**; disable **Rocket Loader** for the zone.
3. Restrict port `8000` to your IP after setup.

## 2. Application setup (staging)

1. **Sources → GitHub App** → install for `mmousawy/cpg-website`.
2. **+ New** → Application → select repo, branch `main`.
3. **Build Pack:** Dockerfile  
4. **Ports Exposes:** `3000`  
5. **Domain:** `https://staging.creativephotography.group:3000`
6. **Health check:** path `/api/health`
7. Cloudflare DNS: `staging` A record → VPS IP (proxied).

### Environment variables

Copy from Vercel / `.env.local` (never commit secrets). Mark **build-time** for all `NEXT_PUBLIC_*`:

| Variable | Build-time | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | |
| `NEXT_PUBLIC_SITE_URL` | Yes | Staging: `https://staging.creativephotography.group` |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Yes | If used |
| `SUPABASE_SERVICE_ROLE_KEY` | No | |
| `RESEND_API_KEY` | No | |
| `CRON_SECRET` | No | For scheduled tasks |
| `ENCRYPTION_KEY` / `ENCRYPT_KEY` | No | |
| `EMAIL_*` | No | |
| `EMAIL_ASSETS_URL` | No | Match staging URL on staging |
| `REVALIDATION_SECRET` | No | |

**Rebuild** after changing any `NEXT_PUBLIC_*` value.

### Deploy

Click **Deploy**. First build may take several minutes. Check logs for OOM or missing build env.

## 3. Scheduled tasks

See [infra/coolify/scheduled-tasks.md](../../infra/coolify/scheduled-tasks.md).

## 4. Staging QA

See [infra/coolify/staging-checklist.md](../../infra/coolify/staging-checklist.md).

Supabase Dashboard → **Authentication → URL configuration** → add:

- Site URL: `https://staging.creativephotography.group`
- Redirect URLs: `https://staging.creativephotography.group/**`

## 5. Production cutover

1. Duplicate app or create **production** resource with production env (`NEXT_PUBLIC_SITE_URL=https://creativephotography.group`).
2. Domains: `creativephotography.group`, `www.creativephotography.group`.
3. Cloudflare: point `@` and `www` A/AAAA records to VPS (keep orange cloud).
4. Verify auth, uploads, crons.
5. Keep Vercel DNS as rollback for a few days, then remove `vercel promote` (see Release Please workflow).

Production deploys are triggered by **Coolify deploy webhook** on release (GitHub secret `COOLIFY_PRODUCTION_WEBHOOK_URL`).

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
| 502 Bad Gateway | Confirm `PORT=3000`, `HOSTNAME=0.0.0.0`; health check `/api/health` |
| Wrong site URL in emails | Rebuild after `NEXT_PUBLIC_SITE_URL` change |
| Cron 401 | `CRON_SECRET` in container matches scheduled task |
| OAuth redirect error | Supabase + provider redirect URLs include staging/production |
| Build OOM | More RAM or external build server in Coolify |
