type EmailTemplateComponent = React.ComponentType<{ preview?: boolean; [key: string]: unknown }>;
type EmailModule = { default: EmailTemplateComponent };

export const emailTemplateLoaders: Record<string, () => Promise<EmailModule>> = {
  'account-deletion': () => import('@/emails/account-deletion') as unknown as Promise<EmailModule>,
  'attendee-message': () => import('@/emails/attendee-message') as unknown as Promise<EmailModule>,
  'attendee-reminder': () => import('@/emails/attendee-reminder') as unknown as Promise<EmailModule>,
  'cancel': () => import('@/emails/cancel') as unknown as Promise<EmailModule>,
  'challenge-announcement': () => import('@/emails/challenge-announcement') as unknown as Promise<EmailModule>,
  'change-email': () => import('@/emails/auth/change-email') as unknown as Promise<EmailModule>,
  'change-nickname': () => import('@/emails/auth/change-nickname') as unknown as Promise<EmailModule>,
  'comment-notification': () => import('@/emails/comment-notification') as unknown as Promise<EmailModule>,
  'confirm': () => import('@/emails/confirm') as unknown as Promise<EmailModule>,
  'contact': () => import('@/emails/contact') as unknown as Promise<EmailModule>,
  'event-announcement': () => import('@/emails/event-announcement') as unknown as Promise<EmailModule>,
  'feedback-notification': () => import('@/emails/feedback-notification') as unknown as Promise<EmailModule>,
  'member-deleted': () => import('@/emails/member-notification').then((mod) => ({
    default: (props: { preview?: boolean }) => mod.MemberNotificationEmail({ ...props, kind: 'deleted' }),
  })) as unknown as Promise<EmailModule>,
  'member-joined': () => import('@/emails/member-notification').then((mod) => ({
    default: (props: { preview?: boolean }) => mod.MemberNotificationEmail({ ...props, kind: 'joined' }),
  })) as unknown as Promise<EmailModule>,
  'member-signed-up': () => import('@/emails/member-notification').then((mod) => ({
    default: (props: { preview?: boolean }) => mod.MemberNotificationEmail({ ...props, kind: 'signed_up' }),
  })) as unknown as Promise<EmailModule>,
  'newsletter': () => import('@/emails/newsletter') as unknown as Promise<EmailModule>,
  'onboarding-reminder': () => import('@/emails/onboarding-reminder') as unknown as Promise<EmailModule>,
  'report-notification': () => import('@/emails/report-notification') as unknown as Promise<EmailModule>,
  'report-resolved': () => import('@/emails/report-resolved') as unknown as Promise<EmailModule>,
  'reset-password': () => import('@/emails/auth/reset-password') as unknown as Promise<EmailModule>,
  'rsvp-reminder': () => import('@/emails/rsvp-reminder') as unknown as Promise<EmailModule>,
  'signup': () => import('@/emails/signup') as unknown as Promise<EmailModule>,
  'submission-notification': () => import('@/emails/submission-notification') as unknown as Promise<EmailModule>,
  'submission-result': () => import('@/emails/submission-result') as unknown as Promise<EmailModule>,
  'verify-email': () => import('@/emails/auth/verify-email') as unknown as Promise<EmailModule>,
  'weekly-digest': () => import('@/emails/weekly-digest') as unknown as Promise<EmailModule>,
  'welcome': () => import('@/emails/auth/welcome') as unknown as Promise<EmailModule>,
};

export const emailTemplateSlugs = Object.keys(emailTemplateLoaders).sort();

export function isEmailPreviewDev(): boolean {
  return process.env.NODE_ENV === 'development';
}
