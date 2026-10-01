# Files Changed - Staging Members, Live Album Likes, Full Onboarding E2E

## Overview

Staging is no longer an admin-only site. Public pages and regular member accounts work like production; the only extra lock is invite-only signup. Album detail likes now read a live count (and revalidate the page type) so a like shows up without a hard refresh. Onboarding Playwright walks every wizard field and checks that those values persist on `/account`.

## Staging access

**Problem:** The proxy treated staging as admin-only: anonymous visitors were sent to login, and signed-in non-admins were signed out with `staging_admin_only`. That blocked realistic member E2E and made staging useless for browsing.

**Solution:** Staging only invite-gates `/signup` when there is no `?bypass=` token. Public API routes and profile loading use the same paths as production.

```ts
if (isStagingDeployment() && matchesRoute('/signup') && !request.nextUrl.searchParams.get('bypass')) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('error', 'staging_no_signup');
  return withLegacyAuthCookieCleanup(request, NextResponse.redirect(url));
}
```

Login no longer handles `staging_admin_only`. The remaining copy is invite-only signup.

E2E `createTestUser` still defaults to `asAdmin` on the staging host until this proxy is actually deployed (the running container can still sign out members). Specs that need a real member can pass `{ asAdmin: false }` after that.

## Album likes without a refresh

**Problem:** Album `likes_count` lived behind `'use cache'` on the page payload. `expireTag` runs on the likes API instance; the next anonymous GET often hit a different instance that still had the old count, so E2E (and users) saw a stale heart until a hard refresh.

**Solution:** Same pattern as profile follow counts. `getAlbumLikesCount` is a live query with no `'use cache'`. The album page overlays that number on the cached album object. `revalidateAlbumLikes` also calls `revalidatePath('/[nickname]/album/[albumSlug]', 'page')`.

```ts
export async function getAlbumLikesCount(albumId: string): Promise<number> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('albums')
    .select('likes_count')
    .eq('id', albumId)
    .maybeSingle();

  return data?.likes_count ?? 0;
}
```

## Onboarding E2E

The wizard tests used to fill nickname, screen name, avatar, and terms, then skip the rest.

They now fill:

- **About you:** nickname, screen name, bio, interests (Enter to add chips), email only if that field is visible
- **Style:** Dark theme, Compact album cards, avatar crop, banner crop
- **Email prefs:** every checkbox is touched; newsletter is left off
- **Finish:** terms, then Join (or “Test form validation” in preview)

After Join, `/account` is checked for those values (screen name, nickname, bio, interest chips, Dark, Compact, newsletter off / other prefs on, avatar).

On staging, the banner is filled in the wizard then removed before Join because the `user-banners` storage bucket is still missing and Join would fail with “Bucket not found”. Locally the banner is kept and asserted.

## Playwright vs staging Auth

Local `.env.local` can point `NEXT_PUBLIC_SUPABASE_URL` at `db-staging` while still using production JWT keys. Hitting `localhost:3000` then fails Auth with invalid credentials.

Playwright now loads `.env.local` (quietly) and, unless `BASE_URL` is set, defaults to `https://staging.creativephotography.group` when the Supabase URL is the staging host. `webServer` is skipped in that case so tests do not boot a local Next against the wrong keys.

Revalidation afterAll no longer throws if a user was never created. Member RSVP still treats HTTP 400 “already signed up” as success while E2E users are admins (event create auto-RSVPs all admins).

## Docs

Staging checklist smoke tests expect public pages without login, invite-only `/signup`, and a non-admin member reaching `/account`. The isolated Supabase README says the same: invite-only signup, not an admin-only site.

Yesterday’s `changelog/2026-10-01/files-changed.md` was updated so it no longer describes the old admin-only proxy.

## All Modified Files

New:

- `changelog/2026-10-02/sha.txt`
- `changelog/2026-10-02/commit-message.txt`
- `changelog/2026-10-02/files-changed.md`

Modified:

- `README.md`
- `changelog/2026-10-01/files-changed.md`
- `e2e/onboarding.spec.ts`
- `e2e/revalidation.spec.ts`
- `e2e/test-utils.ts`
- `infra/coolify/staging-checklist.md`
- `infra/supabase-staging/README.md`
- `playwright.config.ts`
- `src/app/[nickname]/album/[albumSlug]/page.tsx`
- `src/app/actions/__tests__/revalidate.test.ts`
- `src/app/actions/revalidate.ts`
- `src/app/login/LoginClient.tsx`
- `src/lib/data/likes.ts`
- `src/proxy.ts`
