# Isolated staging Supabase (self-hosted)

Second Supabase stack on the same VPS as production. Staging Next (`staging.creativephotography.group`) uses **only** this instance. Production `db.creativephotography.group` is untouched.

## Architecture

```
staging.creativephotography.group  →  Coolify Next  →  db-staging.creativephotography.group (Kong :8002)
creativephotography.group          →  prod Next     →  db.creativephotography.group (Kong :8000)
```

- Empty database after migrations (no production data dump).
- Separate Auth users, storage buckets, JWT keys.
- Staging site is **admin-only** (enforced in app `proxy.ts` + promote first admin via SQL).

## 1. Clone compose on the VPS

Production Supabase usually lives under something like `/root/supabase/docker` or `/data/supabase`. Clone it:

```bash
sudo mkdir -p /data/supabase-staging
sudo rsync -a --exclude 'volumes/db/data' --exclude 'volumes/storage' \
  /path/to/production/supabase/docker/ /data/supabase-staging/
cd /data/supabase-staging
```

Generate **new** secrets (do not copy production JWT):

```bash
# Example — use your existing keygen workflow from the Supabase self-host docs
openssl rand -base64 32   # POSTGRES_PASSWORD, JWT_SECRET, etc.
```

Edit `.env`:

- New `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`
- `SITE_URL=https://staging.creativephotography.group`
- `API_EXTERNAL_URL=https://db-staging.creativephotography.group`
- `SUPABASE_PUBLIC_URL=https://db-staging.creativephotography.group`
- Copy `GOTRUE_EXTERNAL_*` OAuth secrets from production
- **Disable open signup:** `GOTRUE_DISABLE_SIGNUP=true` (or equivalent in your GoTrue env)
- Redirect allowlist: `https://staging.creativephotography.group/**`

Slim the stack in `docker-compose.yml` if RAM is tight: keep `db`, `auth`, `rest`, `kong`, `storage`, `imgproxy`, `meta`, `realtime`. Drop `studio`, `analytics`, `vector` unless you need them.

Publish Kong on localhost only (production already uses `:8000`):

```yaml
# docker-compose.override.yml (example)
services:
  kong:
    ports:
      - "127.0.0.1:8002:8000"
      - "127.0.0.1:8444:8443"
  db:
    ports: []   # do not publish 5432 on host
```

Start:

```bash
docker compose -p supabase-staging up -d
docker compose -p supabase-staging ps
```

## 2. DNS + Nginx + TLS

See [nginx-db-staging.conf](./nginx-db-staging.conf) and run:

```bash
sudo cp infra/supabase-staging/nginx-db-staging.conf /etc/nginx/sites-available/db-staging.creativephotography.group
sudo ln -sf /etc/nginx/sites-available/db-staging.creativephotography.group /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d db-staging.creativephotography.group
```

Cloudflare: `db-staging` A → VPS IP. Grey cloud until cert works, then **Full (strict)**.

Verify:

```bash
curl -fsS https://db-staging.creativephotography.group/auth/v1/health
```

## 3. Apply migrations (empty DB)

From a machine with this repo and Supabase CLI, against the staging DB (tunnel or VPS):

```bash
# On VPS with repo cloned — adjust password/host/port for your staging db container
export STAGING_DB_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5433/postgres"

# Optional: expose staging postgres temporarily in override:
#   db: ports: ["127.0.0.1:5433:5432"]

cd /path/to/cpg-website
./infra/supabase-staging/migrate-staging.sh "$STAGING_DB_URL"
```

Or use `supabase db push --db-url "$STAGING_DB_URL"` from the repo root.

## 4. OAuth + first admin

1. Google / Discord consoles: add redirect URI  
   `https://db-staging.creativephotography.group/auth/v1/callback`
2. Log in once on `https://staging.creativephotography.group` (you will be denied until promoted).
3. Promote your staging user:

```bash
docker compose -p supabase-staging exec db psql -U postgres -d postgres \
  -f - < infra/supabase-staging/promote-admin.sql
# Or paste SQL from promote-admin.sql after replacing email
```

## 5. Coolify staging app

Set env vars (rebuild after changing `NEXT_PUBLIC_*`):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://db-staging.creativephotography.group` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service role |
| `NEXT_PUBLIC_SITE_URL` | `https://staging.creativephotography.group` |
| `EMAIL_ASSETS_URL` | `https://staging.creativephotography.group` |

- **Do not** enable Coolify scheduled tasks on staging (or use Resend test mode).
- Upload hero images to staging `cpg-public` bucket if homepage heroes should load from staging storage.

## 6. Ongoing migrations

Apply new SQL to **staging first**, then production:

```bash
supabase db push --db-url "$STAGING_DB_URL"
# verify staging
supabase db push --db-url "$PRODUCTION_DB_URL"
```

## Rollback

Stop staging stack: `docker compose -p supabase-staging down`. Production is unaffected.
