# Files Changed - Force onboarding after login

## Overview

Onboarding was only enforced on `/account` and `/admin`. Logging in from a public page (`/members`, `/gallery`, `/@nickname`, …) skipped the gate entirely, so users without a nickname or screen name could browse the site. Help copy already said profile setup was required before accessing the full site.

Login and OAuth now send incomplete profiles to `/onboarding`. A `cpg_onboarding` cookie (`pending` or `complete`) keeps them there on later public navigations without calling `get_own_profile` on every gallery prefetch.

## Why the old gate missed first login

`isProfileComplete` still requires nickname, screen name (`full_name`), email, and `terms_accepted_at`. Proxy only ran that check on paths in `PROXY_PROFILE_PATHS` (`/account`, `/admin`, `/onboarding`, `/api`). `getPostLoginRedirect` only rewrote `/` and `/events` onto `/account/events` (which does force onboarding). Header login uses `?redirectTo=<currentPath>`, so the common path never hit a gated route.

## Login redirect

`getPostAuthRedirect(profile, redirectTo)` wraps the existing post-login destination. Incomplete or missing profiles go to `/onboarding?redirectTo=…`.

- Email login: `signInWithEmail` already loaded the profile for deletion/suspension checks; it now returns `needsOnboarding`. `LoginClient` pushes the onboarding URL when true.
- OAuth: `auth-callback` loads or creates the profile, then redirects with the cookie set on the same response.

## Classification cookie

`cpg_onboarding` is httpOnly, path `/`, 7-day max-age.

| Event | Cookie |
| --- | --- |
| OAuth callback after profile load/insert | `pending` or `complete` |
| Proxy already loaded `get_own_profile` | overwrite to match completeness |
| `POST /api/onboarding/revalidate` after finish | `complete` before any public redirect |
| Logout / no auth cookies | deleted |

Proxy rules (skip `/onboarding`, `/auth-callback`, `/api`, `/login`, `/logout`, help/terms/privacy):

- Auth cookies + `pending` → redirect to `/onboarding` (no RPC)
- Auth cookies + `complete` → continue (no RPC on public pages)
- Auth cookies + no cookie + `Sec-Fetch-Dest: document` → classify once
- Link prefetches (`Next-Router-Prefetch` / `Purpose: prefetch`) do not classify

If revalidate fails after onboarding submit, the client falls back to `/account/events` so the gated hop can still set `complete` and avoid a pending-cookie loop onto a public page.

## Tests

- `getPostAuthRedirect`: incomplete → onboarding with encoded `redirectTo`; listing pages still rewrite to `/account/events` first; complete profiles keep the destination
- Cookie helpers: `pending` redirects public paths; `complete` does not; missing cookie + document classifies; prefetch does not; `/onboarding` and `/api` are exempt
- E2E: incomplete user logs in with `redirectTo=/members` and must land on `/onboarding`

## All Modified Files

New:
- `src/utils/onboardingCookie.ts`
- `src/utils/onboardingCookie.test.ts`

Modified:
- `src/utils/postLoginRedirect.ts`
- `src/utils/profileCompletion.ts`
- `src/utils/security.test.ts`
- `src/context/authActions.ts`
- `src/context/AuthContext.tsx`
- `src/app/login/LoginClient.tsx`
- `src/app/auth-callback/route.ts`
- `src/proxy.ts`
- `src/app/actions/auth.ts`
- `src/app/api/onboarding/revalidate/route.ts`
- `src/app/onboarding/OnboardingClient.tsx`
- `e2e/onboarding.spec.ts`
- `changelog/2026-09-11/`
