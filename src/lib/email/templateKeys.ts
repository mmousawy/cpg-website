export const EMAIL_TEMPLATE_KEYS = {
  commentNotification: 'comment_notification',
  submissionNotification: 'submission_notification',
  memberNotification: 'member_notification',
  reportNotification: 'report_notification',
  feedbackNotification: 'feedback_notification',
  submissionResult: 'submission_result',
  reportResolved: 'report_resolved',
} as const;

export type EmailTemplateKey =
  (typeof EMAIL_TEMPLATE_KEYS)[keyof typeof EMAIL_TEMPLATE_KEYS];
