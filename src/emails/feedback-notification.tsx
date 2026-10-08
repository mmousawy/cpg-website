import { Link, Section, Text } from '@react-email/components';

import { FEEDBACK_SUBJECTS } from '@/types/feedback';

import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import {
  emailAccentLinkStyle,
  emailCalloutLabelStyle,
  emailCalloutPlainStyle,
  emailCalloutStyle,
  emailCalloutTitleStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from './components/styles';

export const FeedbackNotificationEmail = ({
  preview,
  adminName,
  recipientEmail,
  submitterName,
  submitterEmail,
  subject,
  message,
  screenshots,
  reviewLink,
}: {
  preview?: boolean;
  adminName: string;
  recipientEmail?: string;
  submitterName: string;
  submitterEmail: string | null;
  subject: string;
  message: string;
  screenshots?: string[] | null;
  reviewLink: string;
}) => {
  const content = preview
    ? {
      adminName: 'Admin User',
      recipientEmail: 'admin@example.com',
      submitterName: 'John Smith',
      submitterEmail: 'john@example.com' as string | null,
      subject: 'general',
      message:
          'I really love the new gallery feature! It would be great if you could add dark mode support as well.',
      reviewLink: 'https://example.com/admin/feedback',
    }
    : {
      adminName,
      recipientEmail,
      submitterName,
      submitterEmail,
      subject,
      message,
      reviewLink,
    };

  const subjectLabel =
    FEEDBACK_SUBJECTS.find((s) => s.value === content.subject)?.label ?? content.subject;
  const previewText = `New feedback from ${content.submitterName}: ${subjectLabel}`;

  return (
    <EmailLayout
      previewText={previewText}
      fullName={content.adminName}
      recipientEmail={content.recipientEmail}
    >
      <EmailHeading>
        New feedback received
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {content.adminName}
        ,
      </EmailText>
      <br />
      <EmailText>
        New feedback has been submitted and is waiting for review.
      </EmailText>

      <Section
        style={emailCalloutStyle}
      >
        <Text
          style={emailCalloutLabelStyle}
        >
          From
        </Text>
        <Text
          style={emailCalloutTitleStyle}
        >
          {content.submitterName}
        </Text>
        {content.submitterEmail && (
          <Text
            style={{ ...emailMutedTextStyle, lineHeight: '16px' }}
          >
            {content.submitterEmail}
          </Text>
        )}
      </Section>

      <Section
        style={emailCalloutPlainStyle}
      >
        <Text
          style={emailCalloutLabelStyle}
        >
          Subject
        </Text>
        <Text
          style={{ ...emailCalloutTitleStyle, marginBottom: '16px' }}
        >
          {subjectLabel}
        </Text>
        <Text
          style={emailCalloutLabelStyle}
        >
          Message
        </Text>
        <Text
          style={{ ...emailTextStyle, lineHeight: '20px', whiteSpace: 'pre-wrap' }}
        >
          {content.message}
        </Text>
        {screenshots && screenshots.length > 0 && (
          <div
            style={{ marginTop: '16px' }}
          >
            <Text
              style={{ ...emailCalloutLabelStyle, marginBottom: '8px' }}
            >
              Screenshots
            </Text>
            {screenshots.map((url, i) => (
              <Link
                key={url}
                href={url}
                style={{ ...emailAccentLinkStyle, fontSize: '12px', display: 'block', marginBottom: '4px' }}
              >
                Screenshot
                {' '}
                {i + 1}
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={content.reviewLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Review feedback
        </EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default FeedbackNotificationEmail;
