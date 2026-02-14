# Email Notifications System

Complete guide to the email notification system, including automated reminders and manual email sending.

## Overview

The platform uses React Email templates and Resend for sending transactional and notification emails. All emails are sent via batch API to handle rate limits efficiently.

## Email Types

The system supports three email preference types:

- `events` - Event announcements and RSVP reminders
- `notifications` - Comment notifications and activity updates
- `newsletter` - Newsletter and general announcements

Users can opt out of each type individually via their account settings or unsubscribe links in emails.

## Automated Email Reminders

### RSVP Reminders (5 Days Before)

**When:** Sent automatically 5 days before an event  
**Recipients:** All users who have NOT RSVP'd and have 'events' email type opted-in  
**Email Preference:** Respects user's 'events' email preference

**Implementation:**
- Cron job runs daily at 8:00 AM UTC
- Queries events where `date = CURRENT_DATE + 5` and `rsvp_reminder_sent_at IS NULL`
- Filters users who have opted out of 'events' emails
- Excludes users who already have confirmed RSVPs
- Sends batch emails and updates `rsvp_reminder_sent_at`

**Template:** `src/emails/rsvp-reminder.tsx`

### Attendee Reminders (1 Day Before)

**When:** Sent automatically 1 day before an event  
**Recipients:** All users with confirmed RSVPs (not canceled)  
**Email Preference:** Always sent (users opted in by RSVP'ing)

**Implementation:**
- Cron job runs daily at 8:00 AM UTC
- Queries events where `date = CURRENT_DATE + 1` and `attendee_reminder_sent_at IS NULL`
- Fetches confirmed RSVPs (`confirmed_at` not null, `canceled_at` null)
- Sends batch emails and updates `attendee_reminder_sent_at`

**Template:** `src/emails/attendee-reminder.tsx`

## Manual Email Sending

### Event Announcements

Admins can send event announcements to all members or selected recipients.

**Endpoint:** `POST /api/admin/events/announce`

**Recipients:**
- All active profiles (not suspended, with email)
- Filtered by 'events' email preference
- Optional: specific email addresses

**Template:** `src/emails/event-announcement.tsx`

### Attendee Messages

Admins can send custom messages to event attendees.

**Endpoint:** `POST /api/admin/events/email-attendees`

**Recipients:**
- Confirmed RSVPs for the event
- Event admins (hosts)
- Always sent regardless of email preferences (functional emails)

**Template:** `src/emails/attendee-message.tsx`

## Transactional Emails

### RSVP Confirmation

Sent when a user confirms their RSVP.

**Template:** `src/emails/confirm.tsx`  
**Includes:** Event details, calendar links, cancellation link

### RSVP Cancellation

Sent when a user cancels their RSVP.

**Template:** `src/emails/cancel.tsx`  
**Includes:** Confirmation of cancellation, event details

### Comment Notifications

Sent when someone comments on a user's album or photo.

**Template:** `src/emails/comment-notification.tsx`  
**Email Preference:** Respects 'notifications' email type

## Email Templates

All email templates are located in `src/emails/` and use React Email components.

### Shared Components

- `components/Header.tsx` - Email header with logo
- `components/Footer.tsx` - Footer with unsubscribe links
- `components/EventDetails.tsx` - Event information display

### Template Structure

```tsx
import { RsvpReminderEmail } from "@/emails/rsvp-reminder";

// In API route
const html = await render(
  RsvpReminderEmail({
    fullName: recipient.name,
    event: eventData,
    eventLink: eventUrl,
    optOutLink: unsubscribeUrl,
  })
);
```

## Cron Job Configuration

The reminder system uses Vercel Cron for scheduled execution.

**Configuration:** `vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/event-reminders",
    "schedule": "0 8 * * *"
  }]
}
```

**Schedule:** Daily at 8:00 AM UTC

**Authentication:** Protected by `CRON_SECRET` environment variable. Vercel automatically sends this in the `Authorization` header.

**Endpoint:** `GET /api/cron/event-reminders`

## Email Preferences

### Checking Preferences

Use `hasOptedOut()` from `src/utils/emailPreferences.ts`:

```typescript
import { hasOptedOut } from '@/utils/emailPreferences';

const optedOut = await hasOptedOut(userId, 'events');
if (optedOut) {
  // Skip sending email
}
```

### Database Structure

- `email_types` - Email type definitions (events, notifications, newsletter)
- `email_preferences` - User preferences per email type
- Default behavior: Users are opted IN unless they explicitly opt out

## Batch Sending

All bulk emails use Resend's batch API to handle rate limits:

- Batch size: 100 emails per request
- Rate limit: 2 requests per second
- Delay between batches: 500ms

**Example:**

```typescript
const batchEmails = await Promise.all(
  recipients.map(recipient => ({
    from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
    to: recipient.email,
    subject: 'Subject',
    html: await render(EmailTemplate({ ... })),
  }))
);

const result = await resend.batch.send(batchEmails);
```

## Notification Link Patterns

### URL Strategy

The system uses different URL patterns for in-app notifications vs email links:

- **In-app notifications**: Store **relative URLs** (e.g., `/admin/reports`, `/@user/photo/abc123`)
- **Email links**: Convert to **full URLs** using `NEXT_PUBLIC_SITE_URL` (e.g., `https://creativephotography.group/admin/reports`)

This ensures in-app notifications work correctly regardless of the domain, while emails always contain clickable full URLs.

### Implementation Pattern

When creating notifications and sending emails from the same API route:

```typescript
// Define base URL from environment
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

// Relative URL for in-app notifications
const linkRelative = `/challenges/${challenge.slug}`;
// Full URL for emails
const linkFull = `${baseUrl}/challenges/${challenge.slug}`;

// In-app notification uses relative link
await createNotification({
  userId: user.id,
  type: 'challenge_announced',
  data: {
    title: challenge.title,
    link: linkRelative,  // Relative!
  },
});

// Email uses full link
const html = await render(
  ChallengeAnnouncementEmail({
    challengeLink: linkFull,  // Full URL!
  })
);
```

### Email Templates with Relative URL Support

Email templates should handle both relative and full URLs by converting relative URLs to full URLs:

```typescript
// In email template
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

// Convert relative to full if needed
const fullLink = link.startsWith('/') ? `${baseUrl}${link}` : link;
```

This pattern is used in `src/emails/comment-notification.tsx` and other templates.

### Common Link Patterns

| Entity Type | Relative Link Pattern | Example |
|-------------|----------------------|---------|
| User Profile | `/@{nickname}` | `/@johndoe` |
| Photo | `/@{nickname}/photo/{short_id}` | `/@johndoe/photo/abc123` |
| Album | `/@{nickname}/album/{slug}` | `/@johndoe/album/nature` |
| Photo in Album | `/@{nickname}/album/{slug}/photo/{short_id}` | `/@johndoe/album/nature/photo/abc123` |
| Event | `/events/{slug}` | `/events/photo-walk` |
| Challenge | `/challenges/{slug}` | `/challenges/february-2026` |
| Admin Reports | `/admin/reports` | `/admin/reports` |
| Admin Submissions | `/admin/challenges/{slug}/submissions` | `/admin/challenges/february-2026/submissions` |

### Files Using This Pattern

| File | Notification Type |
|------|-------------------|
| `src/app/api/comments/route.ts` | Comment notifications |
| `src/app/api/challenges/notify-submission/route.ts` | New submission (admin) |
| `src/app/api/challenges/notify-result/route.ts` | Submission accepted/rejected |
| `src/app/api/reports/notify/route.ts` | New report (admin) |
| `src/app/api/reports/resolved/notify/route.ts` | Report resolved |
| `src/app/api/admin/events/announce/route.ts` | Event announcements |
| `src/app/api/admin/challenges/announce/route.ts` | Challenge announcements |
| `src/app/api/likes/route.ts` | Like notifications |

## Environment Variables

Required email-related environment variables:

- `RESEND_API_KEY` - Resend API key
- `EMAIL_FROM_NAME` - Sender display name
- `EMAIL_FROM_ADDRESS` - Sender email address
- `EMAIL_REPLY_TO_NAME` - Reply-to display name
- `EMAIL_REPLY_TO_ADDRESS` - Reply-to email address
- `NEXT_PUBLIC_SITE_URL` - Base URL for email links
- `CRON_SECRET` - Secret token for cron authentication
- `ENCRYPT_KEY` - Encryption key for unsubscribe tokens (64 hex characters)

## Database Schema

### Events Table

Added columns for reminder tracking:

- `rsvp_reminder_sent_at` - Timestamp when RSVP reminders were sent
- `attendee_reminder_sent_at` - Timestamp when attendee reminders were sent

These columns prevent duplicate sends if the cron job runs multiple times.

## Error Handling

- Email sending failures are logged but don't fail the request
- Batch errors are tracked per recipient
- Failed batches are retried automatically by Vercel Cron if the endpoint returns an error status

## Testing

### Preview Templates

Email templates can be previewed at `/email/[template]`:

- `/email/rsvp-reminder`
- `/email/attendee-reminder`
- `/email/event-announcement`
- `/email/confirm`
- `/email/cancel`
- `/email/comment-notification`

### Manual Testing

Test the cron endpoint locally:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/event-reminders
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/cron/event-reminders/route.ts` | Cron job handler for reminders |
| `src/app/api/admin/events/announce/route.ts` | Event announcement sending |
| `src/app/api/admin/events/email-attendees/route.ts` | Attendee message sending |
| `src/emails/rsvp-reminder.tsx` | RSVP reminder template |
| `src/emails/attendee-reminder.tsx` | Attendee reminder template |
| `src/utils/emailPreferences.ts` | Email preference utilities |
| `vercel.json` | Cron job configuration |
