import { Link, Section } from '@react-email/components';

import EmailButton from '../components/EmailButton';
import EmailHeading from '../components/EmailHeading';
import EmailLayout from '../components/EmailLayout';
import EmailText from '../components/EmailText';
import { emailAccentLinkStyle } from '../components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const ChangeEmailTemplate = ({
  preview,
  fullName,
  recipientEmail,
  newEmail,
  verifyLink,
}: {
  preview?: boolean;
  fullName?: string;
  recipientEmail?: string;
  newEmail: string;
  verifyLink: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';
    newEmail = 'newemail@example.com';
    verifyLink = `${baseUrl}/auth/verify-email-change?token=abc123`;
  }

  const previewText = `Confirm your email change to ${newEmail}`;
  const greeting = fullName ? `Hi ${fullName},` : 'Hi there,';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Confirm your email change
      </EmailHeading>

      <EmailText>
        {greeting}
      </EmailText>
      <br />
      <EmailText>
        Someone requested to change your account email to
        {' '}
        <strong>
          {newEmail}
        </strong>
        . If this was you, please confirm this change by clicking the button below.
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={verifyLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Confirm email change
        </EmailButton>
      </Section>

      <EmailText>
        Or copy and paste this URL into your browser:
        {' '}
        <Link
          href={verifyLink}
          style={emailAccentLinkStyle}
        >
          {verifyLink}
        </Link>
      </EmailText>

      <EmailText
        variant="muted"
        style={{ marginTop: '24px' }}
      >
        This link will expire in 24 hours. If you didn&apos;t request this change, you can safely ignore this email and your account will remain unchanged.
      </EmailText>
    </EmailLayout>
  );
};

export default ChangeEmailTemplate;
