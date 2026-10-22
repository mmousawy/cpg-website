# Files Changed - Photo library filters, batch capture details, map GPS picker

## Overview

Manage photos got a proper library filter bar (persisted locally and applied on the server), batch edit endpoints for titles/tags/albums and for capture metadata, and a much richer capture-details flow for one or many photos. GPS can be set with a Leaflet map and address search instead of typing coordinates. Global search surfaces gear and camera pages. Supabase fetch errors read more clearly in the UI. Coolify/nginx docs and scripts were updated for Supabase database hosts behind the proxy.

## Photo library filters

**Problem:** The manage grid only had coarse visibility toggles; finding “photos with this lens in that challenge” meant scrolling or exporting mentally.

**Solution:** `FilterPhotosModal` drives a `PhotoLibraryFilters` object (camera, lens, tags, albums, challenges, license, visibility, title text, upload presets, challenge status, sort). Values are stored in `localStorage` via `photoLibraryFiltersStorage.ts`. `managePhotosFetch.ts` and `photoQueryCache` pass the filter into list queries so pagination and deep links stay consistent. The photos page shows an active filter label and opens the modal from a filter control (`public/icons/filter.svg`).

## Batch photo and capture details

**Problem:** Multi-select could bulk-delete but not bulk-edit metadata the way the single-photo EXIF modal already worked.

**Solution:**

- `POST /api/photos/batch` and shared `batchUpdatePhotoDetails*` handle titles, tags, license, visibility, etc., calling `batch_update_photos` where appropriate.
- `POST /api/albums/photos/batch` updates album membership/sort via `batch_update_album_photos`.
- EXIF uses `batchUpdatePhotoExif` → `batch_update_photo_exif` with partial merge rules in `src/utils/exif.ts` (`mergeExifEditsPartial`, `getCommonExifFormValues`).
- `PhotoExifModal` accepts multiple photos: empty fields mean “leave each photo’s value”, with `bulkExifSaveConfirm` summarizing changes before save.
- Footer adds **Remove all data**; success shows a short **Saved** state with a check icon.
- `Input` / `AutocompleteInput` `filled` prop makes populated fields easier to scan.

`ManageLoadMoreSentinel.tsx` was removed; load-more behavior lives in the consolidated fetch path.

## Choose on map (GPS)

**Problem:** Google embed maps on the site are read-only; they cannot return the center after panning.

**Solution:** `LocationMapPickerModal` is a stacked `<dialog>` above the capture modal (`z-[70]`). Leaflet + OSM tiles, fixed center pin (`map-pin-solid.svg`), live coordinates under the map. Defaults: Rotterdam center, zoom 12 without GPS / 16 with existing coords. Authenticated `GET /api/location/search` proxies Nominatim (`searchPlaces.ts`) for address suggestions. Choosing a result flies the map; **Choose** writes lat/lng into the form (six decimal places). Spinner sits beside the search field without remounting the input (addon toggle was causing the text to vanish).

## Search, gear, and errors

- `global_search` wiring in `src/lib/data/search.ts` and UI in `SearchResultItem` / `SearchResults` include gear entities; `/members/camera/[name]` benefits from `searchGearPages`.
- `fetchWithFriendlyErrors` wraps Supabase `fetch` on browser and server clients so rate limits and gateway errors map to short user copy via `userFacingHttpError`.

## Infra

- `infra/nginx-db-production.conf` sample and staging nginx buffer tweaks; `fix-nginx-proxy-headers.sh` can discover DB vhosts.
- `docs/deployment/coolify.md` troubleshooting for 502s on Supabase hosts.

## All Modified Files

New:

- `changelog/2026-10-22/sha.txt`
- `changelog/2026-10-22/commit-message.txt`
- `changelog/2026-10-22/files-changed.md`
- `public/icons/filter.svg`
- `public/icons/map-pin-solid.svg`
- `src/app/api/albums/photos/batch/route.ts`
- `src/app/api/location/search/route.ts`
- `src/app/api/photos/batch/route.ts`
- `src/components/manage/FilterPhotosModal.tsx`
- `src/components/manage/LocationMapPickerModal.tsx`
- `src/components/manage/bulkExifSaveConfirm.test.ts`
- `src/components/manage/bulkExifSaveConfirm.tsx`
- `src/hooks/photoLibraryFilters.ts`
- `src/hooks/photoLibraryFiltersStorage.ts`
- `src/hooks/usePhotoLibraryFilterOptions.ts`
- `src/lib/gear/searchGearPages.test.ts`
- `src/lib/gear/searchGearPages.ts`
- `src/lib/location/mapDefaults.test.ts`
- `src/lib/location/mapDefaults.ts`
- `src/lib/location/mapTileLayer.ts`
- `src/lib/location/searchPlaces.ts`
- `src/lib/photos/batchUpdateAlbumPhotos.ts`
- `src/lib/photos/batchUpdatePhotoDetails.ts`
- `src/lib/photos/batchUpdatePhotoDetailsClient.ts`
- `src/lib/photos/batchUpdatePhotoDetailsSchema.ts`
- `src/lib/photos/batchUpdatePhotoExif.ts`
- `src/lib/photos/exifFormSchema.ts`
- `src/lib/photos/photoTagSync.test.ts`
- `src/lib/photos/photoTagSync.ts`
- `src/utils/supabase/fetchWithFriendlyErrors.ts`
- `src/utils/userFacingHttpError.test.ts`
- `src/utils/userFacingHttpError.ts`
- `infra/nginx-db-production.conf`

Modified:

- `package.json`
- `pnpm-lock.yaml`
- `AGENTS.md`
- `CHANGELOG.md`
- `.release-please-manifest.json`
- `docs/deployment/coolify.md`
- `infra/coolify/fix-nginx-proxy-headers.sh`
- `infra/supabase-staging/nginx-db-staging.conf`
- `src/app/account/(manage)/photos/page.tsx`
- `src/app/api/search/route.ts`
- `src/app/members/camera/[name]/page.tsx`
- `src/app/providers/ConfirmProvider.tsx`
- `src/components/manage/PhotoExifModal.tsx`
- `src/components/manage/index.ts`
- `src/components/search/SearchResultItem.tsx`
- `src/components/search/SearchResults.tsx`
- `src/components/shared/AutocompleteInput.tsx`
- `src/components/shared/ConfirmModal.tsx`
- `src/components/shared/Input.tsx`
- `src/components/shared/Select.tsx`
- `src/hooks/managePhotosFetch.ts`
- `src/hooks/photoQueryCache.ts`
- `src/hooks/useAlbumPhotoMutations.ts`
- `src/hooks/useManagePhotoDeepLink.ts`
- `src/hooks/usePhotoMutations.ts`
- `src/hooks/usePhotoUpload.ts`
- `src/hooks/usePhotos.ts`
- `src/lib/data/search.ts`
- `src/lib/gear/ingestFromExif.ts`
- `src/lib/gear/normalizeExifBrand.ts`
- `src/proxy.ts`
- `src/tours/photosFirstRunTour.ts`
- `src/types/search.ts`
- `src/utils/exif.test.ts`
- `src/utils/exif.ts`
- `src/utils/supabase/admin.ts`
- `src/utils/supabase/client.ts`
- `src/utils/supabase/server.ts`

Deleted:

- `src/components/manage/ManageLoadMoreSentinel.tsx`
