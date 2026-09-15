# Self-hosted Google / Discord login (GoTrue)

The Next.js app only *starts* OAuth (`signInWithOAuth` in `src/context/authActions.ts`). **GoTrue inside the Supabase stack must have the provider enabled.** Putting `GOTRUE_EXTERNAL_GOOGLE_*` in `.env` is not enough: stock `docker-compose.yml` never passes those keys into `supabase-auth`.

Symptom:

```
GET /auth/v1/authorize?provider=google
400  error_code=validation_failed  msg="Unsupported provider: provider is not enabled"
```

`supabase/config.toml` `[auth.external.google]` is **local CLI only**. It does not configure `db.creativephotography.group`.

## Coolify auto-deploy vs Auth (important)

Coolify **does** auto-deploy the Next.js app on git push. That rebuilds the **Coolify application container** only.

**GoTrue is not part of that deploy.** Merging a PR will **not** enable Google or Discord.

| What happens on git push / Coolify deploy | What still needs a VPS step |
| --- | --- |
| Next.js app rebuilt from Dockerfile | `GOTRUE_EXTERNAL_GOOGLE_*` / `DISCORD_*` injected into Auth |
| Login buttons still call `/auth/v1/authorize` | Run `apply-supabase-oauth.sh` (or equivalent compose override) |
| Local `supabase start` can already have Google on | Production/staging Auth is a separate compose stack |

## Apply once per stack

On the VPS (Coolify **server terminal** or SSH):

```bash
cd /home/ubuntu/cpg-website
git pull

bash infra/apply-supabase-oauth.sh staging
bash infra/apply-supabase-oauth.sh production
```

The script copies [`supabase-oauth.override.yml`](./supabase-oauth.override.yml) next to compose, recreates `auth`, and **fails** unless the container shows `GOTRUE_EXTERNAL_GOOGLE_ENABLED=true` and `GOTRUE_EXTERNAL_DISCORD_ENABLED=true`.

Confirm by hand:

```bash
docker exec supabase-auth env | grep GOTRUE_EXTERNAL_GOOGLE
docker exec supabase-staging-auth env | grep GOTRUE_EXTERNAL_GOOGLE
```

## `.env` (required before the override does anything)

Production: `/home/ubuntu/supabase-project/.env`  
Staging: `/data/supabase-staging/.env`

```env
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=
GOTRUE_EXTERNAL_GOOGLE_SECRET=
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://db.creativephotography.group/auth/v1/callback

GOTRUE_EXTERNAL_DISCORD_ENABLED=true
GOTRUE_EXTERNAL_DISCORD_CLIENT_ID=
GOTRUE_EXTERNAL_DISCORD_SECRET=
GOTRUE_EXTERNAL_DISCORD_REDIRECT_URI=https://db.creativephotography.group/auth/v1/callback
```

Staging uses the same client IDs with `https://db-staging.creativephotography.group/auth/v1/callback`.

`docker compose restart auth` does **not** pick up new env — recreate (`up -d --force-recreate auth`), which the apply script does.

## Provider consoles

Authorized redirect URI is **GoTrue**, not the website:

- Production: `https://db.creativephotography.group/auth/v1/callback`
- Staging: `https://db-staging.creativephotography.group/auth/v1/callback`

`https://creativephotography.group/auth-callback` is the post-login app route (`GOTRUE_URI_ALLOW_LIST` / Site URL). Google/Discord never redirect there directly.

New staging stacks: copy [`supabase-staging/docker-compose.override.example.yml`](./supabase-staging/docker-compose.override.example.yml) (includes the Auth OAuth env) plus [gotrue-staging.env.example](./supabase-staging/gotrue-staging.env.example). Existing stacks still need `apply-supabase-oauth.sh` once.
