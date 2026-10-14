# Files Changed - Member Gear and Catalog

## Overview

Members can record how they shoot, name a daily-driver body and lens, and keep a gear inventory. That shows up as a short summary on the public profile and a full list at `/@nickname/gear`. Names come from a catalog built from Lensfun, Wikidata, a small phone list, and camera/lens strings already stored on photos.

## Account and public pages

`/account/gear` is the editor. Shooting formats are a set of toggles (digital, analog, phone, and so on), with an optional label when "Other" is selected. Daily driver fields search the catalog as you type. The inventory can be sorted by type, name, recently added, or a custom drag order.

When the list is grouped by type, each heading has an add button (`Add lens`, `Add camera body`, …). That opens the same add form with the type already selected. The public gear page uses the same list component in read-only mode, so those buttons stay off.

The profile page renders `ProfileGearSummary` only when the member has shared formats, a daily driver, or at least one item. "My gear" is in the account menu.

Saving goes through `save_user_gear_profile`, which replaces the profile row and the item list in one call.

## Catalog

`gear_catalog` stores a source (`lensfun`, `wikidata`, `curated`, `exif`), a category, and a search string. `gear_catalog_aliases` holds extra names so a search can hit a model that is filed under another spelling.

Refresh pulls Lensfun XML from GitHub and camera bodies from Wikidata, then upserts them. Curated phones are a short in-repo list. Photo upload calls `/api/gear/ingest` with the new photo id so Make/Model and lens EXIF can be added as catalog rows.

Vercel cron (and the Coolify scheduled-task table) runs `/api/cron/refresh-gear-catalog` weekly (`0 4 * * 1`). `/api/cron/backfill-gear-from-exif` walks existing photos and is meant to be run once, not on a schedule.

Search (`/api/gear/search`) uses the alias table plus `buildPostgrestIlikeOr`, which also fixes admin member search so a query with commas or other PostgREST-special characters does not break the `.or()` filter.

## Form and carousel fixes

The add form reads category, name, catalog id, and note with `useWatch` instead of `useForm().watch()`, so React Compiler can memoize the component. The daily-driver inputs are controlled by the form value directly. Inventory actions passed up to the sticky bar are stored on a ref inside an effect, not during render.

The achievements carousel no longer leaves a disabled previous or next button on screen. The button is omitted when that direction cannot scroll.

Autocomplete suggestions render in a portal so the gear modal does not clip the list. The account gear save bar uses the terminal sticky gap so it sits flush with the mobile tab bar.

## All Modified Files

New:

- `changelog/2026-10-14/sha.txt`
- `changelog/2026-10-14/commit-message.txt`
- `changelog/2026-10-14/files-changed.md`
- `public/icons/drag-handle.svg`
- `public/icons/gear/format-analog.svg`
- `public/icons/gear/format-digital.svg`
- `public/icons/gear/format-drone.svg`
- `public/icons/gear/format-instant.svg`
- `public/icons/gear/format-lighting.svg`
- `public/icons/gear/format-lofi.svg`
- `public/icons/gear/format-other.svg`
- `public/icons/gear/format-phone.svg`
- `public/icons/gear/format-support.svg`
- `public/icons/gear/format-video.svg`
- `public/icons/gear/micro/category-accessories.svg`
- `public/icons/gear/micro/category-lens.svg`
- `public/icons/gear/micro/category-lighting.svg`
- `public/icons/gear/micro/category-support.svg`
- `public/icons/gear/micro/format-analog.svg`
- `public/icons/gear/micro/format-digital.svg`
- `public/icons/gear/micro/format-drone.svg`
- `public/icons/gear/micro/format-instant.svg`
- `public/icons/gear/micro/format-lofi.svg`
- `public/icons/gear/micro/format-other.svg`
- `public/icons/gear/micro/format-phone.svg`
- `public/icons/gear/micro/format-video.svg`
- `scripts/count-lensfun-parse.ts`
- `scripts/gear-catalog-stats.ts`
- `scripts/refresh-gear-catalog.ts`
- `src/app/[nickname]/gear/page.tsx`
- `src/app/account/gear/AccountGearClient.tsx`
- `src/app/account/gear/layout.tsx`
- `src/app/account/gear/page.tsx`
- `src/app/api/account/gear/route.ts`
- `src/app/api/cron/backfill-gear-from-exif/route.ts`
- `src/app/api/cron/refresh-gear-catalog/route.ts`
- `src/app/api/gear/ingest/route.ts`
- `src/app/api/gear/search/route.ts`
- `src/app/api/profiles/[nickname]/gear/route.ts`
- `src/components/gear/GearAccountPanel.tsx`
- `src/components/gear/GearAddEditForm.tsx`
- `src/components/gear/GearItemRow.tsx`
- `src/components/gear/GearPageClient.tsx`
- `src/components/gear/GearShootingPreferences.tsx`
- `src/components/gear/GearSortableList.tsx`
- `src/components/gear/sortGearItems.test.ts`
- `src/components/gear/sortGearItems.ts`
- `src/components/profile/ProfileGearSummary.tsx`
- `src/hooks/useGearAccountForm.ts`
- `src/hooks/useGearCatalogSearch.ts`
- `src/hooks/useGearProfile.ts`
- `src/lib/data/gear.ts`
- `src/lib/focusTrapPortals.ts`
- `src/lib/gear/__tests__/validateUserGearProfile.test.ts`
- `src/lib/gear/buildSearchText.ts`
- `src/lib/gear/catalogDb.ts`
- `src/lib/gear/curatedPhones.ts`
- `src/lib/gear/fetchUserGearProfile.ts`
- `src/lib/gear/gearAliasKey.test.ts`
- `src/lib/gear/gearAliasKey.ts`
- `src/lib/gear/gearCategoryIcons.tsx`
- `src/lib/gear/gearProfileEqual.ts`
- `src/lib/gear/gearProfileSchema.ts`
- `src/lib/gear/ingestFromExif.ts`
- `src/lib/gear/mapGearProfile.ts`
- `src/lib/gear/normalizeExifBrand.ts`
- `src/lib/gear/parseLensfunXml.ts`
- `src/lib/gear/refreshGearCatalog.ts`
- `src/lib/gear/sampleKit.ts`
- `src/lib/gear/saveUserGearProfile.ts`
- `src/lib/gear/searchCatalog.ts`
- `src/lib/gear/shootingFormatIcons.ts`
- `src/lib/gear/storage.ts`
- `src/lib/gear/triggerIngest.ts`
- `src/lib/gear/types.ts`
- `src/lib/gear/validateUserGearProfile.ts`
- `src/lib/gear/wikidataCatalog.test.ts`
- `src/lib/gear/wikidataCatalog.ts`
- `src/lib/search/fuzzyQuery.test.ts`
- `src/lib/search/fuzzyQuery.ts`

Modified:

- `README.md`
- `infra/coolify/scheduled-tasks.md`
- `public/noise-dark.svg`
- `src/app/[nickname]/(profile)/page.tsx`
- `src/app/api/admin/members/route.ts`
- `src/app/api/admin/search-members/route.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/members/page.tsx`
- `src/components/admin/AddRsvpModal.tsx`
- `src/components/layout/AccountMenuPanel.tsx`
- `src/components/layout/mobileChrome.ts`
- `src/components/shared/AutocompleteInput.tsx`
- `src/components/shared/Modal.tsx`
- `src/components/shared/ProfileActionsMenu.tsx`
- `src/components/shared/ProfileStatsBadges.tsx`
- `src/components/shared/Select.tsx`
- `src/components/shared/StickyActionBar.tsx`
- `src/components/shared/SuccessMessage.tsx`
- `src/config/routes.ts`
- `src/database.types.ts`
- `src/hooks/usePhotoUpload.ts`
- `src/utils/mobileTerminalStickySettle.ts`
- `src/utils/uploadPhoto.ts`
- `supabase/migrations/00000000000000_baseline.sql`
- `tailwind.config.ts`
- `vercel.json`
