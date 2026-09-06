# Isolated staging Supabase (self-hosted)

Second Supabase stack on the same VPS as production. Staging Next (`staging.creativephotography.group`) uses **only** this instance. Production `db.creativephotography.group` is untouched.

## Architecture

```
staging.creativephotography.group  →  Coolify Next (:2000)  →  db-staging.creativephotography.group (Kong :8002)
creativephotography.group          →  Coolify prod (:3000)  →  db.creativephotography.group (Kong :8000)
```

| | Production | Staging |
| --- | --- | --- |
| Compose directory | `/home/ubuntu/supabase-project` | `/data/supabase-staging` |
| Compose project | `supabase` (default) | `supabase-staging` (`-p`) |
| Kong (host) | `127.0.0.1:8000` | `127.0.0.1:8002` |
| Postgres (host, migrations) | not exposed | `127.0.0.1:5433` |
| Public API URL | `https://db.creativephotography.group` | `https://db-staging.creativephotography.group` |

- Empty database after migrations (no production data dump).
- Separate Auth users, storage buckets, JWT keys.
- Staging site is **admin-only** (enforced in app `proxy.ts` + promote first admin via SQL).

See also: [infra/coolify/PORTS.md](../coolify/PORTS.md), [staging-checklist.md](../coolify/staging-checklist.md).

## 1. Clone production compose to staging

Production on this VPS lives at **`/home/ubuntu/supabase-project`** (verify with `docker inspect supabase-kong | grep working_dir`).

```bash
sudo mkdir -p /data/supabase-staging

sudo rsync -a \
  --exclude 'volumes/db/data' \
  --exclude 'volumes/storage' \
  /home/ubuntu/supabase-project/ /data/supabase-staging/

cd /data/supabase-staging
ls -la docker-compose.yml .env
```

If `.env` is missing, copy from production as a template (you will replace secrets next):

```bash
sudo cp /home/ubuntu/supabase-project/.env /data/supabase-staging/.env
```

### Container name override (required)

Stock `docker-compose.yml` sets fixed `container_name` values (`supabase-kong`, `supabase-imgproxy`, …). A second stack on the same host **must** rename every service or `docker compose up` fails with *container name already in use*.

```bash
cp /home/ubuntu/cpg-website/infra/supabase-staging/docker-compose.override.example.yml \
  /data/supabase-staging/docker-compose.override.yml
```

This override:

- Renames all 13 runtime containers to `supabase-staging-*`
- Publishes Kong on `127.0.0.1:8002` and Postgres on `127.0.0.1:5433`
- Uses `ports: !override` on `kong` and `db` so Docker **replaces** the base compose port mappings
- Uses `ports: !override []` on `supavisor` so staging pooler does not bind host `:5432` (prod pooler)

**Service keys** in compose (use these in the override, not `container_name`):

| Service key | Prod `container_name` | Staging `container_name` |
| --- | --- | --- |
| `studio` | `supabase-studio` | `supabase-staging-studio` |
| `kong` | `supabase-kong` | `supabase-staging-kong` |
| `auth` | `supabase-auth` | `supabase-staging-auth` |
| `rest` | `supabase-rest` | `supabase-staging-rest` |
| `realtime` | `realtime-dev.supabase-realtime` | `supabase-staging-realtime` |
| `storage` | `supabase-storage` | `supabase-staging-storage` |
| `imgproxy` | `supabase-imgproxy` | `supabase-staging-imgproxy` |
| `meta` | `supabase-meta` | `supabase-staging-meta` |
| `functions` | `supabase-edge-functions` | `supabase-staging-edge-functions` |
| `analytics` | `supabase-analytics` | `supabase-staging-analytics` |
| `db` | `supabase-db` | `supabase-staging-db` |
| `vector` | `supabase-vector` | `supabase-staging-vector` |
| `supavisor` | `supabase-pooler` | `supabase-staging-pooler` |

`db-config` and `deno-cache` are init helpers — no `container_name` override needed.

Verify service keys if your compose file differs:

```bash
grep -E '^  [a-z]' /data/supabase-staging/docker-compose.yml
grep container_name /data/supabase-staging/docker-compose.yml
```

## 2. Generate secrets and API keys

**Before first `docker compose up`** on an empty staging DB, generate a full fresh `.env`:

```bash
cd /data/supabase-staging
sh utils/generate-keys.sh --update-env
```

This writes new `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`, and other secrets. See [Supabase self-host docs](https://supabase.com/docs/guides/self-hosting/docker#generate-keys-and-secrets).

**If you already set `JWT_SECRET` manually**, sign matching API keys:

```bash
cd /home/ubuntu/cpg-website
chmod +x infra/supabase-staging/generate-jwt-keys.sh
./infra/supabase-staging/generate-jwt-keys.sh /data/supabase-staging/.env --write
```

`ANON_KEY` and `SERVICE_ROLE_KEY` must be signed with the **same** `JWT_SECRET` in `.env`. Do not copy production keys.

### Staging-specific `.env` values

Edit `/data/supabase-staging/.env`:

```env
SITE_URL=https://staging.creativephotography.group
API_EXTERNAL_URL=https://db-staging.creativephotography.group
SUPABASE_PUBLIC_URL=https://db-staging.creativephotography.group
GOTRUE_DISABLE_SIGNUP=true
GOTRUE_URI_ALLOW_LIST=https://staging.creativephotography.group/**
```

Copy OAuth client IDs/secrets from production `.env` (`GOTRUE_EXTERNAL_GOOGLE_*`, `GOTRUE_EXTERNAL_DISCORD_*`). Add staging callback in provider consoles (step 4).

See [gotrue-staging.env.example](./gotrue-staging.env.example) for a checklist.

**RAM:** optionally comment out `studio`, `analytics`, `vector` in `docker-compose.yml` on a small VPS.

## 3. Start staging stack

```bash
cd /data/supabase-staging
docker compose -p supabase-staging up -d
docker compose -p supabase-staging ps
curl -fsS http://127.0.0.1:8002/auth/v1/health
docker ps --format '{{.Names}}' | grep supabase-staging
```

### Troubleshooting

| Error | Fix |
| --- | --- |
| `container name "/supabase-…" is already in use` | Install `docker-compose.override.yml` (step 1) |
| `Conflict` on `supabase-pooler` | Override `supavisor:` → `supabase-staging-pooler` (not `pooler:`) |
| Kong `:8002` connection refused | `docker compose -p supabase-staging logs kong` |
| `Bind for 0.0.0.0:8000 failed: port is already allocated` | `ports: !override` on `kong` (base compose also maps `:8000`) |
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | `ports: !override []` on `supavisor` (prod pooler owns host `:5432`) |
| Auth 401 with new keys | Re-run `generate-jwt-keys.sh --write` after fixing `JWT_SECRET` |
| `must be member of role "supabase_admin"` on `db push` | Staging `postgres` is not superuser — run `fix-staging-postgres-superuser.sh` |
| `"supabase_admin" role memberships are reserved` | Do not `GRANT supabase_admin` manually — fix superuser instead |
| `pg_dumpall -g` permission denied on staging | Same — staging postgres is not superuser |

Stop staging only: `docker compose -p supabase-staging down` — production is unaffected.

## 4. DNS + Nginx + TLS

Do this **after** staging Kong answers locally (`curl http://127.0.0.1:8002/auth/v1/health`).

### 4a. Nginx on the VPS

```bash
cd /home/ubuntu/cpg-website
sudo cp infra/supabase-staging/nginx-db-staging.conf \
  /etc/nginx/sites-available/db-staging.creativephotography.group
sudo ln -sf /etc/nginx/sites-available/db-staging.creativephotography.group \
  /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Confirm Nginx proxies to Kong (no public DNS required yet):

```bash
curl -fsS -H "Host: db-staging.creativephotography.group" \
  http://127.0.0.1/auth/v1/health
```

### 4b. Cloudflare DNS

In **Cloudflare → creativephotography.group → DNS → Records**, add:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| A | `db-staging` | `57.129.6.153` | **DNS only** (grey cloud) |

- **Name** is `db-staging` only (not the full hostname).
- **Grey cloud** for the first certbot run so Let's Encrypt hits your VPS directly (same as `staging` and prod cutover).
- TTL: Auto.

Wait 1–2 minutes, then from your laptop:

```bash
dig +short db-staging.creativephotography.group A
# should show 57.129.6.153 (not a Cloudflare proxy IP while grey)
```

### 4c. TLS (certbot)

On the VPS:

```bash
sudo certbot --nginx -d db-staging.creativephotography.group
curl -fsS https://db-staging.creativephotography.group/auth/v1/health
```

If certbot fails with 404/unauthorized, DNS is still wrong or orange-cloud is on — keep **grey cloud** until the cert is issued.

### 4d. Re-enable Cloudflare proxy

After HTTPS works:

1. Edit the `db-staging` A record → **Proxied** (orange cloud).
2. **SSL/TLS** → **Full (strict)** (same as `db` and `staging`).

Verify again:

```bash
curl -fsS https://db-staging.creativephotography.group/auth/v1/health
```

### 4e. Update staging Supabase `.env`

Ensure these match the public hostname (then restart auth/kong if you change them after first boot):

```env
API_EXTERNAL_URL=https://db-staging.creativephotography.group
SUPABASE_PUBLIC_URL=https://db-staging.creativephotography.group
```

```bash
cd /data/supabase-staging
docker compose -p supabase-staging restart auth kong
```

## 5. Apply migrations (empty DB)

Postgres is on host port **5433** (from override). Use the `POSTGRES_PASSWORD` from staging `.env`.

Migrations reference `OWNER TO supabase_admin`. Staging `postgres` must be a **superuser** (same as production).

Check:

```bash
docker exec supabase-staging-db psql -U postgres -d postgres -c \
  "SELECT rolname, rolsuper FROM pg_roles WHERE rolname = 'postgres';"
docker exec supabase-db psql -U postgres -d postgres -c \
  "SELECT rolname, rolsuper FROM pg_roles WHERE rolname = 'postgres';"
```

If staging shows `rolsuper = f`, fix once (staging only):

```bash
cd /home/ubuntu/cpg-website
bash ./infra/supabase-staging/fix-staging-postgres-superuser.sh
```

Do **not** `GRANT supabase_admin TO postgres` — reserved roles reject that. Superuser `postgres` can run migrations directly.

Then push migrations:

```bash
PASS=$(grep '^POSTGRES_PASSWORD=' /data/supabase-staging/.env | cut -d= -f2-)
export STAGING_DB_URL="postgresql://postgres:${PASS}@127.0.0.1:5433/postgres?sslmode=disable"

cd /home/ubuntu/cpg-website
bash ./infra/supabase-staging/migrate-staging.sh "$STAGING_DB_URL"
```

The migrate script runs the role sync automatically when both `supabase-db` and `supabase-staging-db` are up.

Verify roles (staging `postgres` should be superuser or member of `supabase_admin` like prod):

```bash
docker exec supabase-staging-db psql -U postgres -d postgres -c \
  "SELECT rolname, rolsuper FROM pg_roles WHERE rolname IN ('postgres','supabase_admin');"
docker exec supabase-db psql -U postgres -d postgres -c \
  "SELECT rolname, rolsuper FROM pg_roles WHERE rolname IN ('postgres','supabase_admin');"
```

## 6. First staging admin

**Recommended (reliable login) — shell script, first admin only:**

```bash
STAGING_ADMIN_EMAIL=you@example.com STAGING_ADMIN_PASSWORD='your-password' \
  bash ./infra/supabase-staging/create-staging-admin.sh
```

Runs only when no admins exist. Creates auth via GoTrue Admin API. Never changes an existing user's password.

**If login fails after SQL** ("Invalid login credentials"):

```bash
STAGING_ADMIN_EMAIL=you@example.com STAGING_ADMIN_PASSWORD='your-password' \
  bash ./infra/supabase-staging/reset-staging-admin-password.sh
```

**Alternative — SQL in Studio** (edit `create-first-staging-admin.sql` first; login may need reset script above):

```bash
docker compose -p supabase-staging exec -T db psql -U postgres -d postgres \
  < infra/supabase-staging/create-first-staging-admin.sql
```

**Alternative — promote after OAuth login, or add a second admin:**

1. Google / Discord: add redirect URI  
   `https://db-staging.creativephotography.group/auth/v1/callback`
2. Log in once on `https://staging.creativephotography.group` (denied until promoted).
3. Edit email in `promote-admin.sql`, then:

```bash
docker compose -p supabase-staging exec -T db psql -U postgres -d postgres \
  < infra/supabase-staging/promote-admin.sql
```

## 7. Coolify staging app

Point the **staging** Coolify app at staging Supabase only. Rebuild after any `NEXT_PUBLIC_*` change.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://db-staging.creativephotography.group` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` from `/data/supabase-staging/.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` from staging `.env` |
| `NEXT_PUBLIC_SITE_URL` | `https://staging.creativephotography.group` |
| `EMAIL_ASSETS_URL` | `https://staging.creativephotography.group` |

- **Do not** enable Coolify scheduled tasks on staging (or use Resend test mode only).
- Upload hero images to staging storage if the homepage should load from staging buckets.

**Isolation test:** create a test event on staging → confirm it does **not** appear on production.

## 8. Ongoing migrations

Apply to **staging first**, verify, then production:

```bash
supabase db push --db-url "$STAGING_DB_URL"
supabase db push --db-url "$PRODUCTION_DB_URL"
```

## Rollback

```bash
docker compose -p supabase-staging down
```

Or point Coolify staging back at production Supabase keys (not recommended). Production stack at `/home/ubuntu/supabase-project` is unaffected.
