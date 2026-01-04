# Creative Photography Group Website

Community platform for photography enthusiasts built with Next.js and Supabase. Features event management, photo galleries, and user profiles.

## Features

### Events
- Event listings (upcoming/past)
- RSVP system with email confirmation
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
- ISR caching (60s revalidation)
- Loading skeletons
- Custom 404 page
- Email notifications (React Email + Resend)

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
│   ├── galleries/          # Public galleries
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
| `album_photos` | Photos |
| `album_comments` | Comments |
| `album_tags` | Tags |
| `images` | Image metadata + EXIF |
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
2. Set environment variables
3. Configure Supabase OAuth redirect URLs for production
4. Set up RLS and storage policies

## Roadmap

### In Progress

- [ ] Event comments
- [ ] Articles/posts on user profiles

### Admin

- [ ] Member management
- [ ] Statistics/analytics dashboard
- [ ] Admin tools

### Photos

- [ ] Display EXIF data to viewers
- [ ] Photo download button
- [ ] Manual album cover selection
- [ ] Bulk photo actions (delete, edit)
- [ ] Tags on individual photos

### Events

- [ ] Waitlist when event is full
- [ ] Email reminders before events
- [ ] Recurring events

### Engagement

- [ ] Photo/album likes
- [ ] Follow photographers
- [ ] Activity feed
- [ ] In-app notifications

### Discovery

- [ ] Search (albums, photos, users, events)
- [ ] Member directory
- [ ] Featured/trending galleries

### Sharing

- [ ] Social share buttons
- [ ] Embed code for galleries

### Moderation

- [ ] Report content
- [ ] User blocking
- [ ] Email notification on album suspension/deletion
