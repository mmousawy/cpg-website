# Files Changed - Member @mentions and photo spot tags

## Overview

Members can `@nickname` each other in comments and in photo/album descriptions, with autocomplete ranked by nickname prefix and trigram similarity. Photo owners (and admins) can place spot tags on the detail image. Mention and tag activity creates in-app notifications and optional debounced emails under the existing **Notifications** email preference. Members can opt out of being tagged; that removes stored mention rows and photo dots without rewriting comment text.

Schema changes were applied on production and consolidated into `00000000000000_baseline.sql` via `pnpm db:sync` (no long-lived dated migration files in the tree for this feature).

## Mentions in text

**Parsing** (`parseMentions.ts`): split URLs first, then `@nickname` tokens bounded like production comments. Invalid or duplicate nicknames are dropped. **Sync** (`syncContentMentions.ts`) resolves profiles, diffs `content_mentions`, and schedules `mention_comment` / `mention_photo` / `mention_album` only for newly inserted rows—skipping the author, opted-out members (except self-mention), and comment flows where the recipient already gets the comment/reply notification.

**Call sites:**

- `POST`/`PATCH` `/api/comments` (re-reads stored `comment_text` after update)
- `batchUpdatePhotoDetails` when description actually changes
- `POST /api/mentions/sync` after album create/update from `useAlbumMutations`

**Composer** (`MentionField.tsx`): contenteditable (plain string in the DB), `MentionSuggestionList` on `@` + query via `/api/members/mention-search`, committed chips with hover card. Clicks on committed mentions do not reopen the picker.

**Display** (`MentionText.tsx` + `MentionDirectoryProvider` in comments): URLs still auto-link; linkable mentions use `MemberHoverCard` and `/@nickname`.

## Photo spot tags

**API** `/api/photos/[photoId]/member-tags`: `GET` (tags + `canEdit`), `POST` insert/move, `DELETE` by `profileId`. Notifications use `photo_member_tag` with the same email pipeline as mentions.

**UI** (`PhotoMemberTags.tsx` on `PhotoWithLightbox`, list in `PhotoPageContent` sidebar). **Profile** `getPhotosTaggedWithMember` + **Tagged** section on `/@nickname`.

## Opt-out

`profiles.allow_member_tags` (default true). Account → Your public profile checkbox wired through `useAccountForm`. Turning it off runs `clear_mentions_on_tag_opt_out` (deletes `content_mentions` and `photo_member_tags` for that profile). Help and Notifications email type copy mention @mentions and photo tags.

## Database (baseline)

| Object | Role |
|--------|------|
| `content_mentions` | Mention index keyed by user id (server writes only) |
| `photo_member_tags` | One tag per profile per photo; x/y in 0–1 |
| `search_mention_members` | Prefix + `similarity()` ordering for picker |
| RLS on `content_mentions` | `Service role manages content mentions`; anon/authenticated revoked |

Column-level `GRANT SELECT(allow_member_tags)` on `profiles` so `search_mention_members` can read the flag under invoker security.

## Notifications & email

New types: `mention_comment`, `mention_photo`, `mention_album`, `photo_member_tag`. Template `mention_notification` and `mentionEmailCopy` separate from comment mail. `scheduleNotification` pending-email union extended for mention/photo-tag batches.

## Small fixes

- `globals.css`: `[contenteditable]:focus-visible` outline removed like inputs/textareas
- `Toggle.tsx`: focus ring on the track when the hidden checkbox is focused

## All Modified Files

**New:**

- `changelog/2026-11-12/sha.txt`
- `changelog/2026-11-12/commit-message.txt`
- `changelog/2026-11-12/files-changed.md`
- `src/app/api/members/mention-directory/route.ts`
- `src/app/api/members/mention-search/route.ts`
- `src/app/api/mentions/sync/route.ts`
- `src/app/api/photos/[photoId]/member-tags/route.ts`
- `src/components/photo/PhotoMemberTags.tsx`
- `src/components/shared/MentionField.tsx`
- `src/components/shared/MentionSuggestionList.tsx`
- `src/components/shared/MentionText.tsx`
- `src/emails/mention-notification.tsx`
- `src/hooks/useMentionSearch.ts`
- `src/lib/mentions/parseMentions.test.ts`
- `src/lib/mentions/parseMentions.ts`
- `src/lib/mentions/syncContentMentions.ts`
- `src/lib/mentions/types.ts`
- `src/lib/notifications/mentionEmailCopy.ts`

**Modified:**

- `README.md`
- `src/app/[nickname]/(profile)/page.tsx`
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx`
- `src/app/api/comments/route.ts`
- `src/app/globals.css`
- `src/components/account/PublicProfileSection.tsx`
- `src/components/manage/BulkPhotoEditForm.tsx`
- `src/components/manage/SharedAlbumEditForm.tsx`
- `src/components/manage/SingleAlbumEditForm.tsx`
- `src/components/manage/SinglePhotoEditForm.tsx`
- `src/components/notifications/NotificationContent.tsx`
- `src/components/photo/PhotoPageContent.tsx`
- `src/components/photo/PhotoWithLightbox.tsx`
- `src/components/shared/Comments.tsx`
- `src/components/shared/DetailSidebar.tsx`
- `src/components/shared/Toggle.tsx`
- `src/content/help/account.tsx`
- `src/database.types.ts`
- `src/emails/weekly-digest.tsx`
- `src/hooks/useAccountForm.ts`
- `src/hooks/useAlbumMutations.ts`
- `src/lib/data/profiles.ts`
- `src/lib/email/renderDebouncedEmailBatch.tsx`
- `src/lib/email/templateKeys.ts`
- `src/lib/notifications/emailQueue.ts`
- `src/lib/notifications/schedule.ts`
- `src/lib/photos/batchUpdatePhotoDetails.ts`
- `src/types/notifications.ts`
- `supabase/migrations/00000000000000_baseline.sql`

**After deploy:** invalidate changelog cache with `GET /api/revalidate-changelog?secret=REVALIDATION_SECRET` once this commit is live.
