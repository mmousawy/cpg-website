# Creative Photography Group Website

Community platform for photography enthusiasts built with Next.js and Supabase. Features event management, photo galleries, and user profiles.

## Features

### Events
- Event listings (upcoming/past)
- RSVP system with email confirmation
- Automated email reminders:
  - RSVP reminders (5 days before) for non-attendees
  - Attendee reminders (1 day before) for confirmed RSVPs
- Calendar integration (Google, Outlook, Apple/iCal)
- Attendee list with Gravatar fallback
- Attendance tracking for admins
- reCAPTCHA protection

### Photo Galleries
- User albums with drag-and-drop reordering
- Photo uploads with EXIF extraction (camera, lens, settings, GPS)
- Photo captions
- Album comments and tags
- Public/private visibility
- Full-size viewing (PhotoSwipe)
- Masonry grid layout
- Likes on photos and albums
- View tracking with "Most viewed this week" sections
- Bulk photo and album editing (multi-select, batch operations)
- Add photos to albums modal
- Challenge badges on photos (shows which challenges a photo was accepted in)
- Admin moderation (suspend/unsuspend)

### Photo Challenges
- Themed challenges with prompts created by admins
- Members submit photos (upload or from library)
- Submission limits per user (optional)
- Admin review queue (accept/reject with reasons)
- Bulk review actions
- Public gallery of accepted submissions
- Challenge comments
- Email announcements to members
- Notifications for submission results
- Profile badges for challenge participation
- "Featured in" section on photo detail pages shows accepted challenges

### User Profiles
- Public profile pages (`/@username`)
- Custom avatar uploads
- Bio, website, social links (with auto-detected icons)
- Interests (up to 10 per profile)
- Activity stats

### Authentication
- Google OAuth
- Discord OAuth
- Email/password
- Password reset

### Admin
- Event CRUD with attendance tracking
- Photo challenge management (create, edit, announce)
- Submission review queue with bulk actions
- Album moderation (suspend/unsuspend)

### Search
- Global search (Cmd/Ctrl+K)
- Search across albums, photos, members, events, and tags
- Keyboard navigation support
- Debounced queries with loading states

### Other
- Dark/light/system theme
- Responsive design with mobile menu
- Tag-based caching with `use cache`
- Loading skeletons
- Custom 404 page
- Email notifications (React Email + Resend)
- In-app notifications with real-time toast notifications (Supabase Realtime)
- Activity feed page with notification management
- Weekly notification digest emails
- Automated cron jobs (Vercel Cron)
- Changelog page with version history

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| UI Library | React 19 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Data Fetching | TanStack Query (React Query) |
| Styling | Tailwind CSS 4 |
| Email | React Email + Resend |
| Cron Jobs | Vercel Cron |
| Gallery | PhotoSwipe |
| Drag & Drop | dnd-kit |
| Toasts | Sonner |
| Analytics | Vercel Analytics |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- (Optional) Resend account, reCAPTCHA keys

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

See `.env.example` for all required variables. Key ones:

- `SUPABASE_SERVICE_ROLE_KEY` - Found in Supabase Dashboard → Project Settings → API
- `RESEND_API_KEY` - From your Resend dashboard
- `EMAIL_ASSETS_URL` - Your production URL (for email images to work)
- `ENCRYPTION_KEY` - Generate with `openssl rand -hex 32`
- `CRON_SECRET` - Secret token for cron job authentication (generate a secure random string)

### OAuth Configuration

**For Production (Supabase Dashboard):**

Configure Google and Discord credentials in Supabase Dashboard → Authentication → Providers.

**For Local Development (Supabase CLI):**

Set these environment variables before running `supabase start`:

```bash
# Google OAuth
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="your-google-client-id"
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="your-google-secret"

# Discord OAuth
export SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID="your-discord-client-id"
export SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET="your-discord-secret"
```

To get these credentials:
- **Google**: [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
- **Discord**: [Discord Developer Portal](https://discord.com/developers/applications) → New Application → OAuth2

Set the redirect URI to: `http://localhost:54321/auth/v1/callback`

### Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

```bash
npm run dev        # Dev server (Turbopack)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run lint:fix   # ESLint with auto-fix
npm run typecheck  # TypeScript type checking
npm run test:run   # Run unit tests once
npm run test:ui    # Unit tests with UI
npm run test:e2e   # Playwright E2E tests
npm run analyze    # Bundle analysis (webpack)
```

### Pre-commit Hooks

The project uses [husky](https://typicode.github.io/husky/) to run checks before each commit:

1. **Lint staged files** - ESLint runs on staged `.ts` and `.tsx` files (warnings allowed, errors block)
2. **Type check** - Full TypeScript check (`tsc --noEmit`) - warnings allowed, errors block
3. **Unit tests** - Runs all Vitest tests

Warnings are allowed, but errors will block the commit. To bypass (not recommended):

```bash
git commit --no-verify -m "message"
```

### CI Pipeline

On pull requests, GitHub Actions runs jobs in sequence:

1. **Lint & Type Check** - ESLint and TypeScript validation
2. **Unit Tests** - Vitest tests (runs after lint/typecheck)
3. **E2E Tests** - Playwright tests with production build (runs after unit tests)

## Project Structure

```
src/
├── app/                    # Pages (App Router)
│   ├── [nickname]/         # User profiles (@username)
│   ├── account/            # Account settings, user galleries
│   ├── admin/              # Admin dashboard
│   ├── api/                # API routes
│   ├── challenges/         # Photo challenges
│   ├── changelog/          # Version history pages
│   ├── events/             # Event pages
│   ├── gallery/            # Public gallery and tag pages
│   ├── members/            # Member discovery pages
│   └── ...
├── components/
│   ├── admin/              # Admin components
│   ├── album/              # Album display components
│   ├── auth/               # Auth components
│   ├── challenges/         # Challenge components
│   ├── events/             # Event components
│   ├── gallery/            # Paginated gallery views
│   ├── layout/             # Header, footer, etc.
│   ├── manage/             # Photo/album management (edit, bulk actions)
│   ├── notifications/      # In-app notifications
│   ├── onboarding/         # New user onboarding flow
│   ├── photo/              # Photo display and lightbox
│   ├── search/             # Global search modal
│   └── shared/             # Reusable UI
├── config/                 # Routes, socials
├── context/                # React context
├── emails/                 # Email templates
├── hooks/                  # Custom hooks
├── types/                  # TypeScript types
└── utils/                  # Utilities, Supabase clients

supabase/
└── migrations/             # Database migrations
```

## Database

### Tables

| Table | Description |
| --- | --- |
| `profiles` | User profiles |
| `events` | Events/meetups |
| `events_rsvps` | RSVPs and attendance |
| `albums` | Photo albums (with likes_count, view_count) |
| `album_photos` | Album-photo junction |
| `photos` | Photo metadata + EXIF (with likes_count, view_count) |
| `photo_tags` | Photo tags |
| `photo_likes` | Photo likes |
| `album_likes` | Album likes |
| `album_tags` | Album tags |
| `challenges` | Photo challenges with prompts and deadlines |
| `challenge_submissions` | User photo submissions (pending/accepted/rejected) |
| `challenge_announcements` | Challenge email announcement tracking |
| `challenge_photos` | View of accepted submissions with photo/profile data |
| `comments` | Album/photo/event/challenge comments |
| `notifications` | In-app notifications |
| `email_types` | Email preference types |
| `email_preferences` | User email opt-in/out |
| `interests` | Central interests table with usage counts |
| `profile_interests` | Profile-interests junction |
| `auth_tokens` | Email verification & password reset tokens |

### Storage Buckets

- `user-avatars` - Profile pictures
- `user-albums` - Gallery photos
- `event-covers` - Event and challenge cover images

## Generate Supabase Types

```bash
npx supabase gen types typescript --project-id "your-project-id" > ./src/database.types.ts
```

Or via SSH:

```bash
ssh user@domain "npx supabase gen types typescript --db-url 'postgresql://postgres.[tenant-id]:[password]@localhost:5432/postgres' --schema public" > ./src/database.types.ts
```

## Performance

### Bundle Optimization

Heavy dependencies are lazy-loaded to reduce initial bundle size:

| Library | Size | Loaded When |
|---------|------|-------------|
| PhotoSwipe | ~25 KiB | User clicks to view full-size image |
| @dnd-kit | ~40 KiB | User opens photo/album management |
| exifr | ~15 KiB | User uploads photos |
| Swiper | ~30 KiB | Activities slider rendered |

### Image Optimization

- Modern formats enabled (AVIF, WebP)
- Responsive `sizes` attributes on all images
- Priority loading for LCP images

### Bundle Analysis

```bash
npm run analyze
```

Opens an interactive treemap to visualize bundle composition. See [docs/performance-optimization.md](./docs/performance-optimization.md) for details.

## Deployment

Deploy to Vercel:

1. Connect repository
2. Set environment variables (including `CRON_SECRET` for reminder emails)
3. Configure Supabase OAuth redirect URLs for production
4. Set up RLS and storage policies
5. Cron jobs are automatically configured via `vercel.json` (runs daily at 8:00 AM UTC)

**Deployment Strategy:**
- Production deployments only occur from `release/*` branches
- Main branch commits and PR previews do not trigger deployments
- Release branches are automatically created when releases are published via release-please

## Roadmap

### In Progress

- [x] Event comments
- [x] Photo challenges

### Admin

- [x] Member management
- [ ] Statistics/analytics dashboard
- [x] Admin tools

### Photos

- [x] Display EXIF data to viewers
- [x] Bulk photo actions (delete, edit)
- [x] Member profile photo stream
- [x] Manual album cover selection
- [x] Tags on individual photos
- [ ] Mobile-friendly drag/drop

### Events

- [x] Email reminders before events

### Challenges

- [x] Challenge creation with cover images
- [x] Submission flow (upload or library)
- [x] Admin review queue with bulk actions
- [x] Email announcements
- [x] Submission result notifications
- [x] Profile achievement badges
- [x] Challenge badges on photos (manage grid + photo detail pages)

### Engagement

- [x] Photo/album likes
- [x] View tracking and stats
- [ ] Follow photographers
- [x] Activity feed
- [x] In-app notifications
- [ ] Community photo albums

### Discovery

- [x] Member interests in profile
- [x] Members page (only for logged-in users)
- [x] Browse by tags (`/gallery/tag/[tag]`, `/members/tag/[tag]`)
- [x] Browse by interests (`/members/interest/[interest]`)
- [x] Member discovery sections:
  - Popular interests
  - Recently active members
  - New members
  - Explore by photo style (tags with member counts)
  - Random interests with member samples
- [x] Search (albums, photos, members, events, tags)
- [x] Featured/trending galleries (Most viewed this week)

### Sharing

- [ ] Social share buttons

### Moderation

- [ ] Report content
