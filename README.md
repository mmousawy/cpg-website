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
- Admin moderation (suspend/unsuspend)

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
- Event CRUD
- Attendance tracking
- Album moderation

### Other
- Dark/light/system theme
- Responsive design with mobile menu
- Tag-based caching with `use cache`
- Loading skeletons
- Custom 404 page
- Email notifications (React Email + Resend)
- Automated cron jobs (Vercel Cron)

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Styling | Tailwind CSS 4 |
| Email | React Email + Resend |
| Cron Jobs | Vercel Cron |
| Gallery | PhotoSwipe |
| Drag & Drop | dnd-kit |
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
npm run dev      # Dev server (Turbopack)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## Project Structure

```
src/
├── app/                    # Pages (App Router)
│   ├── [nickname]/         # User profiles (@username)
│   ├── account/            # Account settings, user galleries
│   ├── admin/              # Admin dashboard
│   ├── api/                # API routes
│   ├── events/             # Event pages
│   ├── gallery/            # Public gallery and tag pages
│   ├── members/            # Member discovery pages
│   └── ...
├── components/
│   ├── admin/              # Admin components
│   ├── album/              # Gallery components
│   ├── auth/               # Auth components
│   ├── events/             # Event components
│   ├── layout/             # Header, footer, etc.
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
| `albums` | Photo albums |
| `album_photos` | Album-photo junction |
| `photos` | Photo metadata + EXIF |
| `photo_tags` | Photo tags |
| `comments` | Album/photo comments |
| `album_tags` | Album tags |
| `interests` | Central interests table with usage counts |
| `profile_interests` | Profile-interests junction |
| `auth_tokens` | Email verification & password reset tokens |

### Storage Buckets

- `user-avatars` - Profile pictures
- `user-albums` - Gallery photos
- `event-covers` - Event images

## Generate Supabase Types

```bash
npx supabase gen types typescript --project-id "your-project-id" > ./src/database.types.ts
```

Or via SSH:

```bash
ssh user@domain "npx supabase gen types typescript --db-url 'postgresql://postgres.[tenant-id]:[password]@localhost:5432/postgres' --schema public" > ./src/database.types.ts
```

## Deployment

Deploy to Vercel:

1. Connect repository
2. Set environment variables (including `CRON_SECRET` for reminder emails)
3. Configure Supabase OAuth redirect URLs for production
4. Set up RLS and storage policies
5. Cron jobs are automatically configured via `vercel.json` (runs daily at 8:00 AM UTC)

## Roadmap

### In Progress

- [x] Event comments

### Admin

- [x] Member management
- [ ] Statistics/analytics dashboard
- [ ] Admin tools

### Photos

- [x] Display EXIF data to viewers
- [x] Bulk photo actions (delete, edit)
- [x] Member profile photo stream
- [x] Manual album cover selection
- [x] Tags on individual photos
- [ ] Mobile-friendly drag/drop

### Events

- [x] Email reminders before events

### Engagement

- [ ] Photo/album likes
- [ ] Follow photographers
- [ ] Activity feed
- [ ] In-app notifications
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
- [ ] Search (albums, photos, users, events, tags)
- [ ] Featured/trending galleries

### Sharing

- [ ] Social share buttons
- [ ] Embed code for galleries

### Moderation

- [ ] Report content
