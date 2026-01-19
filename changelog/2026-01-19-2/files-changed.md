# Files Changed - Add Weekly Digest Email Type

## Problem

The weekly digest email was using the same `notifications` email type as instant activity notifications (comments, likes). This meant users could only opt out of both together, preventing independent control over:
- Instant notification emails (comments, likes)
- Weekly digest summary emails

## Solution

Added a new `weekly_digest` email type to allow users to independently control their preferences for weekly digest emails vs instant notification emails.

### Database Migration

Created migration to add the new email type:

```sql
INSERT INTO email_types (type_key, type_label, description)
VALUES ('weekly_digest', 'Weekly Digest', 'A weekly summary of your unseen notifications');
```

### TypeScript Types

Updated `EmailType` union to include the new type:

```typescript
export type EmailType = 'events' | 'newsletter' | 'notifications' | 'weekly_digest';
```

### Weekly Digest Cron Job

Updated the weekly digest cron job to:
- Check for `weekly_digest` email type instead of `notifications`
- Generate unsubscribe links with `emailType: 'weekly_digest'`

### Unsubscribe Page

Added label for the new email type:

```typescript
const emailTypeLabels: Record<EmailType, string> = {
  events: 'upcoming events',
  newsletter: 'the community newsletter',
  notifications: 'activity notifications',
  weekly_digest: 'the weekly digest',  // New
};
```

## Modified Files

| File | Changes |
|------|---------|
| `supabase/migrations/20260119100000_add_weekly_digest_email_type.sql` | New migration to add weekly_digest email type |
| `src/utils/emailPreferencesClient.ts` | Added `'weekly_digest'` to EmailType union |
| `src/app/api/cron/weekly-digest/route.ts` | Changed from checking `notifications` to `weekly_digest` type for preferences and unsubscribe links |
| `src/app/unsubscribe/[token]/page.tsx` | Added `weekly_digest: 'the weekly digest'` to emailTypeLabels |

## Impact

- Users can now independently opt in/out of weekly digest emails
- Weekly digest emails use their own email preference setting
- Unsubscribe links in weekly digest emails correctly unsubscribe from weekly digests only
- Onboarding and account settings pages automatically show the new email type (loaded dynamically from database)

## Email Types Summary

| Type | Purpose |
|------|---------|
| `events` | Event announcements |
| `newsletter` | Community newsletter |
| `notifications` | Instant activity notifications (comments, likes) |
| `weekly_digest` | Weekly summary of unseen notifications |
