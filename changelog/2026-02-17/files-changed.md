# Files Changed - Newsletter Admin Tool and Opted-Out User Visibility

## Overview

Adds an admin tool for composing and sending newsletters to members who haven't opted out. Reuses the existing Resend + React Email infrastructure used for event and challenge announcements. Also updates all email announcement tools (event, challenge, newsletter) to show opted-out users in the recipient list with disabled checkboxes instead of hiding them entirely—admins can see who opted out while still selecting only eligible recipients.

## Newsletter Admin Tool

### Concept

Admins can write and send newsletters from the Admin Tools page. The flow mirrors event/challenge announcements: load recipients (filtered by newsletter opt-out), select who to send to, batch send via Resend. A "Send test email" button lets admins preview the email in their inbox before sending to all members.

### New Components

**NewsletterComposer** (`src/components/admin/NewsletterComposer.tsx`)

Card-style component on `/admin/tools` with:
- Subject input (required)
- Body textarea (required, line breaks preserved)
- Recipient list with select/deselect (opted-out users shown but disabled)
- "Send test email" — sends only to the admin's email with `[Test]` prefix on subject
- "Send newsletter" — batch sends to selected recipients
- Success/error feedback with per-recipient status (same pattern as event announcements)

**Newsletter Email Template** (`src/emails/newsletter.tsx`)

React Email template with:
- `subject`, `body`, `fullName`, `optOutLink` props
- Uses shared `EmailHeader` and `Footer` (emailType="newsletter")
- Body rendered with line-break preservation (`split('\n')` → `<Text>` per line)
- Preview mode for testing

### API Route

**POST /api/admin/newsletter/send** (`src/app/api/admin/newsletter/send/route.ts`)

- Admin auth required
- Body: `{ subject, body, recipientEmails?, testEmail? }`
- If `testEmail: true`: sends single email to admin's address, subject prefixed with `[Test]`
- Otherwise: fetches active profiles, filters by newsletter opt-out (email_preferences + legacy newsletter_opt_in), batch sends via Resend (100/batch, 500ms delay)
- Returns `{ sent, failed, total, sendStatus, errorDetails }` for per-recipient feedback

### Opt-Out Handling

Newsletter opt-out is checked from two sources:
1. `email_preferences` table — `opted_out: true` for newsletter type
2. `profiles.newsletter_opt_in` — legacy field; `false` means opted out

Both are respected in the API and UI.

## RecipientList Disabled State

### Before

Opted-out users were filtered out entirely—they never appeared in the recipient list.

### After

Opted-out users are visible but not selectable:
- Checkbox disabled
- Row styled with `bg-background-light/50 opacity-60`
- Status column shows "Opted out" instead of "-"
- Header: "Recipients (X of Y selected, Z opted out)" when there are opted-out users
- Select-all checkbox only toggles selectable recipients; disabled when all are opted out

### Recipient Type

```ts
type Recipient = {
  email: string;
  name: string;
  nickname: string | null;
  selected: boolean;
  disabled?: boolean;  // NEW: when true, checkbox disabled, row grayed out
  sendStatus?: 'success' | 'error' | null;
  errorMessage?: string | null;
};
```

## Email Tools Updated

| Tool | Email Type | Change |
|------|------------|--------|
| AnnounceEventModal | events | Include all users, `disabled: true` for opted-out |
| AnnounceChallengeModal | photo_challenges | Include all users, `disabled: true` for opted-out |
| NewsletterComposer | newsletter | Include all users, `disabled: true` for opted-out |

EmailAttendeesModal is unchanged—it targets event attendees (RSVPs + hosts) and the API intentionally sends regardless of opt-out (transactional event-specific messages).

## Admin Tools Page

`src/app/admin/tools/page.tsx` — NewsletterComposer added above SignupBypassGenerator.

## ProfileSection Typo Fix

`src/components/account/ProfileSection.tsx` — "andgallery" → "and gallery" in nickname help text.

## All Modified Files

**New (3):**
- `src/app/api/admin/newsletter/send/route.ts`
- `src/components/admin/NewsletterComposer.tsx`
- `src/emails/newsletter.tsx`

**Modified (6):**
- `src/app/admin/tools/page.tsx`
- `src/components/account/ProfileSection.tsx`
- `src/components/admin/AnnounceChallengeModal.tsx`
- `src/components/admin/AnnounceEventModal.tsx`
- `src/components/admin/RecipientList.tsx`
