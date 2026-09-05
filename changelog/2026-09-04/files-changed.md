# Files Changed - Changeable nicknames

## Overview

Members can change their nickname from Account settings using the same confirm-by-email pattern as email changes. The nickname does not update until they click a 24-hour link sent to their current address. After a change is applied, they must wait 60 days before changing again. Old `/@nickname` URLs (including albums and photos) 301 to the new nickname for one year via `nickname_redirects` and proxy middleware.

## Database

Migration `20260312000006_nickname_change_support.sql`:

- `profiles.nickname_changed_at` — set by trigger when a nickname is changed (not on first onboarding set).
- `nickname_redirects` — maps `old_nickname` → `profile_id` with `expires_at` one year out.
- `auth_tokens.new_nickname` + `nickname_change` token type for pending confirmations.
- `handle_profile_nickname_change` trigger enforces cooldown, writes redirects, and allows reclaiming your own old name.
- `resolve_nickname_redirect(p_nickname)` — used by proxy for 301s.
- `is_nickname_available(p_nickname, p_user_id)` — checks profiles, active redirects, and pending tokens.

## API & verification

- **POST `/api/account/change-nickname`** — validates nickname, cooldown, availability; stores token; emails confirmation.
- **GET `/auth/verify-nickname-change`** — applies nickname via admin client (trigger runs); revalidates old and new profile caches; redirects to `/account?nickname_changed=true`.

## UI

- `ChangeNicknameModal` — mirrors `ChangeEmailModal` (Send confirmation → Check your inbox).
- `ProfileSection` — disabled nickname field + Change button; cooldown messaging.
- `useAccountForm` — handles `nickname_changed` query param and exposes cooldown end date.

## Routing

`src/lib/nicknameRedirect.ts` + `proxy.ts`:

- `/@old/...` → `/@current/...` (301) when an unexpired redirect exists.
- Bare `/old/...` falls through to redirect table if not a live profile nickname.

## All Modified Files

New:
- `supabase/migrations/20260312000006_nickname_change_support.sql`
- `src/app/api/account/change-nickname/route.ts`
- `src/app/auth/verify-nickname-change/route.ts`
- `src/components/account/ChangeNicknameModal.tsx`
- `src/emails/auth/change-nickname.tsx`
- `src/lib/nicknameRedirect.ts`
- `src/utils/nickname.ts`
- `src/utils/nickname.test.ts`

Modified:
- `src/app/account/page.tsx`
- `src/app/api/cron/cleanup-deleted-content/route.ts`
- `src/app/email/[template]/page.tsx`
- `src/app/onboarding/OnboardingClient.tsx`
- `src/components/account/ProfileSection.tsx`
- `src/content/help/account.tsx`
- `src/content/help/getting-started.tsx`
- `src/database.types.ts`
- `src/hooks/useAccountForm.ts`
- `src/proxy.ts`
