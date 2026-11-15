import { emailTemplateSlugs } from '@/app/email/emailTemplates';

export type EmailPreviewGroup = {
  id: string;
  label: string;
  slugs: string[];
};

export const emailPreviewGroups: EmailPreviewGroup[] = [
  {
    id: 'auth',
    label: 'Auth',
    slugs: [
      'change-email',
      'change-nickname',
      'reset-password',
      'verify-email',
      'welcome',
    ],
  },
  {
    id: 'account',
    label: 'Account & onboarding',
    slugs: [
      'account-deletion',
      'admin-suspension-deletion-scheduled',
      'inactivity-deletion-scheduled',
      'onboarding-reminder',
      'signup',
    ],
  },
  {
    id: 'events',
    label: 'Events & RSVP',
    slugs: [
      'attendee-message',
      'attendee-reminder',
      'cancel',
      'confirm',
      'event-announcement',
      'rsvp-reminder',
    ],
  },
  {
    id: 'challenges',
    label: 'Challenges & submissions',
    slugs: [
      'challenge-announcement',
      'submission-notification',
      'submission-result',
    ],
  },
  {
    id: 'social',
    label: 'Social & notifications',
    slugs: [
      'comment-notification',
      'mention-notification',
      'member-deleted',
      'member-joined',
      'member-signed-up',
      'feedback-notification',
    ],
  },
  {
    id: 'admin',
    label: 'Admin & reports',
    slugs: [
      'contact',
      'report-notification',
      'report-resolved',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    slugs: [
      'newsletter',
      'weekly-digest',
    ],
  },
];

function assertEmailPreviewGroupsComplete() {
  const assigned = new Set<string>();
  for (const group of emailPreviewGroups) {
    for (const slug of group.slugs) {
      if (assigned.has(slug)) {
        throw new Error(`Email preview slug "${slug}" appears in multiple groups`);
      }
      assigned.add(slug);
    }
  }
  const missing = emailTemplateSlugs.filter((slug) => !assigned.has(slug));
  if (missing.length > 0) {
    throw new Error(`Email preview groups missing slugs: ${missing.join(', ')}`);
  }
  const extra = [...assigned].filter((slug) => !emailTemplateSlugs.includes(slug));
  if (extra.length > 0) {
    throw new Error(`Email preview groups reference unknown slugs: ${extra.join(', ')}`);
  }
}

if (process.env.NODE_ENV === 'development') {
  assertEmailPreviewGroupsComplete();
}

export function getActiveEmailPreviewGroupId(slug: string): string | null {
  if (!slug) return null;
  for (const group of emailPreviewGroups) {
    if (group.slugs.includes(slug)) return group.id;
  }
  return null;
}
