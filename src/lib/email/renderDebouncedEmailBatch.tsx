import { render } from '@react-email/render';
import { Section } from '@react-email/components';

import { CommentNotificationEmail, getCommentNotificationSubject } from '@/emails/comment-notification';
import { FeedbackNotificationEmail } from '@/emails/feedback-notification';
import EmailButton from '@/emails/components/EmailButton';
import EmailHeading from '@/emails/components/EmailHeading';
import EmailLayout from '@/emails/components/EmailLayout';
import EmailText from '@/emails/components/EmailText';
import { emailCalloutStyle } from '@/emails/components/styles';
import { MemberNotificationEmail } from '@/emails/member-notification';
import { ReportNotificationEmail } from '@/emails/report-notification';
import { ReportResolvedEmail } from '@/emails/report-resolved';
import { SubmissionNotificationEmail } from '@/emails/submission-notification';
import { SubmissionResultEmail } from '@/emails/submission-result';
import { getEmailSiteUrl, toAbsoluteEmailUrl } from '@/emails/utils/siteUrl';
import type {
  QueuedFeedbackNotificationItem,
  QueuedMemberNotificationItem,
  QueuedReportNotificationItem,
  QueuedReportResolvedItem,
  QueuedSubmissionNotificationItem,
  QueuedSubmissionResultItem,
} from '@/lib/email/debouncedEmailItems';
import { EMAIL_TEMPLATE_KEYS, type EmailTemplateKey } from '@/lib/email/templateKeys';
import type { QueuedCommentEmailItem } from '@/lib/notifications/emailQueue';

export type DebouncedEmailRenderContext = {
  recipientEmail: string;
  recipientName: string;
  emailType: string;
  optOutLink?: string;
};

export type DebouncedEmailRenderResult = {
  subject: string;
  html: string;
  listUnsubscribe?: string;
};

function parseItems<T>(items: unknown[]): T[] {
  return items as T[];
}

function multiSectionHeading(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : `${count} ${plural}`;
}

export async function renderDebouncedEmailBatch(
  templateKey: EmailTemplateKey,
  items: unknown[],
  context: DebouncedEmailRenderContext,
): Promise<DebouncedEmailRenderResult | null> {
  if (items.length === 0) {
    return null;
  }

  switch (templateKey) {
    case EMAIL_TEMPLATE_KEYS.commentNotification: {
      const commentItems = parseItems<QueuedCommentEmailItem>(items).map((item) => ({
        ...item,
        entityLink: toAbsoluteEmailUrl(item.entityLink),
        commenterProfileLink: item.commenterProfileLink
          ? toAbsoluteEmailUrl(item.commenterProfileLink)
          : null,
      }));
      return {
        subject: getCommentNotificationSubject(commentItems),
        html: await render(
          CommentNotificationEmail({
            ownerName: context.recipientName,
            recipientEmail: context.recipientEmail,
            items: commentItems,
            optOutLink: context.optOutLink,
          }),
        ),
        listUnsubscribe: context.optOutLink,
      };
    }

    case EMAIL_TEMPLATE_KEYS.submissionNotification: {
      const parsed = parseItems<QueuedSubmissionNotificationItem>(items);
      if (parsed.length === 1) {
        const item = parsed[0];
        return {
          subject: `New submission: ${item.submitterName} submitted to "${item.challengeTitle}"`,
          html: await render(
            SubmissionNotificationEmail({
              adminName: context.recipientName,
              recipientEmail: context.recipientEmail,
              ...item,
            }),
          ),
        };
      }
      const challengeTitle = parsed[0]?.challengeTitle ?? 'a challenge';
      const reviewLink = parsed[0]?.reviewLink ?? '';
      return {
        subject: multiSectionHeading(
          parsed.length,
          `New submission to "${challengeTitle}"`,
          `new submissions to "${challengeTitle}"`,
        ),
        html: await render(
          <EmailLayout
            previewText={`${parsed.length} new challenge submissions`}
          >
            <EmailHeading>New challenge submissions</EmailHeading>
            <EmailText>
              {multiSectionHeading(parsed.length, 'A member submitted photos', 'members submitted photos')}
              {' '}
              to &quot;{challengeTitle}&quot;.
            </EmailText>
            {parsed.map((item, index) => (
              <Section
                key={index}
                style={emailCalloutStyle}
              >
                <EmailText>
                  <strong>{item.submitterName}</strong>
                  {' '}
                  submitted {item.photoCount} photo{item.photoCount === 1 ? '' : 's'}.
                </EmailText>
              </Section>
            ))}
            {reviewLink ? <EmailButton
              href={reviewLink}
            >Review submissions</EmailButton> : null}
          </EmailLayout>,
        ),
      };
    }

    case EMAIL_TEMPLATE_KEYS.memberNotification: {
      const parsed = parseItems<QueuedMemberNotificationItem>(items);
      if (parsed.length === 1) {
        const item = parsed[0];
        const subject = item.kind === 'deleted'
          ? item.initiatedByAdmin
            ? `Account deletion scheduled: ${item.memberName}`
            : `${item.memberName} scheduled their account for deletion`
          : item.kind === 'signed_up'
            ? `New signup: ${item.memberName}`
            : `New member: ${item.memberName}`;
        return {
          subject,
          html: await render(
            MemberNotificationEmail({
              kind: item.kind,
              adminName: context.recipientName,
              recipientEmail: context.recipientEmail,
              memberName: item.memberName,
              memberNickname: item.memberNickname,
              memberEmail: item.memberEmail,
              profileLink: item.profileLink,
              membersLink: item.membersLink,
              deletionDate: item.deletionDate,
              initiatedByAdmin: item.initiatedByAdmin,
              initiatedByName: item.initiatedByName,
            }),
          ),
        };
      }
      const kind = parsed[0]?.kind ?? 'joined';
      const heading = kind === 'signed_up' ? 'New signups' : kind === 'deleted' ? 'Account deletions' : 'New members';
      return {
        subject: `${parsed.length} ${heading.toLowerCase()}`,
        html: await render(
          <EmailLayout
            previewText={heading}
          >
            <EmailHeading>{heading}</EmailHeading>
            {parsed.map((item, index) => (
              <Section
                key={index}
                style={emailCalloutStyle}
              >
                <EmailText>
                  <strong>{item.memberName}</strong>
                  {item.memberEmail ? ` (${item.memberEmail})` : ''}
                </EmailText>
              </Section>
            ))}
            {parsed[0]?.membersLink ? (
              <EmailButton
                href={parsed[0].membersLink}
              >View members</EmailButton>
            ) : null}
          </EmailLayout>,
        ),
      };
    }

    case EMAIL_TEMPLATE_KEYS.reportNotification: {
      const parsed = parseItems<QueuedReportNotificationItem>(items);
      if (parsed.length === 1) {
        const item = parsed[0];
        return {
          subject: `New Report: ${item.reporterName} reported ${item.entityTitle}`,
          html: await render(
            ReportNotificationEmail({
              adminName: context.recipientName,
              recipientEmail: context.recipientEmail,
              ...item,
            }),
          ),
        };
      }
      return {
        subject: `${parsed.length} new reports`,
        html: await render(
          <EmailLayout
            previewText={`${parsed.length} new reports`}
          >
            <EmailHeading>New reports</EmailHeading>
            {parsed.map((item, index) => (
              <Section
                key={index}
                style={emailCalloutStyle}
              >
                <EmailText>
                  <strong>{item.reporterName}</strong>
                  {' '}
                  reported {item.entityTitle} ({item.reason})
                </EmailText>
              </Section>
            ))}
            {parsed[0]?.reviewLink ? (
              <EmailButton
                href={parsed[0].reviewLink}
              >Review reports</EmailButton>
            ) : null}
          </EmailLayout>,
        ),
      };
    }

    case EMAIL_TEMPLATE_KEYS.feedbackNotification: {
      const parsed = parseItems<QueuedFeedbackNotificationItem>(items);
      if (parsed.length === 1) {
        const item = parsed[0];
        return {
          subject: `New Feedback: ${item.submitterName} - ${item.subjectLabel}`,
          html: await render(
            FeedbackNotificationEmail({
              adminName: context.recipientName,
              recipientEmail: context.recipientEmail,
              submitterName: item.submitterName,
              submitterEmail: item.submitterEmail,
              subject: item.subject,
              message: item.message,
              screenshots: item.screenshots,
              reviewLink: item.reviewLink,
            }),
          ),
        };
      }
      return {
        subject: `${parsed.length} new feedback messages`,
        html: await render(
          <EmailLayout
            previewText={`${parsed.length} feedback messages`}
          >
            <EmailHeading>New feedback</EmailHeading>
            {parsed.map((item, index) => (
              <Section
                key={index}
                style={emailCalloutStyle}
              >
                <EmailText>
                  <strong>{item.submitterName}</strong>
                  {' '}
                  — {item.subjectLabel}
                </EmailText>
                <EmailText>{item.message}</EmailText>
              </Section>
            ))}
            {parsed[0]?.reviewLink ? (
              <EmailButton
                href={parsed[0].reviewLink}
              >Review feedback</EmailButton>
            ) : null}
          </EmailLayout>,
        ),
      };
    }

    case EMAIL_TEMPLATE_KEYS.submissionResult: {
      const parsed = parseItems<QueuedSubmissionResultItem>(items);
      const status = parsed[0]?.status ?? 'accepted';
      const challengeTitle = parsed[0]?.challengeTitle ?? 'challenge';
      const allPhotos = parsed.flatMap((item) => item.photos);
      if (parsed.length === 1) {
        const item = parsed[0];
        const isSingle = item.photos.length === 1;
        const subject = status === 'accepted'
          ? isSingle
            ? `Your photo was accepted for "${challengeTitle}"!`
            : `${item.photos.length} photos accepted for "${challengeTitle}"!`
          : isSingle
            ? `Update on your submission to "${challengeTitle}"`
            : `Update on your submissions to "${challengeTitle}"`;
        return {
          subject,
          html: await render(
            SubmissionResultEmail({
              userName: context.recipientName,
              recipientEmail: context.recipientEmail,
              status: item.status,
              photos: item.photos,
              challengeTitle: item.challengeTitle,
              challengeLink: item.challengeLink,
              rejectionReason: item.rejectionReason,
              optOutLink: context.optOutLink,
            }),
          ),
          listUnsubscribe: context.optOutLink,
        };
      }
      const subject = status === 'accepted'
        ? `Updates on your submissions to "${challengeTitle}"`
        : `Updates on your submissions to "${challengeTitle}"`;
      return {
        subject,
        html: await render(
          SubmissionResultEmail({
            userName: context.recipientName,
            recipientEmail: context.recipientEmail,
            status,
            photos: allPhotos,
            challengeTitle,
            challengeLink: parsed[0]?.challengeLink ?? getEmailSiteUrl(),
            rejectionReason: parsed.find((i) => i.rejectionReason)?.rejectionReason,
            optOutLink: context.optOutLink,
          }),
        ),
        listUnsubscribe: context.optOutLink,
      };
    }

    case EMAIL_TEMPLATE_KEYS.reportResolved: {
      const parsed = parseItems<QueuedReportResolvedItem>(items);
      if (parsed.length === 1) {
        const item = parsed[0];
        return {
          subject: 'Your report has been resolved',
          html: await render(
            ReportResolvedEmail({
              reporterName: context.recipientName,
              recipientEmail: context.recipientEmail,
              reporterNickname: null,
              reporterAvatarUrl: null,
              ...item,
            }),
          ),
        };
      }
      return {
        subject: `${parsed.length} of your reports have been resolved`,
        html: await render(
          <EmailLayout
            previewText="Your reports have been resolved"
          >
            <EmailHeading>Reports resolved</EmailHeading>
            {parsed.map((item, index) => (
              <Section
                key={index}
                style={emailCalloutStyle}
              >
                <EmailText>
                  Your report about <strong>{item.entityTitle}</strong> was resolved (
                  {item.resolutionType}).
                </EmailText>
              </Section>
            ))}
          </EmailLayout>,
        ),
      };
    }

    default:
      return null;
  }
}
