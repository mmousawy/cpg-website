# Legacy CI/CD setup

This folder preserves the previous GitHub Actions pipeline (removed in favor of a minimal setup). Use it as a reference for past learnings and workarounds.

## Files

| File | Purpose |
|------|---------|
| `ci.yml` | PR checks: lint/typecheck → unit tests → E2E against Vercel preview |
| `release-please.yml` | Custom release-please runner + promote preview to production |
| `release-please-ci.mjs` | Node entrypoint for release-please with API workarounds |

## Key learnings

### Release Please custom runner

GitHub's REST contents API intermittently returns HTML 502/503 "Unicorn" pages. The stock release-please action always fetches manifest/config via that API even when `actions/checkout` already has them on disk.

The custom runner (`release-please-ci.mjs`) addressed this by:

1. **Local file reads** — Reading `release-please-config.json` and `.release-please-manifest.json` from the checked-out workspace first, falling back to the API only when missing.
2. **Retry fetch** — Wrapping `globalThis.fetch` with up to 5 retries (30s backoff) on transient 5xx or HTML error pages.

The new setup uses the standard `googleapis/release-please-action@v4`. If Unicorn errors return, consider re-adopting the local-file-read pattern from `release-please-ci.mjs`.

### E2E preview URL discovery

The old CI workflow resolved the Vercel preview URL by:

1. Scraping the `vercel[bot]` comment on the PR via `gh pr view` + `grep`.
2. Falling back to the Vercel deployments API (`limit=1`) if no comment was found.
3. Polling the preview URL with `x-vercel-protection-bypass` until HTTP 200 (up to 10 minutes).

The new setup uses `patrickedqvist/wait-for-vercel-preview` to wait for the deployment and return the URL.

### Promote preview to production

On release, the old workflow:

1. Resolved the PR head SHA from a merge commit (`HEAD^2`) or fell back to `github.sha` for squash merges.
2. Looked up the preview deployment via Vercel API (`meta-githubCommitSha`).
3. Ran `vercel promote` on that deployment UID.
4. Fell back to `vercel deploy --prod` if promote failed or no preview was found.

This pairs with `vercel.json`'s `ignoreCommand` (`[ "$VERCEL_GIT_COMMIT_REF" = "main" ]`) so Vercel does not build production on main pushes — CI promotes the already-tested preview instead.

### Vercel Git auto-deploy vs. `ignoreCommand` (why we moved to CLI deploys)

We initially relied on Vercel's Git integration to build previews, and used `ignoreCommand` to control which refs build. This caused a cascade of problems:

1. **Duplicate previews** — a branch push and the PR event each triggered a build.
2. **Skipped builds** — trying to dedupe with `VERCEL_GIT_PULL_REQUEST_ID` backfired: that variable is an empty string on branch pushes (only set on the PR-triggered deploy), so `if [ -z "$VERCEL_GIT_PULL_REQUEST_ID" ]` skipped the push build that was often the only one.
3. **Unpredictable preview URL** — CI had to scrape the `vercel[bot]` comment or poll the API to find the URL Vercel chose.

Final decision: **disable Vercel Git auto-deploys** (`vercel.json` `git.deploymentEnabled: false`) and have GitHub Actions deploy the preview explicitly via the Vercel CLI (`vercel pull` / `vercel build` / `vercel deploy --prebuilt`). CI owns the deployment URL directly, tags it with `--meta githubCommitSha` for the promote job, then runs E2E against it. This removed the race condition, the duplicates, and the URL-discovery guesswork.
