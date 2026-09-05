# Production DNS cutover (Vercel → Coolify)

Use after [staging-checklist.md](./staging-checklist.md) passes.

## Coolify production app

1. Create a **second** application (or duplicate staging) named e.g. `cpg-production`.
2. Branch: `main` (or deploy only via webhook on release — disable auto-deploy on push).
3. Domains:
   - `https://creativephotography.group:3000`
   - `https://www.creativephotography.group:3000`
4. Environment: production values from Vercel.  
   `NEXT_PUBLIC_SITE_URL=https://creativephotography.group` (**rebuild** required).
5. Copy scheduled tasks from [scheduled-tasks.md](./scheduled-tasks.md).
6. In Coolify → **Webhooks**, copy the deploy webhook URL into GitHub secret `COOLIFY_PRODUCTION_WEBHOOK_URL`.

## Cloudflare DNS

| Record | Type | Value | Proxy |
| --- | --- | --- | --- |
| `@` | A | VPS IPv4 | Proxied |
| `www` | A or CNAME | VPS or `@` | Proxied |

Remove or stop using Vercel DNS records for `@` / `www`.

**SSL/TLS:** Full (strict). Existing cache rules in `infra/cloudflare-site-cache.json` stay valid.

## Supabase

Authentication → URL configuration:

- Site URL: `https://creativephotography.group`
- Redirect URLs: include `https://creativephotography.group/**` and `https://www.creativephotography.group/**`

## GitHub Actions

When `COOLIFY_PRODUCTION_WEBHOOK_URL` is set, Release Please triggers a Coolify deploy instead of `vercel promote`.

Until cutover, leave the secret unset to keep deploying via Vercel.

## Rollback

Point Cloudflare `@` / `www` back to Vercel. Production on Vercel remains available if you have not deleted the project.

## Post-cutover

1. Monitor Coolify logs and cron executions for 48h.
2. Disable Vercel production deployments (or delete project after confidence).
3. Optionally remove `VERCEL_*` secrets from GitHub when CI is updated to stop using Vercel previews.
