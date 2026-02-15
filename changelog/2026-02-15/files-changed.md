# Files Changed - Help & FAQ, Sign-up CTAs, Event Attendance Badges

## Overview

Added a comprehensive Help & FAQ page with content extracted from docs, an expandable mobile nav, and contextual help links. Introduced SignUpCTA components to prompt anonymous users to sign up across key pages. Added "You went!" badges for past events the user attended. Hourly cron job to revalidate events cache. Standardized avatar fallbacks and fixed challenge contributor display.

## Help & FAQ System

### 1. Help Page (`src/app/help/page.tsx`)

New page at `/help` with:
- Header: "Help & FAQ" with description
- Two-column layout on desktop: sticky sidebar + main content
- Sections: Getting started, Events, Photos & gallery, Challenges, Account
- Each section uses `HelpAccordion` for expandable Q&A items
- "Still have questions? Contact us" link at bottom
- Smooth scroll with `scroll-mt` for anchor navigation

### 2. FAQ Content (`src/content/help/`)

Content split by category, loaded via `helpSections`:

| File | Topics |
|------|--------|
| `getting-started.tsx` | Account creation, RSVP, events, photos |
| `events.tsx` | RSVP, calendar, attendance, cancellations |
| `photos.tsx` | Upload, albums, visibility, EXIF, likes |
| `challenges.tsx` | Submissions, review, badges |
| `account.tsx` | Profile, notifications, settings |

Each exports a `FAQSection` with `id`, `title`, and `items` (Q&A pairs). Types in `types.ts`.

### 3. HelpAccordion (`src/components/shared/HelpAccordion.tsx`)

Reusable accordion for FAQ items:
- Button with title and chevron (rotates on expand)
- Animated height transition for content
- `id` for deep-linking (e.g. `/help#how-do-i-rsvp`)

### 4. HelpLink (`src/components/shared/HelpLink.tsx`)

Contextual help icon link:
- Renders question-mark-circle icon
- `href` can be section id (`how-do-i-rsvp`) or full path (`/help#events`)
- Resolves to `/help#${href}` when href doesn't start with `/`
- Used in event pages, signup flows, etc.

### 5. HelpMobileNav (`src/components/help/HelpMobileNav.tsx`)

Mobile-only sticky bottom bar:
- Collapsed: "Jump to section" with chevron
- Expanded: list of section links (max height ~280px)
- Placed outside PageContainer so it spans full width
- Closes on link click, outside click, or Escape
- `pb-[env(safe-area-inset-bottom)]` for notched devices

### 6. Routes & Footer

- `src/config/routes.ts`: Added `help: { label: 'Help', url: '/help' }`
- `src/components/layout/Footer.tsx`: Help link between Contact and version

### 7. Scroll Behavior (`src/app/globals.css`)

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 7rem;
}
```

Sections use `-scroll-mt-4` for correct anchor positioning below header.

## Sign-up CTAs

### SignUpCTA Component (`src/components/shared/SignUpCTA.tsx`)

Two variants for prompting anonymous users to sign up:

**Banner variant** (`variant="banner"`):
- Full-width hero image with overlay
- "Share Your Vision With the Community" headline
- Sign up + "Learn more" (links to /help) buttons
- Used on home page

**Inline variant** (default):
- Compact gradient container
- "Want to join the fun? Sign up to RSVP..." text
- Sign up button
- Used in gallery, events, challenges, members

Renders nothing when user is logged in or auth is loading.

### Integration

SignUpCTA added to:
- `src/app/page.tsx` — banner on home
- `src/app/gallery/page.tsx` — inline
- `src/app/events/page.tsx` — inline
- `src/app/challenges/page.tsx` — inline
- `src/app/members/page.tsx` — inline
- Auth pages (login, signup, forgot-password, onboarding) — HelpLink for contextual help

## Event Attendance Badges

### UserWentBadge (`src/components/events/UserWentBadge.tsx`)

Shows "You went!" when the current user attended a past event (has `attended_at` in `events_rsvps`).

- Queries `events_rsvps` for `event_id` + `user_id` + `attended_at` not null
- Renders nothing if not attended or not logged in
- Variants:
  - `default`: standard badge (bg-primary)
  - `overlay`: for hero overlay (backdrop-blur, lighter bg)

### Integration

- `EventCard`: `rightSlot` prop used to render UserWentBadge for past events
- `src/app/events/[eventSlug]/page.tsx`: UserWentBadge in hero overlay for past events

## Events Cache Revalidation

### Cron Job (`src/app/api/cron/revalidate-events/route.ts`)

New Vercel Cron job running hourly (`1 * * * *`):
- Authenticates via `Authorization: Bearer ${CRON_SECRET}`
- Calls `revalidateTag('events', 'max')` and `revalidateTag('home', 'max')`
- Ensures event listings and home page stay fresh

### vercel.json

```json
{"path":"/api/cron/revalidate-events","schedule":"1 * * * *"}
```

## Avatar & UI Fixes

### Avatar Fallbacks

- **Avatar.tsx**: Added `usePersonIconFallback` — when true, shows person icon instead of initials when no image (e.g. header)
- **ClickableAvatar.tsx**: Standardized fallback to initials or person icon
- **MemberTable, NotificationContent, ChallengeCard**: Consistent avatar fallback behavior
- **StackedAvatarsPopover**: Handles missing full_name/nickname for AvatarPerson

### Challenge Contributors

- `src/lib/data/challenges.ts`: Order contributors by first submission
- Fix "?" initials for contributors without `full_name` or `nickname`

## View Tracker

- `src/components/shared/ViewTracker.tsx`: Enhanced tracking logic
- `src/hooks/useViewTracker.ts`: Hook improvements
- `src/app/api/views/route.ts`: Route updates

## All Modified Files (59 total)

### New Files (15)
- `public/icons/question-mark-circle.svg` — Help icon
- `src/app/api/cron/revalidate-events/route.ts` — Hourly events revalidation
- `src/app/help/page.tsx` — Help & FAQ page
- `src/components/events/UserWentBadge.tsx` — "You went!" badge
- `src/components/help/HelpMobileNav.tsx` — Mobile section nav
- `src/components/shared/HelpAccordion.tsx` — FAQ accordion
- `src/components/shared/HelpLink.tsx` — Contextual help link
- `src/components/shared/SignUpCTA.tsx` — Sign-up prompts
- `src/content/help/account.tsx` — Account FAQ
- `src/content/help/challenges.tsx` — Challenges FAQ
- `src/content/help/events.tsx` — Events FAQ
- `src/content/help/getting-started.tsx` — Getting started FAQ
- `src/content/help/index.ts` — helpSections export
- `src/content/help/photos.tsx` — Photos FAQ
- `src/content/help/types.ts` — FAQSection, FAQItem types

### Modified Files (44)
- `README.md`, `docs/README.md`
- `next.config.ts`, `tailwind.config.ts`, `vercel.json`
- `src/app/globals.css` — scroll behavior
- `src/app/page.tsx` — SignUpCTA banner
- `src/app/[nickname]/album/[albumSlug]/AlbumContent.tsx`
- `src/app/account/(manage)/albums/page.tsx`, `photos/page.tsx`
- `src/app/account/activity/ActivityContent.tsx`
- `src/app/account/challenges/page.tsx`, `events/page.tsx`
- `src/app/admin/events/page.tsx`
- `src/app/api/views/route.ts`
- `src/app/challenges/[slug]/page.tsx`, `challenges/page.tsx`
- `src/app/events/[eventSlug]/page.tsx` — UserWentBadge
- `src/app/events/page.tsx` — SignUpCTA
- `src/app/forgot-password/ForgotPasswordClient.tsx` — HelpLink
- `src/app/gallery/albums/page.tsx`, `gallery/page.tsx`, `gallery/photos/page.tsx` — SignUpCTA
- `src/app/login/LoginClient.tsx`, `signup/SignupClient.tsx`, `onboarding/OnboardingClient.tsx` — HelpLink
- `src/app/members/page.tsx` — SignUpCTA
- `src/components/admin/MemberTable.tsx` — avatar fallback
- `src/components/auth/Avatar.tsx` — usePersonIconFallback
- `src/components/challenges/ChallengeCard.tsx` — contributor fix
- `src/components/events/EventCard.tsx` — UserWentBadge, rightSlot
- `src/components/events/EventsList.tsx`
- `src/components/layout/Footer.tsx` — help link
- `src/components/layout/Header.tsx`, `UserMenu.tsx` — avatar
- `src/components/notifications/NotificationContent.tsx`
- `src/components/photo/PhotoPageContent.tsx`
- `src/components/shared/ActivitiesSlider.tsx`, `ClickableAvatar.tsx`, `StackedAvatarsPopover.tsx`, `ViewTracker.tsx`
- `src/config/routes.ts` — help route
- `src/hooks/useViewTracker.ts`
- `src/lib/data/challenges.ts` — contributor ordering
- `src/types/challenges.ts`
- `src/utils/supabaseImageLoader.ts`
