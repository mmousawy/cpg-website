# imgproxy: preserve ICC color profiles on WebP transforms

Album grids and cards load photos via Supabase `/render/image/` (imgproxy). By default imgproxy converts embedded ICC profiles to sRGB and strips them (`IMGPROXY_STRIP_COLOR_PROFILE=true`). Photo detail pages serve the raw `/object/public/` file with `unoptimized`, so wide-gamut originals look richer than grid thumbs.

Setting `IMGPROXY_STRIP_COLOR_PROFILE=false` tells imgproxy to keep the source ICC on transformed output (including WebP when libvips embeds an ICCP chunk).

## Coolify auto-deploy vs imgproxy (important)

Coolify **does** auto-deploy the Next.js app when you push to `main` (or when Release Please hits `COOLIFY_PRODUCTION_WEBHOOK_URL`). That rebuilds the **Coolify application container** only.

**imgproxy is not part of that deploy.** It runs in the separate Supabase Docker Compose stacks on the same VPS. Merging this PR and letting Coolify deploy will **not** change imgproxy behavior — there is no Next.js code path for this setting.

| What happens on git push / Coolify deploy | What still needs a one-time VPS step |
| --- | --- |
| Next.js app rebuilt from Dockerfile | `IMGPROXY_STRIP_COLOR_PROFILE=false` on Supabase imgproxy |
| `verify:image-icc` script available in repo | Run `apply-imgproxy-preserve-icc.sh` on the server |
| No change to `/render/image` output until imgproxy is updated | Cloudflare purge of `/storage/v1/render/image/*` |

### After this PR merges

1. **Coolify** — let the normal auto-deploy run (or trigger manually). Nothing extra in the Coolify app UI.
2. **Supabase imgproxy** — once per environment, on the VPS (Coolify **server terminal** or SSH):

```bash
cd /home/ubuntu/cpg-website   # or your persistent checkout on the VPS
git pull

./infra/apply-imgproxy-preserve-icc.sh staging
pnpm verify:image-icc -- "https://db-staging.../object/public/user-photos/.../photo.jpg"

./infra/apply-imgproxy-preserve-icc.sh production
pnpm verify:image-icc -- "https://db.../object/public/user-photos/.../photo.jpg"
```

3. **Cloudflare** — purge `/storage/v1/render/image/*` (see below).

Staging **new** stacks already get the ICC override from [`supabase-staging/docker-compose.override.example.yml`](./supabase-staging/docker-compose.override.example.yml) when you copy that file during setup. **Existing** prod/staging stacks need `apply-imgproxy-preserve-icc.sh` once.

## Apply on staging first

```bash
cd /data/supabase-staging

# If you already have docker-compose.override.yml, merge the imgproxy.environment block from
# infra/supabase-imgproxy-icc.override.yml — or copy the whole file:
cp /home/ubuntu/cpg-website/infra/supabase-imgproxy-icc.override.yml \
  ./docker-compose.imgproxy-icc.override.yml

docker compose -p supabase-staging \
  -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f docker-compose.imgproxy-icc.override.yml \
  up -d imgproxy

# Confirm env inside the container
docker exec supabase-staging-imgproxy env | grep IMGPROXY_STRIP_COLOR_PROFILE
# expected: IMGPROXY_STRIP_COLOR_PROFILE=false
```

Verify with the repo script (from your laptop or the VPS):

```bash
cd /home/ubuntu/cpg-website
pnpm verify:image-icc -- \
  "https://db-staging.creativephotography.group/storage/v1/object/public/user-photos/USER/PHOTO.jpg"
```

## Apply on production

```bash
cd /home/ubuntu/supabase-project

cp /home/ubuntu/cpg-website/infra/supabase-imgproxy-icc.override.yml \
  ./docker-compose.imgproxy-icc.override.yml

docker compose \
  -f docker-compose.yml \
  -f docker-compose.imgproxy-icc.override.yml \
  up -d imgproxy

docker exec supabase-imgproxy env | grep IMGPROXY_STRIP_COLOR_PROFILE
```

If production already uses `docker-compose.override.yml`, add the `imgproxy.environment` block there instead of a third compose file.

## Purge Cloudflare cache (required)

Transformed images are cached at the edge for up to 30 days ([cloudflare-storage-cache.json](./cloudflare-storage-cache.json)). After changing imgproxy, purge:

**Cloudflare dashboard** → zone `creativephotography.group` → **Caching** → **Configuration** → **Purge Cache** → **Custom purge**:

```
https://db.creativephotography.group/storage/v1/render/image/*
https://db-staging.creativephotography.group/storage/v1/render/image/*
```

Or purge everything if you prefer a one-time full reset.

## Verify ICC in WebP output

```bash
pnpm verify:image-icc -- \
  "https://db.creativephotography.group/storage/v1/object/public/user-photos/USER/PHOTO.jpg"
```

Success criteria:

- Original JPEG has `icc` bytes in Sharp metadata (or exiftool `Profile Name`).
- Transformed WebP (`Accept: image/webp`) has ICC data and the same profile description as the original.
- Visual: grid thumb vs photo detail page should match more closely in Chrome on a wide-gamut display.

**Safari caveat:** WebKit may still ignore ICC inside WebP on some iOS versions. If Safari remains wrong after this change, use `format=origin` for photo grids only (JPEG fallback).

## Rollback

Set `IMGPROXY_STRIP_COLOR_PROFILE: "true"` (or remove the override), restart imgproxy, purge Cloudflare `/render/image/` cache again.
