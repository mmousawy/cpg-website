# Files Changed - CI/CD Automation and Changelog Page

## Overview

Improved CI/CD workflow to use Vercel preview deployments for e2e testing and automate production deployments. Added version display throughout the app and created a changelog page.

## CI/CD Improvements

### 1. Vercel Preview Integration

**Problem:** E2E tests were building the app locally, duplicating work that Vercel already does. This slowed down CI and didn't test the actual deployment.

**Solution:** Configure CI to wait for Vercel preview deployments and run e2e tests against them.

**Changes:**
- Updated `.github/workflows/ci.yml` e2e job to:
  - Remove local build step
  - Wait for Vercel preview using `patrickedqvist/wait-for-vercel-preview` action
  - Pass preview URL to Playwright via `BASE_URL` env var
- Updated `playwright.config.ts` to:
  - Use `BASE_URL` env var when available (for CI)
  - Skip local server when using external URL

**Benefits:**
- Faster CI (no duplicate builds)
- Tests run against actual deployment
- Catches Vercel-specific build issues

### 2. Automatic Production Deployment

**Problem:** After release-please creates a release, production deployment was manual.

**Solution:** Automatically deploy to production after release is created.

**Changes:**
- Updated `.github/workflows/release-please.yml` to:
  - Install Vercel CLI
  - Deploy to production using `vercel deploy --prod`
  - Only runs when `release_created` is true

**Flow:**
```
Feature PR → Merge → Release-please → Release PR → Merge → Auto-deploy to prod
```

**Required Secrets:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### 3. Vercel Build Configuration

**Problem:** Vercel wasn't building previews for feature branches.

**Solution:** Configure Vercel ignore command to skip main and release branches, allowing all other branches to build.

**Vercel UI Configuration (manual):**
- Build and Deployment → Ignored Build Step → Project Settings
- Set to "Custom" with: `bash -c '[[ "$VERCEL_GIT_COMMIT_REF" == "main" || "$VERCEL_GIT_COMMIT_REF" =~ ^release/ ]]'`

## Version Display

### 1. Expose Version

**File: `next.config.ts`**

Added `NEXT_PUBLIC_APP_VERSION` environment variable that reads from `package.json`:

```typescript
env: {
  NEXT_PUBLIC_APP_VERSION: pkg.version,
},
```

### 2. Footer Version

**File: `src/components/layout/Footer.tsx`**

Added version display in footer:
- Shows as "v1.11.0" (or current version)
- Clickable link to changelog page
- Smaller text size (`text-xs`)
- Hover effect matches other footer links

### 3. Console Version

**File: `src/components/VersionLogger.tsx`** (new)

Client component that logs version to browser console on app load:
- Styled console log with app name and version
- Only logs if version is available

**File: `src/app/layout.tsx`**

Added `<VersionLogger />` component to root layout.

## Changelog Page

### 1. Changelog Page Component

**File: `src/app/changelog/page.tsx`** (new)

Server component that:
- Reads `CHANGELOG.md` from project root
- Parses markdown format (version headers, sections, bullet points)
- Displays entries in reverse chronological order
- Renders markdown links as clickable links
- Handles missing file gracefully

**Features:**
- Version headers: `## [1.11.0](url) (2026-01-21)`
- Section grouping: Features, Bug Fixes, etc.
- Link parsing: `[text](url)` → clickable links
- "View on GitHub" links for version comparisons
- Section ordering: Features first, then Bug Fixes, etc.

### 2. Route Configuration

**File: `src/config/routes.ts`**

Added changelog route:
```typescript
changelog: {
  label: 'Changelog',
  url: '/changelog',
}
```

## All Modified Files (8 total)

### New Files (2)
- `src/app/changelog/page.tsx` - Changelog page component
- `src/components/VersionLogger.tsx` - Version console logger

### Modified Files (6)
- `next.config.ts` - Expose version env variable
- `src/components/layout/Footer.tsx` - Add version display with link
- `src/app/layout.tsx` - Add VersionLogger component
- `playwright.config.ts` - Configurable baseURL for previews
- `.github/workflows/ci.yml` - Use Vercel preview for e2e
- `.github/workflows/release-please.yml` - Add production deploy
- `src/config/routes.ts` - Add changelog route

## Testing

### CI/CD Flow
1. Create feature PR → Vercel builds preview
2. CI waits for preview → Runs e2e tests against preview
3. Merge PR → Triggers release-please
4. Merge release PR → Auto-deploys to production

### Version Display
- Check footer shows current version
- Click version → navigates to `/changelog`
- Open browser console → see version log

### Changelog Page
- Navigate to `/changelog`
- Verify all versions display correctly
- Check links are clickable
- Verify section grouping works

## Manual Steps Required

1. **Add GitHub Secrets:**
   - `VERCEL_TOKEN` - Vercel Dashboard → Settings → Tokens
   - `VERCEL_ORG_ID` - Vercel Dashboard → Settings → General
   - `VERCEL_PROJECT_ID` - Vercel Project → Settings → General

2. **Configure Vercel UI:**
   - Build and Deployment → Ignored Build Step → Project Settings
   - Change to "Custom"
   - Enter: `bash -c '[[ "$VERCEL_GIT_COMMIT_REF" == "main" || "$VERCEL_GIT_COMMIT_REF" =~ ^release/ ]]'`
   - Save
