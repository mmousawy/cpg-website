# Files Changed - Scene Events, Date UX, and UI Polish

## Overview

Adds a new "Scene" section for community-curated photography events (exhibitions, photowalks, talks, workshops, festivals, meetups). Members can submit events, mark interest, and comment. Admins moderate via the admin panel; scene events are reportable. Also includes date formatting improvements (omit year when current year), server component fixes for Next.js prerender, and assorted UI polish (rich text focus, Select component, Comments, HelpLink, scene event cards).

## Scene Events Feature

### Database

**New tables:**
- `scene_events` – Event metadata (title, category, dates, location, organizer, price_info, cover image, etc.), full-text search via `search_vector`
- `scene_event_comments` – Links comments to scene events (reuses `comments` table)
- `scene_event_interests` – Users who marked interest

**New functions:**
- `add_scene_event_comment(p_scene_event_id, p_comment_text, p_parent_comment_id)` – SECURITY DEFINER RPC to create comment and link to scene event
- `update_scene_event_interest_count` – Trigger to maintain `interest_count` on `scene_events`

**Categories:** exhibition, photowalk, talk, workshop, festival, meetup, other

**RLS:** Authenticated users can add events (submitted_by = auth.uid()), add interest, add comments. Anon/authenticated can read live events. Submitter or admin can update/delete. Reports `entity_type` extended to include `scene_event`.

### Routes & Pages

- `/scene` – Upcoming and past scene events with category filter
- `/scene/[slug]` – Detail page with cover image, date/time, location, organizer, price, description, related events, interest section, comments
- `/admin/scene` – Admin listing and moderation

### Data Layer

**File: `src/lib/data/scene.ts`** (new)

- `getAllSceneEventSlugs()` – For generateStaticParams
- `getUpcomingSceneEvents()` – Cached, tag `scene`
- `getPastSceneEvents(limit)` – Cached, tag `scene`
- `getSceneEventBySlug(slug)` – Detail fetch
- `getRelatedSceneEvents(id, city, category, limit)`
- `getSceneEventInterests(ids)`
- `getPastSceneEventsPaginated(limit, cursor)`

### API Routes

- `POST /api/scene/submit` – Create scene event
- `PATCH /api/scene/[id]` – Update or soft-delete
- `POST /api/scene/interest` – Toggle interest
- `GET /api/scene/past` – Paginated past events

### Components

- `ScenePageContent` – Main listing with category filter
- `SceneEventCard` – Card with date, location, price, thumbnail, interest avatars
- `SceneCoverImage` – Detail page cover with zoom
- `SceneEventStickyBar` – Mobile sticky CTA
- `SceneEventInterestSection` – Interest button + avatars
- `SceneEventComments` – Comment thread for scene events
- `SceneActionsPopover` / `SceneActionsMenu` – Edit, delete, report
- `AddSceneEventModal` / `AddSceneEventButton` / `EditSceneEventModal`
- `SceneCategoryFilter` / `PastSceneEventsPaginated`

### Revalidation

- `revalidateScene()` – Invalidates `scene` and `search` tags
- `revalidateSceneEvent(slug)` – Granular invalidation for a single event
- `revalidateAll()` includes `scene` and `home` tags

## Date Formatting

Omit the year when the date falls in the current year across 19+ components:

**Logic:** `isCurrentYear = date.getFullYear() === new Date().getFullYear()`; if true, don't include year in formatted string.

**Updated files:**
- `formatDate` / `formatDateTimeRange` in `SceneEventCard`, `scene/[slug]/page`
- `formatEventDate` in `EventCard` (showYear only when not current year)
- `AlbumMiniCard`, `AlbumListItem`, `PhotoListItem`, `MemberTable`
- `ChallengeHeader`, `challenges/[slug]/page`, `account/challenges/page`
- `ProfileStatsBadges`, `PhotoPageContent`, `AlbumContent`, `ContentHeader`
- `AccountStatsSection`, `admin/events/attendance`, `admin/scene/page`
- `EventsList`, `SignupForm`, `ConfirmBlock`, `CancelBlock`, `events/[eventSlug]/page`

**Server component fix:** `scene/[slug]/page` calls `await connection()` before `new Date()` to satisfy Next.js prerender rules (access dynamic data before using current time).

## Modal & Navigation

### ModalProvider / Modal

Added unsaved changes guard for modals:

- `requestClose()` checks `beforeCloseCheck` callback before closing. If the callback returns `false`, the close is aborted (e.g. to prompt "discard unsaved changes?").
- `setBeforeCloseCheck(fn)` registers the guard callback, cleared automatically when modal closes.
- `flushContentTop` / `setFlushContentTop` removes top padding from modal content area (used by scene event form to maximize space).
- `Modal.tsx` routes all close actions (X button, escape, overlay click) through `requestClose` instead of direct `setIsOpen(false)`.

### NavigationProgress

- **Safety timeout:** 8-second auto-cancel if no pathname change occurs after a click (handles `preventDefault` on links, modal opens, etc.).
- **Skip dummy hrefs:** Ignores `href="#"` and empty href so progress bar doesn't start for non-navigating clicks.
- **Bubble phase:** Changed from capture phase (`true`) to bubble phase so `defaultPrevented` is correctly set by event handlers that prevent navigation.

### Header / MobileMenu

- Scene link added to desktop navigation (between Events and Challenges).
- Scene link added to mobile menu with globe icon.
- Desktop nav gap tightened (`gap-6` → `gap-5`, `gap-5` → `gap-4`) to accommodate the extra link.

## Rich Text & Forms

### RichTextEditor

Added `minimalToolbar` prop for a stripped-down editing experience:

- **Full toolbar:** bold, italic, underline, headings, link, image, lists, blockquote, clean
- **Minimal toolbar:** bold, italic, underline, link, lists, clean
- Formats array also switches between `FORMATS_FULL` and `FORMATS_MINIMAL` to prevent pasting unsupported content.
- Image upload handler, image size toolbar, and file input are all hidden when `minimalToolbar` is true.

### RichTextDescriptionField

- Forwards `minimalToolbar` and `className` props to `RichTextEditor`.
- When `minimalToolbar` is true, `onImageUpload` is not passed.

### useFormChanges

Added rich text awareness to avoid false "unsaved changes" from empty editor markup:

- `richTextFields` option: list of keys whose values should use HTML-normalized comparison.
- `normalizeRichTextForCompare()`: strips HTML tags and `&nbsp;`, so Quill's default `<p><br></p>` is treated as equal to `""`.
- `skipSync` option: when true, syncs `false` to the UnsavedChangesContext (used after successful form submission to prevent stale warnings).
- Admin challenge and event forms now pass `richTextFields: ['prompt']` / `richTextFields: ['description']`.

## UI Polish

### Rich Text Editor

- Focus: highlight border instead of 2px outline
- `outline: none` on `.ql-editor:focus` and `.ql-container:focus-within`
- `:has()` selector so toolbar border matches container on focus
- `transition: border-color 0.15s ease` on toolbar and container

### Select Component

- Canonical Tailwind v4 classes: `min-w-(--radix-select-trigger-width)`, `data-highlighted:bg-foreground/5`, `data-disabled:pointer-events-none`, `data-disabled:opacity-50`
- `mono` prop for privacy dropdown (photos page)
- Trigger height 36px (`py-[7px]`)
- `font-sans` on dropdown content

### Comments

- `border-l-1` → `border-l`
- Reply indent styling

### HelpLink

- Less prominent on large headings
- Vertical alignment tweaks

### SceneEventCard

- Date/location icon: `items-start` + `mt-[3px]` so icon aligns to first row
- Location on its own row (`space-y-1`)
- Date/location text darker (`text-foreground/90`)
- Image borders (`border border-border-color`)

### Scene Cover Image (detail page)

- Same `border border-border-color` on mobile and desktop containers

### Popover

- Added `side` prop (`'top'` | `'bottom'`) for vertical placement. Default remains `'bottom'`. Used by scene event interest section for upward popover placement.

### StackedAvatarsPopover

- `popoverSide` prop: passes `side` to `Popover` for top/bottom placement.
- `disableLinks` prop: renders person rows as `<div>` instead of `<Link>` to avoid nested `<a>` elements (used when the popover is inside a card link like `SceneEventCard`).
- Refactored person list rendering to use a dynamic `Wrapper` component (`Link` or `'div'`).

### ReportModal

- `entityType` now uses `ReportEntityType` from `@/types/reports` (includes `'scene_event'`).

### Members Page

- Skeleton improvements (height matching, third line for badges)
- Staggered pulse animation delays
- Responsive title (`text-2xl sm:text-3xl`)
- `?skeleton` query param for testing

## Other Changes

- **Comments API** – Extended for `scene_event` entity; uses `add_scene_event_comment` RPC when applicable
- **Reports** – `entity_type` check includes `'scene_event'`
- **Routes** – `scene`, scene event detail; admin scene link in admin layout
- **Help** – `scene.tsx` content, added to help index
- **formatPrice** – Utility for price display (free vs paid)
- **generateBlurhashServer** – Server-side blurhash generation for scene covers
- **OG metadata** – `lib/og.ts` for scene event pages
- **Notifications** – `scene_event` type in NotificationContent

## All Modified Files

### New Files (24)

- `public/icons/hero-calendar.svg`
- `public/icons/hero-clock.svg`
- `public/icons/hero-communities.svg`
- `public/icons/hero-currency.svg`
- `public/icons/hero-globe.svg`
- `public/icons/hero-map-pin.svg`
- `public/icons/star-filled.svg`
- `public/icons/star-outline.svg`
- `src/app/admin/scene/layout.tsx`
- `src/app/admin/scene/page.tsx`
- `src/app/api/scene/interest/route.ts`
- `src/app/api/scene/submit/route.ts`
- `src/app/api/scene/past/route.ts`
- `src/app/api/scene/[id]/route.ts`
- `src/app/scene/page.tsx`
- `src/app/scene/[slug]/page.tsx`
- `src/components/scene/AddSceneEventButton.tsx`
- `src/components/scene/AddSceneEventModal.tsx`
- `src/components/scene/EditSceneEventModal.tsx`
- `src/components/scene/SceneEventCard.tsx`
- `src/components/scene/SceneCoverImage.tsx`
- `src/components/scene/SceneActionsPopover.tsx`
- `src/components/scene/SceneActionsMenu.tsx`
- `src/components/scene/SceneCategoryFilter.tsx`
- `src/components/scene/ScenePageContent.tsx`
- `src/components/scene/SceneEventStickyBar.tsx`
- `src/components/scene/SceneEventComments.tsx`
- `src/components/scene/SceneEventInterestSection.tsx`
- `src/components/scene/PastSceneEventsPaginated.tsx`
- `src/content/help/scene.tsx`
- `src/hooks/useSceneEvents.ts`
- `src/lib/data/scene.ts`
- `src/lib/og.ts`
- `src/types/scene.ts`
- `src/utils/formatPrice.ts`
- `src/utils/generateBlurhashServer.ts`

### Modified Files (46)

- `README.md`
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx`
- `src/app/account/(manage)/photos/page.tsx`
- `src/app/account/challenges/page.tsx`
- `src/app/actions/revalidate.ts`
- `src/app/admin/challenges/[slug]/page.tsx`
- `src/app/admin/events/[eventId]/page.tsx`
- `src/app/admin/events/attendance/[eventId]/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/reports/page.tsx`
- `src/app/api/comments/route.ts`
- `src/app/api/reports/route.ts`
- `src/app/cancel/[uuid]/CancelBlock.tsx`
- `src/app/challenges/[slug]/page.tsx`
- `src/app/confirm/[uuid]/ConfirmBlock.tsx`
- `src/app/events/[eventSlug]/page.tsx`
- `src/app/globals.css`
- `src/app/members/page.tsx`
- `src/app/providers/ModalProvider.tsx`
- `src/components/account/AccountStatsSection.tsx`
- `src/components/admin/MemberTable.tsx`
- `src/components/album/AlbumMiniCard.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/components/challenges/ChallengeHeader.tsx`
- `src/components/events/EventCard.tsx`
- `src/components/events/EventsList.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/MobileMenu.tsx`
- `src/components/layout/NavigationProgress.tsx`
- `src/components/manage/AlbumListItem.tsx`
- `src/components/manage/PhotoListItem.tsx`
- `src/components/notifications/NotificationContent.tsx`
- `src/components/photo/PhotoPageContent.tsx`
- `src/components/shared/Comments.tsx`
- `src/components/shared/ContentHeader.tsx`
- `src/components/shared/HelpLink.tsx`
- `src/components/shared/Modal.tsx`
- `src/components/shared/Popover.tsx`
- `src/components/shared/ProfileStatsBadges.tsx`
- `src/components/shared/ReportModal.tsx`
- `src/components/shared/RichTextDescriptionField.tsx`
- `src/components/shared/RichTextEditor.tsx`
- `src/components/shared/Select.tsx`
- `src/components/shared/StackedAvatarsPopover.tsx`
- `src/config/routes.ts`
- `src/content/help/index.ts`
- `src/database.types.ts`
- `src/hooks/useFormChanges.ts`
- `src/types/notifications.ts`
- `src/types/reports.ts`
- `supabase/migrations/00000000000000_baseline.sql`
