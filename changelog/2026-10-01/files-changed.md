# Files Changed - Coolify Staging E2E and GitHub Actions

## Overview

GitHub Actions no longer waits on Vercel previews. Work lands on `staging`, Coolify auto-deploys that branch, CI polls the public health endpoint until the commit matches, then Playwright runs against `https://staging.creativephotography.group`. Production still deploys only after a Release Please GitHub release, via `COOLIFY_PRODUCTION_WEBHOOK_URL`.

## CI / Coolify

### 1. Replace Vercel preview E2E

**Problem:** CI polled the Vercel API, used a protection-bypass cookie, and optionally fell back to a fixed `E2E_BASE_URL`. Production is on Coolify; that path was leftover.

**Solution:** Two jobs in `.github/workflows/ci.yml`:

- **Lint, typecheck, and unit tests** — `pnpm run check` on PRs to `staging` and `main`
- **Staging deploy and E2E** — on push to `staging`, and on PRs into `main` that are not `release-please--*` branches. Poll `/api/health` until `commit` matches the git SHA, then `pnpm run test:e2e` with `BASE_URL=https://staging.creativephotography.group`

Promote with a PR **`staging` → `main`**. Merge the Release Please version PR to cut a tag and fire the production webhook.

### 2. Production webhook only

**File:** `.github/workflows/release-please.yml`

Removed `vercel promote` and the Vercel SHA lookup. If `release_created` is true, curl `COOLIFY_PRODUCTION_WEBHOOK_URL`. Production Coolify auto-deploy on `main` stays off.

Both workflows use concurrency group `vps-docker-build` so staging and production image builds do not overlap on the VPS.

### 3. Wait without a Coolify API token

Health used to return only `{ status, timestamp }`. The previous container stays healthy during a rebuild, so HTTP 200 is not enough.

`/api/health` now includes `commit` from `SOURCE_COMMIT` (Coolify injects it; the Dockerfile copies it into the runner image). CI compares that to `github.sha`. No `COOLIFY_TOKEN`.

GitHub secrets needed: `COOLIFY_PRODUCTION_WEBHOOK_URL`, `INTERNAL_API_SECRET` (same value as the staging app). Staging Coolify env: `ALLOW_TEST_API=true`.

## App (staging E2E)

### Test APIs on a production Node container

The Coolify Next container runs `NODE_ENV=production`. `isTestApiEnvironmentAllowed()` is true when `ALLOW_TEST_API=true` or when the request host is staging. Production must not set that flag. Bearer auth on `/api/test/*` is unchanged.

### Signup

Staging redirects `/signup` without `?bypass=` to login. Public pages and member accounts work like production. Signup specs use a minted bypass token on the staging host. `createTestUser` only sets `asAdmin` when a spec asks for it.

Vercel bypass helpers were removed from `e2e/test-utils.ts`.

## Tooling

- **Vitest:** exclude `**/.next/**` and `**/node_modules/**` so copied Next Jest tests under `.next/standalone` are not run (`jest is not defined`).
- **lint-staged:** only `src/**` and `e2e/**`. Root configs like `vitest.config.ts` were crashing typescript-eslint under TypeScript 7.
- **TypeScript:** `typescript` is aliased to `@typescript/typescript6` so ESLint still has a compiler API. `tsc` remains TypeScript 7 via `@typescript/native`. TypeScript 7.0 does not export `ModuleKind.Cjs`, which is what caused `Cannot read properties of undefined (reading 'Cjs')`.

## All Modified Files

- `.env.example`
- `.github/workflows/ci.yml`
- `.github/workflows/release-please.yml`
- `.lintstagedrc.mjs`
- `Dockerfile`
- `README.md`
- `docs/deployment/coolify.md`
- `e2e/login.spec.ts`
- `e2e/onboarding.spec.ts`
- `e2e/signup.spec.ts`
- `e2e/test-utils.ts`
- `infra/coolify/production-checklist.md`
- `infra/coolify/production-cutover.md`
- `infra/imgproxy-color-profiles.md`
- `package.json`
- `pnpm-lock.yaml`
- `src/app/api/health/route.ts`
- `src/lib/auth/verifyInternalApi.test.ts`
- `src/lib/auth/verifyInternalApi.ts`
- `src/proxy.ts`
- `vitest.config.ts`
